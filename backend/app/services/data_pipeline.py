"""
Data Pipeline Service — Orchestrates: Scrape → Clean → NLP → Aggregation → Store

The central pipeline that ties all scrapers and NLP services together with signal clustering.

Pipeline stages:
  1. Collect articles from all scrapers (RSS, NewsAPI, GDELT, Gov portals, Reddit)
  2. Filter out exact signals already in DB (by content_hash)
  3. Process new signals with NLP pipeline
  4. Group signals into Issue Clusters using semantic similarity
  5. Calculate Priority Scores based on frequency, source, and sentiment
  6. Store/Update clusters in 'signal_problems' and raw articles in 'news_articles'
"""

import time
import logging
import uuid
from datetime import datetime

# Scrapers
from app.scrapers.rss_scraper import scrape_rss_feeds
from app.scrapers.news_scraper import scrape_news_apis
from app.scrapers.gov_portal_scraper import scrape_government_portals
from app.scrapers.reddit_scraper import scrape_reddit_complaints

# NLP Services
from app.services.nlp_service import run_nlp_pipeline
from app.services.fake_news_detector import detect_fake_news
from app.services.gri_service import compute_gri
from app.services.location_service import resolve_location_from_text
from app.utils import calculate_similarity, clean_text_simple

logger = logging.getLogger("jannetra.pipeline")

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Civil Infrastructure": [
        "road damage", "potholes", "cracks", "broken road", "road blockage", "encroachment", 
        "debris", "water leakage", "pipeline burst", "drainage", "sewage overflow", 
        "electricity", "power cut", "exposed wire", "transformer", "street light", 
        "garbage", "waste disposal", "public toilet", "illegal construction", 
        "building collapse", "unsafe structure", "bridge damage", "traffic signal", 
        "water logging", "flooding", "footpath"
    ],
    "Road & Traffic": [
        "traffic jam", "congestion", "illegal parking", "wrong-side", "signal violation", 
        "over-speeding", "traffic police", "road signs", "divider damage", "zebra crossing", 
        "road lighting", "intersection"
    ],
    "Accidents & Emergencies": [
        "accident", "hit and run", "pedestrian", "vehicle breakdown", "fire", 
        "industrial accident", "gas leakage", "earthquake", "storm", "landslide"
    ],
    "Crime": [
        "murder", "homicide", "assault", "armed attack", "kidnapping", "abduction", 
        "theft", "robbery", "burglary", "snatching", "vehicle theft", "fights", 
        "clashes", "riots", "public nuisance", "drunken", "domestic violence", 
        "harassment", "eve-teasing", "bullying", "threatening", "stalking", "sexual"
    ],
    "Social & Human Rights": [
        "child labor", "missing person", "homeless", "begging", "elder abuse", "trafficking"
    ],
    "Public Health & Safety": [
        "open sewage", "unhygienic", "contaminated water", "disease outbreak", 
        "illegal medical", "unsafe food", "health hazard"
    ],
    "Environmental": [
        "air pollution", "water pollution", "illegal dumping", "tree cutting", 
        "deforestation", "noise pollution", "burning waste", "industrial pollution"
    ],
    "Animal Related": [
        "injured animal", "dead animal", "stray animal", "animal cruelty", "cattle"
    ],
    "Governance & Corruption": [
        "bribery", "bribe", "negligence", "delay in service", "fake scheme", 
        "fraud", "misuse of funds", "corruption", "scam"
    ],
    "Digital/Cyber": [
        "online fraud", "scam call", "phishing", "identity theft", "fake news", "cybercrime"
    ],
    "Suspicious Activities": [
        "suspicious person", "unattended bag", "smuggling", "illegal gathering", "surveillance"
    ]
}

CATEGORY_TO_DEPARTMENT: dict[str, str] = {
    "Civil Infrastructure": "municipal",
    "Road & Traffic": "traffic",
    "Accidents & Emergencies": "emergency",
    "Crime": "police",
    "Social & Human Rights": "social",
    "Public Health & Safety": "health",
    "Environmental": "municipal",
    "Animal Related": "municipal",
    "Governance & Corruption": "police",
    "Digital/Cyber": "cyber",
    "Suspicious Activities": "police",
}


def _categorize_text(text: str) -> str:
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score
    if scores:
        return max(scores, key=scores.get)
    return "General"


