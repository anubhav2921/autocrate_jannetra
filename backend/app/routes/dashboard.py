from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from ..mongodb import (
    news_articles_collection, articles_collection,
    alerts_collection, signal_problems_collection
)
from ..utils import get_current_user

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_dept = current_user.get("department")
    user_role = current_user.get("role")

    match_filter = {}
    if user_role != "ADMIN" and user_dept:
        match_filter["department"] = user_dept

    # Ignore Deleted items
    match_filter["deleted"] = {"$ne": True}

    # Freshness cutoff (same as Signal Monitor, 5 days)
    cutoff = datetime.utcnow() - timedelta(days=5)
    fresh_match = {**match_filter, "created_at": {"$gte": cutoff}}

    # Base counts from news_articles (signals) — ALWAYS show global total as requested
    na_total = await news_articles_collection.count_documents({"deleted": {"$ne": True}})
    
    # Base counts from signal_problems (clusters/active issues)
    # Signal Monitor shows 68, let's correspond to that.
    sp_total = await signal_problems_collection.count_documents(fresh_match)
    
    # If no data found at all, check if any legacy articles exist
    if na_total == 0:
        na_total = await articles_collection.count_documents({})

    # Overall Metrics
    avg_risk = 0
    avg_anger = 0
    if na_total > 0:
        avg_res = await news_articles_collection.aggregate([
            {"$match": match_filter},
            {"$group": {"_id": None, "avg_risk": {"$avg": "$risk_score"}, "avg_anger": {"$avg": "$anger_rating"}}}
        ]).to_list(1)
        if avg_res:
            avg_risk = avg_res[0]["avg_risk"] or 0
            avg_anger = avg_res[0]["avg_anger"] or 0
    
    # Fake news calculation
    fake_count = await news_articles_collection.count_documents({**match_filter, "fake_news_label": "FAKE"})
    fake_pct = round((fake_count / max(na_total, 1)) * 100, 1)

    # Active alerts (High/Moderate risk signals within current window)
    active_alerts = await news_articles_collection.count_documents({**fresh_match, "risk_level": {"$in": ["HIGH", "MODERATE"]}})

    # Citizen Reports
    citizen_reports_count = await signal_problems_collection.count_documents({**match_filter, "category": "Citizen Report"})

    # Sentiment distribution
    sent_res = await news_articles_collection.aggregate([
        {"$match": match_filter},
        {"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}}
    ]).to_list(None)
    sentiment_dist = {r["_id"]: r["count"] for r in sent_res if r["_id"]}

    # Category risk breakdown
    cat_res = await news_articles_collection.aggregate([
        {"$match": match_filter},
        {"$group": {"_id": "$category", "avg_gri": {"$avg": "$risk_score"}, "count": {"$sum": 1}}},
        {"$sort": {"avg_gri": -1}},
    ]).to_list(None)

    # Location breakdown
    loc_res = await news_articles_collection.aggregate([
        {"$match": match_filter},
        {"$group": {"_id": "$state", "avg_gri": {"$avg": "$risk_score"}, "count": {"$sum": 1}}},
        {"$sort": {"avg_gri": -1}},
        {"$limit": 12}
    ]).to_list(None)

    # Top Risks (from signal problems to match Signal Monitor contents)
    top_issues = await signal_problems_collection.find(fresh_match).sort("priority_score", -1).limit(10).to_list(10)

    return {
        "overall_gri": round(avg_risk, 1),
        "total_articles": na_total, # Signal counts
        "active_problems_count": sp_total, # Problem clusters count
        "fake_news_percentage": fake_pct,
        "citizen_reports_count": citizen_reports_count,
        "active_alerts": active_alerts,
        "sentiment_distribution": sentiment_dist,
        "category_risk": [
            {"category": r["_id"] or "General", "avg_gri": round(r["avg_gri"] or 0, 1), "count": r["count"]}
            for r in cat_res
        ],
        "location_risk": [
            {"location": r["_id"] or "Unknown", "avg_gri": round(r["avg_gri"] or 0, 1), "count": r["count"]}
            for r in loc_res if r["_id"]
        ],
        "top_risks": [
            {
                "id": a["id"],
                "title": a.get("title"),
                "category": a.get("category"),
                "location": a.get("location") or ", ".join(a.get("locations", [])) or a.get("city") or "India",
                "gri_score": round(a.get("priority_score") or a.get("risk_score") or 0, 1),
                "risk_level": a.get("severity", "LOW"),
                "label": "VERIFIED" if a.get("frequency", 1) > 2 else "SINGLE_SIGNAL",
                "anger_rating": round(a.get("anger_avg") or 0, 1),
            }
            for a in top_issues
        ],
        "critical_alerts": [],
    }
