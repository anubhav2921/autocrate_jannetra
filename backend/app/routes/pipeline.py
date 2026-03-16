from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from ..mongodb import news_articles_collection

router = APIRouter(prefix="/api", tags=["Data Pipeline"])


@router.post("/pipeline/run")
def trigger_pipeline():
    """Manually trigger the data ingestion pipeline."""
    from ..services.data_pipeline import run_pipeline
    try:
        result = run_pipeline()
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")


@router.get("/pipeline/status")
async def pipeline_status():
    total = await news_articles_collection.count_documents({})
    latest = await news_articles_collection.find({}).sort("scraped_at", -1).limit(1).to_list(1)
    latest = latest[0] if latest else None

    source_pipeline = [
        {"$group": {"_id": "$source_name", "count": {"$sum": 1}}}
    ]
    sources = await news_articles_collection.aggregate(source_pipeline).to_list(None)

    risk_pipeline = [
        {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}}
    ]
    risk_res = await news_articles_collection.aggregate(risk_pipeline).to_list(None)
    risk_counts = {r["_id"]: r["count"] for r in risk_res}

    scraped_at = latest.get("scraped_at") if latest else None

    return {
        "total_articles": total,
        "last_scraped_at": scraped_at.isoformat() if isinstance(scraped_at, datetime) else scraped_at,
        "last_article_title": latest.get("title") if latest else None,
        "source_breakdown": {r["_id"]: r["count"] for r in sources},
        "risk_breakdown": risk_counts,
        "scheduler": "APScheduler — every 30 minutes",
    }


@router.get("/news-articles/stats")
async def news_article_stats():
    total = await news_articles_collection.count_documents({})

    agg = await news_articles_collection.aggregate([
        {"$group": {"_id": None, "avg_risk": {"$avg": "$risk_score"}, "avg_anger": {"$avg": "$anger_rating"}}}
    ]).to_list(1)
    avg_risk = agg[0]["avg_risk"] if agg else 0
    avg_anger = agg[0]["avg_anger"] if agg else 0

    fake_count = await news_articles_collection.count_documents({"fake_news_label": "FAKE"})

    cat_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}, "avg_gri": {"$avg": "$risk_score"}}},
        {"$sort": {"avg_gri": -1}},
    ]
    categories = await news_articles_collection.aggregate(cat_pipeline).to_list(None)

    sent_pipeline = [{"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}}]
    sentiments = await news_articles_collection.aggregate(sent_pipeline).to_list(None)

    return {
        "overall_gri": round(avg_risk, 1),
        "total_articles": total,
        "fake_news_percentage": round(fake_count / max(total, 1) * 100, 1),
        "average_anger": round(avg_anger, 2),
        "active_alerts": 0,
        "sentiment_distribution": {r["_id"]: r["count"] for r in sentiments},
        "category_risk": [
            {"category": r["_id"] or "General", "avg_gri": round(r["avg_gri"] or 0, 1), "count": r["count"]}
            for r in categories
        ],
        "location_risk": [],
        "top_risks": [],
        "critical_alerts": [],
        "total": total,
        "avg_risk_score": round(avg_risk, 1),
        "avg_anger_rating": round(avg_anger, 2),
        "fake_news_count": fake_count,
        "fake_news_pct": round(fake_count / max(total, 1) * 100, 1),
    }


@router.get("/news-articles")
async def list_news_articles(
    category: str = Query(None),
    risk_level: str = Query(None),
    label: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    match = {}
    if category:
        match["category"] = category
    if risk_level:
        match["risk_level"] = risk_level
    if label:
        match["fake_news_label"] = label

    total = await news_articles_collection.count_documents(match)
    cursor = news_articles_collection.find(match).sort("scraped_at", -1).skip((page - 1) * limit).limit(limit)
    results = await cursor.to_list(None)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "articles": [
            {
                "id": a["id"],
                "title": a.get("title"),
                "source_name": a.get("source_name"),
                "url": a.get("url"),
                "published_at": a["published_at"].isoformat() if isinstance(a.get("published_at"), datetime) else a.get("published_at"),
                "category": a.get("category"),
                "risk_score": a.get("risk_score"),
                "risk_level": a.get("risk_level"),
                "sentiment": a.get("sentiment_label"),
                "anger_rating": a.get("anger_rating"),
                "fake_label": a.get("fake_news_label"),
                "fake_confidence": a.get("fake_news_confidence"),
                "credibility": a.get("credibility_score"),
                "scraped_at": a["scraped_at"].isoformat() if isinstance(a.get("scraped_at"), datetime) else a.get("scraped_at"),
            }
            for a in results
        ],
    }


@router.get("/news-articles/{article_id}")
async def get_news_article(article_id: str):
    a = await news_articles_collection.find_one({"id": article_id})
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")

    return {
        "id": a["id"],
        "title": a.get("title"),
        "content": a.get("content"),
        "source_name": a.get("source_name"),
        "source_url": a.get("source_url"),
        "url": a.get("url"),
        "published_at": a["published_at"].isoformat() if isinstance(a.get("published_at"), datetime) else a.get("published_at"),
        "category": a.get("category"),
        "source_type": a.get("source_type"),
        "tier": a.get("tier"),
        "analysis": {
            "risk_score": a.get("risk_score"),
            "risk_level": a.get("risk_level"),
            "credibility_score": a.get("credibility_score"),
            "sentiment_label": a.get("sentiment_label"),
            "sentiment_polarity": a.get("sentiment_polarity"),
            "anger_rating": a.get("anger_rating"),
            "fake_news_label": a.get("fake_news_label"),
            "fake_news_confidence": a.get("fake_news_confidence"),
        },
        "scraped_at": a["scraped_at"].isoformat() if isinstance(a.get("scraped_at"), datetime) else a.get("scraped_at"),
        "created_at": a["created_at"].isoformat() if isinstance(a.get("created_at"), datetime) else a.get("created_at"),
    }