def _get_existing_clusters() -> list[dict]:
    """Fetch active issues from signal_problems collection."""
    from app.database import db
    import asyncio
    try:
        # We need an event loop to run async methods from mongodb.py
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    clusters = loop.run_until_complete(db["signal_problems"].find({}).to_list())
    return clusters


def _calculate_priority(cluster: dict) -> float:
    """
    Calculate Priority Score based on Frequency, Sources, and Sentiment.
    Formula: (frequency * 3.0) + source_weight + sentiment_weight + recency_weight
    """
    frequency = cluster.get("frequency", 1)
    
    # Source weights
    sources = set([s.lower() for s in cluster.get("sources", [])])
    source_weight = 0
    if "reddit" in sources:
        source_weight += 20  # High visibility for community complaints
    if any(s in ["newsapi", "gdelt"] for s in sources):
        source_weight += 10 # Official news aggregator
    if any(s in ["rss", "government"] for s in sources):
        source_weight += 5
        
    # Sentiment/Anger weight
    anger_avg = cluster.get("anger_avg", 0.0)
    sentiment_weight = anger_avg * 3.5 # High collective anger indicates severity
    
    # Recency weight (boost for trending signals)
    recency_weight = 15 
    
    score = (frequency * 3.0) + source_weight + sentiment_weight + recency_weight
    return round(min(score, 100.0), 1)


def _store_aggregated_clusters(clusters: list[dict]):
    """Upsert clusters into the signal_problems collection."""
    if not clusters:
        return
    from app.database import db
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    for cluster in clusters:
        cluster["priority_score"] = _calculate_priority(cluster)
        
        # Mapping score to severity categories for the UI
        if cluster["priority_score"] >= 80: cluster["severity"] = "CRITICAL"
        elif cluster["priority_score"] >= 60: cluster["severity"] = "HIGH"
        elif cluster["priority_score"] >= 40: cluster["severity"] = "MEDIUM"
        else: cluster["severity"] = "LOW"
        
        # Trending score for dashboard sorting
        cluster["trending_score"] = cluster["priority_score"]
        
        # upsert=True: insert if not existing, update if existing
        loop.run_until_complete(
            db["signal_problems"].update_one(
                {"id": cluster["id"]},
                {"$set": cluster},
                upsert=True
            )
        )
    logger.info(f"✅ Stored {len(clusters)} aggregated signal clusters.")


def _get_existing_hashes() -> set:
    """Fetch existing content hashes to avoid reprocessing EXACT signals."""
    from app.database import db
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    docs = loop.run_until_complete(db["news_articles"].find({}).to_list())
    hashes = {doc["content_hash"] for doc in docs if "content_hash" in doc}
    return hashes


def _store_articles_sync(records: list[dict]) -> int:
    """Store raw article signals to MongoDB news_articles collection."""
    if not records:
        return 0
    from app.database import db
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    stored = 0
    for record in records:
        try:
            loop.run_until_complete(db["news_articles"].insert_one(record))
            stored += 1
        except Exception as e:
            logger.debug(f"[Pipeline] Skipped duplicate/error: {e}")
    logger.info(f"✅ Stored {stored} raw signals.")
    return stored


def _process_article(article: dict) -> dict:
    content = article.get("content", "")
    credibility = article.get("credibility", 0.5)
    tier = article.get("tier", "UNKNOWN")
    source_type = article.get("source_type", "NEWS")

    nlp = run_nlp_pipeline(content)
    detection = detect_fake_news(
        text=content,
        source_credibility=credibility,
        source_tier=tier,
        polarity=nlp.get("polarity", 0.0),
        subjectivity=nlp.get("subjectivity", 0.5),
    )
    gri = compute_gri(
        source_credibility=credibility,
        linguistic_manipulation_index=detection["features"]["linguistic_manipulation_index"],
        claims=nlp.get("claims", []),
        detection_label=detection["label"],
        ingested_at=article.get("published_at", datetime.utcnow()),
        source_type=source_type,
        word_count=nlp.get("word_count", 50),
    )

    category_hint = article.get("category_hint", "General")
    category = _categorize_text(content)
    if category == "General" and category_hint != "General":
        category = category_hint

    article["sentiment_label"] = nlp.get("sentiment_label", "NEUTRAL")
    article["sentiment_polarity"] = nlp.get("polarity", 0.0)
    article["anger_rating"] = nlp.get("anger_rating", 0.0)
    article["fake_news_label"] = detection.get("label", "UNCERTAIN")
    article["fake_news_confidence"] = detection.get("confidence_score", 0.0)
    article["risk_score"] = gri["gri_score"]
    article["risk_level"] = gri["risk_level"]
    article["credibility_score"] = credibility
    article["category"] = category
    article["department"] = CATEGORY_TO_DEPARTMENT.get(category, "municipal")

    return article


