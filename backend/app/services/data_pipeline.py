"""
Data Pipeline Service — Orchestrates: Scrape → Clean → NLP → Store
═══════════════════════════════════════════════════════════════════════
The central pipeline that ties all scrapers and NLP services together.

Pipeline stages:
  1. Collect articles from all scrapers (RSS, NewsAPI, GDELT, Gov portals, Reddit)
  2. Deduplicate by content_hash
  3. Categorize articles by keyword analysis
  4. Run NLP pipeline (sentiment, anger, entities, claims)
  5. Run fake news detection
  6. Compute Governance Risk Index (GRI)
  7. Store results in the news_articles table

Called by:
  • APScheduler (every 30 minutes)
  • Manual trigger via POST /api/pipeline/run
"""

import time
import logging
from datetime import datetime

from app.database import SessionLocal
from app.models import NewsArticle

# Scrapers
from app.scrapers.rss_scraper import scrape_rss_feeds
from app.scrapers.news_scraper import scrape_news_apis
from app.scrapers.gov_portal_scraper import scrape_government_portals
from app.scrapers.reddit_scraper import scrape_reddit_complaints

# NLP Services
from app.services.nlp_service import run_nlp_pipeline
from app.services.fake_news_detector import detect_fake_news
from app.services.gri_service import compute_gri

logger = logging.getLogger("jannetra.pipeline")

# ── City → (State, District, lat, lng) lookup ─────────────────────────────────
CITY_LOCATION_MAP: dict[str, dict] = {
    "Mumbai":    {"state": "Maharashtra",     "district": "Mumbai City",        "lat": 19.076,  "lng": 72.8777},
    "Delhi":     {"state": "Delhi",           "district": "Central Delhi",       "lat": 28.6139, "lng": 77.209},
    "Bangalore": {"state": "Karnataka",       "district": "Bangalore Urban",     "lat": 12.9716, "lng": 77.5946},
    "Bengaluru": {"state": "Karnataka",       "district": "Bangalore Urban",     "lat": 12.9716, "lng": 77.5946},
    "Hyderabad": {"state": "Telangana",       "district": "Hyderabad",           "lat": 17.385,  "lng": 78.4867},
    "Chennai":   {"state": "Tamil Nadu",      "district": "Chennai",             "lat": 13.0827, "lng": 80.2707},
    "Kolkata":   {"state": "West Bengal",     "district": "Kolkata",             "lat": 22.5726, "lng": 88.3639},
    "Pune":      {"state": "Maharashtra",     "district": "Pune",                "lat": 18.5204, "lng": 73.8567},
    "Jaipur":    {"state": "Rajasthan",       "district": "Jaipur",              "lat": 26.9124, "lng": 75.7873},
    "Lucknow":   {"state": "Uttar Pradesh",   "district": "Lucknow",             "lat": 26.8467, "lng": 80.9462},
    "Ahmedabad": {"state": "Gujarat",         "district": "Ahmedabad",           "lat": 23.0225, "lng": 72.5714},
    "Patna":     {"state": "Bihar",           "district": "Patna",               "lat": 25.6093, "lng": 85.1376},
    "Bhopal":    {"state": "Madhya Pradesh",  "district": "Bhopal",              "lat": 23.2599, "lng": 77.4126},
    "Chandigarh":{"state": "Punjab",          "district": "Chandigarh",          "lat": 30.7333, "lng": 76.7794},
    "Varanasi":  {"state": "Uttar Pradesh",   "district": "Varanasi",            "lat": 25.3176, "lng": 82.9739},
    "Nagpur":    {"state": "Maharashtra",     "district": "Nagpur",              "lat": 21.1458, "lng": 79.0882},
    "Indore":    {"state": "Madhya Pradesh",  "district": "Indore",              "lat": 22.7196, "lng": 75.8577},
    "Surat":     {"state": "Gujarat",         "district": "Surat",               "lat": 21.1702, "lng": 72.8311},
    "Noida":     {"state": "Uttar Pradesh",   "district": "Gautam Buddh Nagar",  "lat": 28.5355, "lng": 77.391},
    "Gurgaon":   {"state": "Haryana",         "district": "Gurugram",            "lat": 28.4595, "lng": 77.0266},
    "Ranchi":    {"state": "Jharkhand",       "district": "Ranchi",              "lat": 23.3441, "lng": 85.3096},
    "Kochi":     {"state": "Kerala",          "district": "Ernakulam",           "lat": 9.9312,  "lng": 76.2673},
    "Prayagraj": {"state": "Uttar Pradesh",   "district": "Prayagraj",           "lat": 25.4358, "lng": 81.8463},
    "Allahabad": {"state": "Uttar Pradesh",   "district": "Prayagraj",           "lat": 25.4358, "lng": 81.8463},
    "Kanpur":    {"state": "Uttar Pradesh",   "district": "Kanpur Nagar",        "lat": 26.4499, "lng": 80.3319},
    "Agra":      {"state": "Uttar Pradesh",   "district": "Agra",                "lat": 27.1767, "lng": 78.0081},
    "Ghaziabad": {"state": "Uttar Pradesh",   "district": "Ghaziabad",           "lat": 28.6692, "lng": 77.4538},
    "Mysuru":    {"state": "Karnataka",       "district": "Mysuru",              "lat": 12.2958, "lng": 76.6394},
    "Amritsar":  {"state": "Punjab",          "district": "Amritsar",            "lat": 31.634,  "lng": 74.8723},
    "Ludhiana":  {"state": "Punjab",          "district": "Ludhiana",            "lat": 30.9009, "lng": 75.8573},
    "Coimbatore":{"state": "Tamil Nadu",      "district": "Coimbatore",          "lat": 11.0168, "lng": 76.9558},
    "Madurai":   {"state": "Tamil Nadu",      "district": "Madurai",             "lat": 9.9252,  "lng": 78.1198},
    "India":     {"state": None,              "district": None,                   "lat": 22.5,    "lng": 78.5},
}
# Create lowercase lookup map for robust matching
CITY_LOCATION_MAP_LOWER = {k.lower(): v for k, v in CITY_LOCATION_MAP.items()}


