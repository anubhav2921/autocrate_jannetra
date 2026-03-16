from fastapi import APIRouter
from datetime import datetime
from ..mongodb import (
    news_articles_collection, articles_collection,
    alerts_collection, gri_scores_collection,
    detection_results_collection, sentiment_records_collection
)

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard")
async def get_dashboard():
    na_total = await news_articles_collection.count_documents({})

    if na_total > 0:
        # Aggregate stats from news_articles
        pipeline_avg = [{"$group": {"_id": None, "avg_risk": {"$avg": "$risk_score"}, "avg_anger": {"$avg": "$anger_rating"}}}]
        avg_res = await news_articles_collection.aggregate(pipeline_avg).to_list(1)
        avg_risk = avg_res[0]["avg_risk"] if avg_res else 0
        avg_anger = avg_res[0]["avg_anger"] if avg_res else 0

        fake_count = await news_articles_collection.count_documents({"fake_news_label": "FAKE"})
        fake_pct = round((fake_count / max(na_total, 1)) * 100, 1)

        # Sentiment distribution
        sent_pipeline = [{"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}}]
        sent_res = await news_articles_collection.aggregate(sent_pipeline).to_list(None)
        sentiment_dist = {r["_id"]: r["count"] for r in sent_res if r["_id"]}

        # Category risk
        cat_pipeline = [
            {"$group": {"_id": "$category", "avg_gri": {"$avg": "$risk_score"}, "count": {"$sum": 1}}},
            {"$sort": {"avg_gri": -1}},
        ]
        cat_res = await news_articles_collection.aggregate(cat_pipeline).to_list(None)

        # Top risk articles
        top_articles = await news_articles_collection.find({}).sort("risk_score", -1).limit(10).to_list(10)

        # Active alerts
        active_alerts = await alerts_collection.count_documents({"is_active": True})
        if active_alerts == 0:
            active_alerts = await news_articles_collection.count_documents({"risk_level": {"$in": ["HIGH", "MODERATE"]}})

        return {
            "overall_gri": round(avg_risk, 1),
            "total_articles": na_total,
            "fake_news_percentage": fake_pct,
            "average_anger": round(avg_anger, 2),
            "active_alerts": active_alerts,
            "sentiment_distribution": sentiment_dist,
            "category_risk": [
                {"category": r["_id"] or "General", "avg_gri": round(r["avg_gri"] or 0, 1), "count": r["count"]}
                for r in cat_res
            ],
            "location_risk": [],
            "top_risks": [
                {
                    "id": a["id"],
                    "title": a.get("title"),
                    "category": a.get("category"),
                    "location": None,
                    "gri_score": round(a.get("risk_score") or 0, 1),
                    "risk_level": a.get("risk_level"),
                    "label": a.get("fake_news_label"),
                    "confidence": round(a.get("fake_news_confidence") or 0, 2),
                    "anger_rating": round(a.get("anger_rating") or 0, 1),
                }
                for a in top_articles
            ],
            "critical_alerts": [],
        }

    # Fallback: legacy seeded tables
    total_articles = await articles_collection.count_documents({})
    fake_count = await detection_results_collection.count_documents({"label": "FAKE"})
    fake_pct = round((fake_count / max(total_articles, 1)) * 100, 1)

    gri_agg = await gri_scores_collection.aggregate([
        {"$group": {"_id": None, "avg": {"$avg": "$gri_score"}}}
    ]).to_list(1)
    avg_gri = round(gri_agg[0]["avg"] if gri_agg else 0, 1)

    active_alerts = await alerts_collection.count_documents({"is_active": True})

    critical_alerts_cursor = alerts_collection.find(
        {"is_active": True, "severity": {"$in": ["CRITICAL", "HIGH"]}}
    ).sort("created_at", -1).limit(5)
    critical_alerts = await critical_alerts_cursor.to_list(5)

    sent_pipeline = [{"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}}]
    sent_res = await sentiment_records_collection.aggregate(sent_pipeline).to_list(None)
    sentiment_dist = {r["_id"]: r["count"] for r in sent_res}

    anger_agg = await sentiment_records_collection.aggregate([
        {"$group": {"_id": None, "avg": {"$avg": "$anger_rating"}}}
    ]).to_list(1)
    avg_anger = anger_agg[0]["avg"] if anger_agg else 0

    return {
        "overall_gri": avg_gri,
        "total_articles": total_articles,
        "fake_news_percentage": fake_pct,
        "average_anger": round(avg_anger, 1),
        "active_alerts": active_alerts,
        "sentiment_distribution": sentiment_dist,
        "critical_alerts": [
            {"id": a["id"], "severity": a.get("severity"), "department": a.get("department"),
             "recommendation": a.get("recommendation"), "urgency": a.get("urgency")}
            for a in critical_alerts
        ],
        "category_risk": [],
        "location_risk": [],
        "top_risks": [],
    }