def run_pipeline(city: str = None) -> dict:
    """Execute the intelligent ingestion pipeline with signal aggregation."""
    start_time = time.time()
    logger.info("=" * 60)
    logger.info("[Pipeline] ▶ Starting Signal Aggregation & Scoring Pipeline...")
    logger.info("=" * 60)

    if city:
        from app.database import db
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        last_city_doc = loop.run_until_complete(db["scraper_config"].find_one({"id": "last_city"}))
        last_city = last_city_doc.get("city") if last_city_doc else None
        
        if last_city and last_city.lower() != city.lower():
            logger.info(f"[Pipeline] City changed from {last_city} to {city}. Keeping existing data.")
        
        loop.run_until_complete(
            db["scraper_config"].update_one(
                {"id": "last_city"},
                {"$set": {"city": city, "id": "last_city"}}
            )
        )
 
    all_articles: list[dict] = []

    # Stage 1: Collect from all sources
    scrapers = [
        ("Reddit", scrape_reddit_complaints),                   # Indian subreddit complaints via RSS
        ("RSS Feeds", lambda city=None: scrape_rss_feeds()),  # Verified Indian news outlets
        ("Gov Portals", scrape_government_portals),            # PIB + data.gov.in
        ("News APIs", scrape_news_apis)                       # NewsAPI + GDELT (specific governance queries)
    ]

    for name, scraper_func in scrapers:
        try:
            if name in ("News APIs", "Reddit"):
                articles = scraper_func(city=city)
            else:
                articles = scraper_func()
            
            if name == "News APIs":
                articles = articles[:15] # Limit news to reduce clutter
                
            all_articles.extend(articles)
            logger.info("[Pipeline] %s: %d raw signals", name, len(articles))
        except Exception as e:
            logger.error("[Pipeline] %s scraper failed: %s", name, e)

    if not all_articles:
        return {"status": "empty", "total_scraped": 0, "elapsed_seconds": round(time.time() - start_time, 2)}
 
    # Stage 2: Filter exact already-processed hashes and outdated signals to save NLP costs
    existing_hashes = _get_existing_hashes()
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=5)
    
    new_articles = []
    for a in all_articles:
        if a.get("content_hash") in existing_hashes:
            continue
            
        pub = a.get("published_at")
        if not pub:
            continue
            
        if pub.tzinfo:
            pub = pub.replace(tzinfo=None)
            
        if pub < cutoff:
            continue
            
        new_articles.append(a)
    
    if not new_articles:
        logger.info("[Pipeline] No brand-new fresh signals found. Skipping NLP.")
        return {"status": "no_new", "total_scraped": len(all_articles), "elapsed_seconds": round(time.time() - start_time, 2)}
 
    # Stage 3: NLP Processing of new signals
    processed_signals = []
    records_to_store = []
    now = datetime.utcnow()
 
    for article in new_articles:
        try:
            processed = _process_article(article)
            loc = resolve_location_from_text(
                title=article.get("title", ""),
                content=article.get("content", ""),
                current_location=article.get("location", "India")
            )
 
            # Prepare internal signal record
            signal_record = {
                "id": str(uuid.uuid4()),
                "title": clean_text_simple(processed["title"]),
                "content": processed["content"],
                "source_name": processed["source_name"],
                "source_url": processed.get("source_url") or processed.get("url", ""),
                "source_type": processed.get("source_type", "NEWS").lower(),
                "published_at": processed.get("published_at"),
                "created_at": processed.get("published_at") or now,
                "content_hash": processed["content_hash"],
                "anger_rating": processed.get("anger_rating", 0.0),
                "sentiment_polarity": processed.get("sentiment_polarity", 0.0),
                "category": processed.get("category", "General"),
                "department": processed.get("department", "municipal"),
                "city": loc["city"],
                "district": loc["district"],
                "state": loc["state"],
                "risk_score": processed.get("risk_score", 0.0),
                "source_domain": processed.get("source_domain", ""),
                "scraped_at": now
            }
            processed_signals.append(signal_record)
            
            # Map for news_articles storage (legacy-compatible)
            records_to_store.append({**signal_record, "created_at": now})
 
        except Exception as e:
            logger.error("[Pipeline] Processing failed for signal '%s': %s", article.get("title", "???")[:50], e)
 
    # Stage 4: Grouping into Clusters
    existing_clusters = _get_existing_clusters()
    # Build a lookup for easier matching
    clusters_dict = {c["id"]: c for c in existing_clusters}
    new_clusters_count = 0
 
    for signal in processed_signals:
        matched_id = None
        
        # Look for semantic match in existing clusters
        for cid, cluster in clusters_dict.items():
            # Match by Category AND City AND Semantic Similarity
            # We use city-level granularity for grouping regional problems
            if (signal["category"] == cluster["category"] and 
                signal.get("city") == cluster.get("city")):
                
                sim = calculate_similarity(signal["title"], cluster["title"])
                if sim > 0.65:
                    matched_id = cid
                    break
        
        if matched_id:
            cluster = clusters_dict[matched_id]
            cluster["frequency"] = cluster.get("frequency", 0) + 1
            cluster["last_updated"] = now
            # Running average of anger for sentiment weighting
            current_anger = cluster.get("anger_avg", 0.0)
            cluster["anger_avg"] = (current_anger + signal["anger_rating"]) / 2.0
            cluster["sources"] = list(set(cluster.get("sources", []) + [signal["source_name"]]))
            cluster["locations"] = list(set(cluster.get("locations", []) + [signal["city"]]))
            
            # Add to sample records (keep it small)
            if len(cluster.get("sample_records", [])) < 5:
                cluster.setdefault("sample_records", []).append({
                    "title": signal["title"],
                    "source": signal["source_name"],
                    "risk": signal["risk_score"]
                })
        else:
            # Create a brand new Issue Cluster
            new_cid = f"ISSUE-{str(uuid.uuid4())[:8].upper()}"
            new_cluster = {
                "id": new_cid,
                "title": signal["title"],
                "category": signal["category"],
                "department": signal["department"],
                "locations": [signal["city"]],
                "city": signal["city"],
                "frequency": 1,
                "priority_score": 0.0, # Calculated in storage phase
                "anger_avg": signal["anger_rating"],
                "sources": [signal["source_name"]],
                "source_url": signal.get("source_url", ""),
                "source_type": signal.get("source_type", "news"),
                "created_at": signal.get("created_at") or now,
                "sample_records": [{
                    "title": signal["title"],
                    "source": signal["source_name"],
                    "risk": signal["risk_score"]
                }],
                "last_updated": now,
                "detected_at": now,
                "status": "Pending"
            }
            clusters_dict[new_cid] = new_cluster
            new_clusters_count += 1
 
    # Stage 5: Recalculate Scores and Persist
    all_clusters = list(clusters_dict.values())
    _store_aggregated_clusters(all_clusters)
    
    # Store raw signals for detailed record-keeping
    _store_articles_sync(records_to_store)
 
    # Logging Improvements & Analytics
    elapsed = round(time.time() - start_time, 2)
    avg_freq = sum(c.get("frequency", 1) for c in all_clusters) / len(all_clusters) if all_clusters else 0
    highest_p = max(all_clusters, key=lambda x: x.get("priority_score", 0)) if all_clusters else None
 
    logger.info("=" * 60)
    logger.info("[Pipeline] ✅ Processing Complete!")
    logger.info(f"[Pipeline]    Scraped:          {len(all_articles)}")
    logger.info(f"[Pipeline]    Active Clusters:  {len(all_clusters)} ({new_clusters_count} new)")
    logger.info(f"[Pipeline]    Avg Frequency:    {avg_freq:.1f}")
    if highest_p:
        logger.info(f"[Pipeline]    Top Issue:        '{highest_p.get('title', '???')[:50]}' (Score: {highest_p.get('priority_score', 0)})")
    logger.info(f"[Pipeline]    Elapsed:          {elapsed}s")
    logger.info("=" * 60)
 
    return {
        "status": "success",
        "total_scraped": len(all_articles),
        "total_clusters": len(all_clusters),
        "new_clusters": new_clusters_count,
        "avg_frequency": avg_freq,
        "top_issue": highest_p.get("title") if highest_p else None,
        "elapsed_seconds": elapsed
    }