def _resolve_location(article: dict) -> dict:
    """
    Resolve structured location fields from a scraped article.
    Checks: article['location'] (set by scrapers) -> match to city map.
    Returns dict with state, district, city, latitude, longitude.
    """
    raw_location = article.get("location", "") or ""
    
    # Check if a city matched case-insensitively using CITY_LOCATION_MAP_LOWER
    city_candidate = raw_location.split(",")[0].strip().lower()
    
    # Default geography
    geo = {"state": None, "district": None, "lat": None, "lng": None}
    
    if city_candidate in CITY_LOCATION_MAP_LOWER:
        geo = CITY_LOCATION_MAP_LOWER[city_candidate]
    else:
        # Try full match case-insensitive
        full_candidate = raw_location.strip().lower()
        if full_candidate in CITY_LOCATION_MAP_LOWER:
            geo = CITY_LOCATION_MAP_LOWER[full_candidate]
            city_candidate = full_candidate
        else:
            city_candidate = None

    # Handle randomize point placement around the bounds to prevent marker stacking
    lat = geo["lat"]
    lng = geo["lng"]
    if lat is not None and lng is not None:
        import random
        # Base jitter +/- 0.02 degrees (roughly +/- 2km)
        lat += random.uniform(-0.02, 0.02)
        lng += random.uniform(-0.02, 0.02)

    # Note: restore original casing logic where we can
    original_city_case = None
    if city_candidate and city_candidate != "india":
        # Find original case
        for k in CITY_LOCATION_MAP.keys():
            if k.lower() == city_candidate:
                original_city_case = k
                break
        
        # Ensure fallback for Prayagraj if Allahabad matched
        if original_city_case == "Allahabad":
            original_city_case = "Prayagraj"

    return {
        "state": geo["state"],
        "district": geo["district"],
        "city": original_city_case,
        "latitude": lat,
        "longitude": lng,
    }

# ── Category detection via keywords ──────────────────────────────────
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Water": ["water", "supply", "pipeline", "tanker", "drought", "contaminated", "sewage", "groundwater", "drinking water"],
    "Infrastructure": ["road", "bridge", "building", "construction", "pothole", "highway", "metro", "railway", "smart city", "electricity"],
    "Healthcare": ["hospital", "doctor", "medicine", "health", "disease", "dengue", "vaccine", "covid", "medical", "surgeon"],
    "Education": ["school", "teacher", "student", "education", "exam", "university", "scholarship", "literacy"],
    "Law & Order": ["police", "crime", "theft", "murder", "violence", "mob", "arrest", "safety", "security", "cybercrime"],
    "Corruption": ["corrupt", "bribe", "scam", "fraud", "embezzle", "money laundering", "kickback", "black money"],
    "Environment": ["pollution", "environment", "forest", "waste", "climate", "emissions", "mining", "deforestation"],
    "Sanitation": ["sanitation", "sewer", "drain", "toilet", "clean", "garbage", "waste management"],
    "Transport": ["traffic", "transport", "bus", "metro", "railway", "airport", "commute", "congestion"],
    "Housing": ["housing", "slum", "homeless", "real estate", "rent", "eviction", "demolition"],
}


