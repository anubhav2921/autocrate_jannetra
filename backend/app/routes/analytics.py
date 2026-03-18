from fastapi import APIRouter, Query
from typing import Optional
from ..mongodb import news_articles_collection, articles_collection, gri_scores_collection, sentiment_records_collection, detection_results_collection

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
):
    """Governance Risk Index heatmap by category."""
    from .location import _build_location_match
    loc_match = _build_location_match(state, district, city, ward)

    na_count = await news_articles_collection.count_documents(loc_match)
    if na_count > 0:
        pipeline = [
            {"$match": loc_match},
            {"$group": {
                "_id": "$category",
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

    # Fallback: legacy tables
    pipeline = [
        {"$group": {"_id": "$location", "avg_gri": {"$avg": "$gri_score"}, "max_gri": {"$max": "$gri_score"}, "signal_count": {"$sum": 1}}}
    ]
    results = await gri_scores_collection.aggregate(pipeline).to_list(None)
    return {
        "heatmap": [
            {
                "location": r["_id"],
                "avg_gri": round(r["avg_gri"] or 0, 1),
                "max_gri": round(r["max_gri"] or 0, 1),
                "signal_count": r["signal_count"],
                "avg_anger": 0,
                "risk_level": "HIGH" if (r["avg_gri"] or 0) > 60 else "MODERATE" if (r["avg_gri"] or 0) > 30 else "LOW",
            }
            for r in results
        ]
    }


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