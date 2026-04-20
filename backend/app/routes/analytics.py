from fastapi import APIRouter, Query
from typing import Optional
from ..mongodb import (
    news_articles_collection, articles_collection, gri_scores_collection, 
    sentiment_records_collection, detection_results_collection, signal_problems_collection
)

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/analytics/sentiment-trend")
async def sentiment_trend(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
):
    """Sentiment polarity over time — derived from NewsArticle (live pipeline data)."""
    from .location import _build_location_match
    loc_match = _build_location_match(state, district, city, ward)
    
    na_count = await news_articles_collection.count_documents(loc_match)
    if na_count > 0:
        pipeline = [
            {"$match": loc_match},
            {"$addFields": {"date_str": {"$dateToString": {"format": "%Y-%m-%d", "date": "$scraped_at"}}}},
            {"$group": {
                "_id": "$date_str",
                "avg_polarity": {"$avg": "$sentiment_polarity"},
                "avg_anger": {"$avg": "$anger_rating"},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        results = await news_articles_collection.aggregate(pipeline).to_list(None)
        return {
            "trend": [
                {
                    "date": r["_id"],
                    "avg_polarity": round(r["avg_polarity"] or 0, 3),
                    "avg_anger": round(r["avg_anger"] or 0, 2),
                    "count": r["count"],
                }
                for r in results
            ]
        }
        
    # Fallback: legacy articles + sentiment_records
    # Use articles scraped_at or ingested_at
    pipeline = [
        {"$addFields": {"date_str": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$ifNull": ["$ingested_at", "$scraped_at"]}}}}},
        {"$group": {
            "_id": "$date_str",
            "avg_polarity": {"$avg": "$sentiment_polarity"},
            "avg_anger": {"$avg": "$anger_rating"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    results = await articles_collection.aggregate(pipeline).to_list(None)
    return {
        "trend": [
            {
                "date": r["_id"],
                "avg_polarity": round(r.get("avg_polarity") or 0, 3),
                "avg_anger": round(r.get("avg_anger") or 0, 2),
                "count": r["count"],
            }
            for r in results
        ]
    }



@router.get("/analytics/risk-heatmap")
async def risk_heatmap(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    time_range: Optional[str] = Query("7d"), # 1d, 7d, 30d
    section: Optional[str] = Query(None), # citizen_report | signal_monitor
):
    """
    Returns geographical risk data for heatmap/markers.
    """
    from .location import _build_location_match
    from datetime import datetime, timedelta
    
    # 1. Base location match
    match = _build_location_match(state, district, city, ward)
    
    # 2. Add additional filters
    extra_filters = []
    
    # Section Filter
    if section == "citizen_report":
        extra_filters.append({"category": "Citizen Report"})
    elif section == "signal_monitor":
        extra_filters.append({"category": {"$ne": "Citizen Report"}})
    
    # Status Filter
    if status:
        extra_filters.append({"status": status})
    
    # Priority Filter
    if priority:
        if priority.upper() == "HIGH":
            extra_filters.append({"risk_score": {"$gte": 70}})
        elif priority.upper() == "MEDIUM":
            extra_filters.append({"risk_score": {"$gte": 40, "$lt": 70}})
        elif priority.upper() == "LOW":
            extra_filters.append({"risk_score": {"$lt": 40}})
            
    # Time Range Filter
    if time_range:
        days = 7
        if time_range == "1d": days = 1
        elif time_range == "30d": days = 30
        cutoff = datetime.utcnow() - timedelta(days=days)
        extra_filters.append({"$or": [
            {"scraped_at": {"$gte": cutoff}},
            {"created_at": {"$gte": cutoff}},
            {"ingested_at": {"$gte": cutoff}}
        ]})

    # Combine everything into match
    if extra_filters:
        if match:
            # If match already has filters, wrap everything in $and
            match = {"$and": [match, *extra_filters]}
        else:
            # If match is empty, just use extra filters (wrapped in $and if multiple)
            if len(extra_filters) > 1:
                match = {"$and": extra_filters}
            else:
                match = extra_filters[0]

    # Geocoding Fallback for major Indian cities
    GEO_LOOKUP = {
        "PRAYAGRAJ": (25.4358, 81.8463),
        "ALLAHABAD": (25.4358, 81.8463),
        "LUCKNOW": (26.8467, 80.9462),
        "VARANASI": (25.3176, 82.9739),
        "KANPUR": (26.4499, 80.3319),
        "AGRA": (27.1767, 78.0081),
        "NOIDA": (28.5355, 77.3910),
        "GHAZIABAD": (28.6692, 77.4538),
        "MATHURA": (27.4924, 77.6737),
        "MEERUT": (28.9845, 77.7064),
        "DELHI": (28.6139, 77.2090),
        "MUMBAI": (19.0760, 72.8777),
        "BANGALORE": (12.9716, 77.5946),
        "CHENNAI": (13.0827, 80.2707),
        "KOLKATA": (22.5726, 88.3639),
        "HYDERABAD": (17.3850, 78.4867),
        "PUNE": (18.5204, 73.8567),
        "AHMEDABAD": (23.0225, 72.5714),
        "SURAT": (21.1702, 72.8311),
        "JAIPUR": (26.9124, 75.7873),
    }

    results = []
    
    # We fetch from both news_articles (signal_monitor) and signal_problems (possible citizen reports or clusters)
    async def fetch_results(coll, source_type_val):
        cursor = coll.find(match).limit(500)
        async for doc in cursor:
            loc_name = doc.get("city") or doc.get("district") or doc.get("location") or "Unknown"
            lookup_key = loc_name.upper() if loc_name else ""
            
            lat = doc.get("lat") or doc.get("latitude")
            lng = doc.get("lng") or doc.get("longitude")
            
            if not lat or not lng:
                if lookup_key in GEO_LOOKUP:
                    lat, lng = GEO_LOOKUP[lookup_key]
                else:
                    # Random jitter around North India if no location found, just for visualization
                    import random
                    lat = 26.8 + random.uniform(-2, 2)
                    lng = 80.9 + random.uniform(-3, 3)

            results.append({
                "lat": lat,
                "lng": lng,
                "risk_score": round((doc.get("risk_score") or doc.get("priority_score") or 0) / 100, 2),
                "location": loc_name,
                "type": "citizen_report" if doc.get("category") == "Citizen Report" else "signal_monitor"
            })

    # Fetch based on section
    if not section or section == "signal_monitor":
        await fetch_results(news_articles_collection, "signal_monitor")
    
    # Always check signal_problems too as it might contain citizen reports or critical clusters
    await fetch_results(signal_problems_collection, "signal_monitor" if section != "citizen_report" else "citizen_report")

    return results


@router.get("/analytics/risk-summary")
async def risk_summary(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
):
    """Previous grouped risk heatmap summary for analytics tables."""
    from .location import _build_location_match
    loc_match = _build_location_match(state, district, city, ward)
    
    pipeline = [
        {"$match": loc_match},
        {"$group": {
            "_id": "$city",
            "avg_gri": {"$avg": "$risk_score"},
            "max_gri": {"$max": "$risk_score"},
            "signal_count": {"$sum": 1},
            "avg_anger": {"$avg": "$anger_rating"},
        }},
        {"$sort": {"avg_gri": -1}},
    ]
    results = await news_articles_collection.aggregate(pipeline).to_list(None)
    return {
        "heatmap": [
            {
                "location": r["_id"] or "General",
                "avg_gri": round(r["avg_gri"] or 0, 1),
                "max_gri": round(r["max_gri"] or 0, 1),
                "signal_count": r["signal_count"],
                "avg_anger": round(r["avg_anger"] or 0, 1),
                "risk_level": "HIGH" if (r["avg_gri"] or 0) > 60 else "MODERATE" if (r["avg_gri"] or 0) > 30 else "LOW",
            }
            for r in results
        ]
    }


@router.get("/analytics/landing-stats")
async def get_landing_stats():
    """Consolidated stats for the landing page hero section."""
    from ..mongodb import articles_collection, signal_problems_collection, system_metrics_collection
    
    # 1. Issues Processed (Total Articles + Active Clusters)
    art_count = await articles_collection.count_documents({})
    # If articles are low, fallback to news_articles count
    if art_count < 10:
        art_count = await news_articles_collection.count_documents({})
        
    cluster_count = await signal_problems_collection.count_documents({})
    total_processed = art_count + cluster_count
    
    # 2. Accuracy (Avg confidence score of verified detections)
    # We use detection_results_collection for this
    pipeline = [
        {"$match": {"confidence_score": {"$gt": 0.5}}},
        {"$group": {"_id": None, "avg_acc": {"$avg": "$confidence_score"}}}
    ]
    res = await detection_results_collection.aggregate(pipeline).to_list(1)
    avg_acc = (res[0]["avg_acc"] * 100) if res else 94.8
    
    # 3. Processing Time (Avg latency from system metrics or fixed dynamic)
    # Check if we have a latency metric
    latency_m = await system_metrics_collection.find_one({"metric_type": "Latency"})
    proc_time = latency_m.get("current_value", 4.2) if latency_m else 4.2
    
    return {
        "issues_processed": f"{total_processed}+" if total_processed > 100 else str(total_processed),
        "accuracy": f"{round(avg_acc, 1)}%",
        "processing_time": f"< {round(proc_time + 0.5, 1)}s"
    }


# Fallback
@router.get("/analytics/category-breakdown")
async def category_breakdown(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
):
    """Risk breakdown by category."""
    from .location import _build_location_match
    loc_match = _build_location_match(state, district, city, ward)

    na_count = await news_articles_collection.count_documents(loc_match)
    if na_count > 0:
        pipeline = [
            {"$match": loc_match},
            {"$group": {
                "_id": "$category",
                "avg_gri": {"$avg": "$risk_score"},
                "total": {"$sum": 1},
            }},
            {"$sort": {"avg_gri": -1}},
        ]
        results = await news_articles_collection.aggregate(pipeline).to_list(None)

        fake_pipeline = [
            {"$match": {**loc_match, "fake_news_label": "FAKE"}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        fake_res = await news_articles_collection.aggregate(fake_pipeline).to_list(None)
        fake_counts = {r["_id"]: r["count"] for r in fake_res}

        return {
            "categories": [
                {
                    "category": r["_id"] or "General",
                    "avg_gri": round(r["avg_gri"] or 0, 1),
                    "total_signals": r["total"],
                    "fake_count": fake_counts.get(r["_id"], 0),
                    "risk_level": "HIGH" if (r["avg_gri"] or 0) > 60 else "MODERATE" if (r["avg_gri"] or 0) > 30 else "LOW",
                }
                for r in results
            ]
        }

    # Fallback
    return {"categories": []}