def _categorize_text(text: str) -> str:
    """Assign a governance category based on keyword analysis."""
    text_lower = text.lower()
    scores: dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score

    if scores:
        return max(scores, key=scores.get)
    return "General"


def _deduplicate(articles: list[dict], db) -> list[dict]:
    """Remove articles whose content_hash already exists in the database."""
    if not articles:
        return []

    existing_hashes = {
        row[0]
        for row in db.query(NewsArticle.content_hash).all()
    }

    unique = []
    seen_hashes = set()
    for art in articles:
        h = art.get("content_hash", "")
        if h and h not in existing_hashes and h not in seen_hashes:
            unique.append(art)
            seen_hashes.add(h)

    logger.info(
        "[Pipeline] Dedup: %d input → %d unique (removed %d duplicates)",
        len(articles), len(unique), len(articles) - len(unique),
    )
    return unique


def _process_article(article: dict) -> dict:
    """
    Run the full NLP analysis pipeline on a single article.
    Returns the article dict enriched with NLP results.
    """
    content = article.get("content", "")
    credibility = article.get("credibility", 0.5)
    tier = article.get("tier", "UNKNOWN")
    source_type = article.get("source_type", "NEWS")

    # ── Stage 1: NLP (sentiment, anger, entities, claims) ────────
    nlp = run_nlp_pipeline(content)

    # ── Stage 2: Fake news detection ─────────────────────────────
    detection = detect_fake_news(
        text=content,
        source_credibility=credibility,
        source_tier=tier,
        polarity=nlp.get("polarity", 0.0),
        subjectivity=nlp.get("subjectivity", 0.5),
    )

    # ── Stage 3: GRI scoring ─────────────────────────────────────
    gri = compute_gri(
        source_credibility=credibility,
        linguistic_manipulation_index=detection["features"]["linguistic_manipulation_index"],
        claims=nlp.get("claims", []),
        detection_label=detection["label"],
        ingested_at=article.get("published_at", datetime.utcnow()),
        source_type=source_type,
        word_count=nlp.get("word_count", 50),
    )

    # ── Stage 4: Categorize ──────────────────────────────────────
    category_hint = article.get("category_hint", "General")
    category = _categorize_text(content)
    if category == "General" and category_hint != "General":
        category = category_hint

    # Enrich the article dict
    article["sentiment_label"] = nlp.get("sentiment_label", "NEUTRAL")
    article["sentiment_polarity"] = nlp.get("polarity", 0.0)
    article["anger_rating"] = nlp.get("anger_rating", 0.0)
    article["fake_news_label"] = detection.get("label", "UNCERTAIN")
    article["fake_news_confidence"] = detection.get("confidence_score", 0.0)
    article["risk_score"] = gri["gri_score"]
    article["risk_level"] = gri["risk_level"]
    article["credibility_score"] = credibility
    article["category"] = category

    return article


def run_pipeline() -> dict:
    """
    Execute the full data ingestion pipeline.

    Returns a summary dict with counts and timing.
    """
    start_time = time.time()
    logger.info("=" * 60)
    logger.info("[Pipeline] ▶ Starting data ingestion pipeline...")
    logger.info("=" * 60)

    # ── Step 1: Scrape from all sources ──────────────────────────
    all_articles: list[dict] = []

    try:
        rss_articles = scrape_rss_feeds()
        all_articles.extend(rss_articles)
        logger.info("[Pipeline] RSS feeds: %d articles", len(rss_articles))
    except Exception as e:
        logger.error("[Pipeline] RSS scraper failed: %s", e)

    try:
        news_articles = scrape_news_apis()
        all_articles.extend(news_articles)
        logger.info("[Pipeline] News APIs: %d articles", len(news_articles))
    except Exception as e:
        logger.error("[Pipeline] News API scraper failed: %s", e)

    try:
        gov_articles = scrape_government_portals()
        all_articles.extend(gov_articles)
        logger.info("[Pipeline] Gov portals: %d articles", len(gov_articles))
    except Exception as e:
        logger.error("[Pipeline] Gov portal scraper failed: %s", e)

    try:
        reddit_articles = scrape_reddit_complaints()
        all_articles.extend(reddit_articles)
        logger.info("[Pipeline] Reddit complaints: %d posts", len(reddit_articles))
    except Exception as e:
        logger.error("[Pipeline] Reddit scraper failed: %s", e)

    if not all_articles:
        elapsed = round(time.time() - start_time, 2)
        logger.warning("[Pipeline] ⚠ No articles collected from any source. Elapsed: %ss", elapsed)
        return {
            "status": "empty",
            "total_scraped": 0,
            "total_stored": 0,
            "elapsed_seconds": elapsed,
            "sources": {"rss": 0, "news_api": 0, "gov": 0, "reddit": 0},
        }

    # ── Step 2: Deduplicate ──────────────────────────────────────
    db = SessionLocal()
    try:
        unique_articles = _deduplicate(all_articles, db)

        if not unique_articles:
            elapsed = round(time.time() - start_time, 2)
            logger.info("[Pipeline] All articles are duplicates — nothing new to store. Elapsed: %ss", elapsed)
            return {
                "status": "no_new",
                "total_scraped": len(all_articles),
                "total_stored": 0,
                "elapsed_seconds": elapsed,
                "sources": {
                    "rss": len([a for a in all_articles if "RSS" not in a.get("source_name", "")]),
                    "news_api": len([a for a in all_articles if "NewsAPI" in a.get("source_name", "") or "GDELT" in a.get("source_name", "")]),
                    "gov": len([a for a in all_articles if "PIB" in a.get("source_name", "") or "data.gov" in a.get("source_name", "")]),
                },
            }

        # ── Step 3: Process through NLP pipeline ─────────────────
        processed_count = 0
        failed_count = 0
        stored_count = 0

        for article in unique_articles:
            try:
                processed = _process_article(article)

                # ── Step 4: Store in database ────────────────────
                loc = _resolve_location(article)
                news_record = NewsArticle(
                    title=processed["title"],
                    content=processed["content"],
                    source_name=processed["source_name"],
                    source_url=processed.get("source_url", ""),
                    url=processed.get("url", ""),
                    published_at=processed.get("published_at"),
                    content_hash=processed["content_hash"],
                    credibility_score=processed.get("credibility_score", 0.5),
                    risk_score=processed.get("risk_score", 0.0),
                    risk_level=processed.get("risk_level", "LOW"),
                    sentiment_label=processed.get("sentiment_label", "NEUTRAL"),
                    sentiment_polarity=processed.get("sentiment_polarity", 0.0),
                    anger_rating=processed.get("anger_rating", 0.0),
                    fake_news_label=processed.get("fake_news_label", "UNCERTAIN"),
                    fake_news_confidence=processed.get("fake_news_confidence", 0.0),
                    category=processed.get("category", "General"),
                    source_type=processed.get("source_type", "NEWS"),
                    tier=processed.get("tier", "UNKNOWN"),
                    scraped_at=datetime.utcnow(),
                    # ── Location fields ────────────────────────────
                    state=loc["state"],
                    district=loc["district"],
                    city=loc["city"],
                    latitude=loc["latitude"],
                    longitude=loc["longitude"],
                )

                db.add(news_record)
                stored_count += 1
                processed_count += 1

            except Exception as e:
                failed_count += 1
                logger.error(
                    "[Pipeline] ❌ Failed to process article '%s': %s",
                    article.get("title", "???")[:80], e,
                )

        db.commit()
        elapsed = round(time.time() - start_time, 2)

        logger.info("=" * 60)
        logger.info("[Pipeline] ✅ Pipeline complete!")
        logger.info("[Pipeline]    Total scraped:    %d", len(all_articles))
        logger.info("[Pipeline]    After dedup:      %d", len(unique_articles))
        logger.info("[Pipeline]    NLP processed:    %d", processed_count)
        logger.info("[Pipeline]    Failed:           %d", failed_count)
        logger.info("[Pipeline]    Stored in DB:     %d", stored_count)
        logger.info("[Pipeline]    Elapsed:          %ss", elapsed)
        logger.info("=" * 60)

        return {
            "status": "success",
            "total_scraped": len(all_articles),
            "after_dedup": len(unique_articles),
            "total_processed": processed_count,
            "total_stored": stored_count,
            "total_failed": failed_count,
            "elapsed_seconds": elapsed,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        db.rollback()
        logger.error("[Pipeline] ❌ Pipeline failed with DB error: %s", e)
        raise
    finally:
        db.close()
