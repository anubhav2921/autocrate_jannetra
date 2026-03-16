from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from ..mongodb import news_articles_collection

router = APIRouter(prefix="/api", tags=["Articles"])


@router.get("/articles")
async def list_articles(
    category: str | None = Query(None),
    label: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    match = {}
    if category:
        match["category"] = category
    if label:
        match["fake_news_label"] = label

    total = await news_articles_collection.count_documents(match)
    cursor = news_articles_collection.find(match).sort("risk_score", -1).skip((page - 1) * limit).limit(limit)
    articles = await cursor.to_list(None)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "articles": [
            {
                "id": a["id"],
                "title": a.get("title"),
                "category": a.get("category"),
                "source": a.get("source_name"),
                "url": a.get("url") or a.get("source_url"),
                "risk_score": a.get("risk_score"),
                "risk_level": a.get("risk_level"),
                "sentiment": a.get("sentiment_label"),
            }
            for a in articles
        ],
    }


@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    a = await news_articles_collection.find_one({"id": article_id})
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")

    return {
        "id": a["id"],
        "title": a.get("title"),
        "content": a.get("content"),
        "category": a.get("category"),
        "source": a.get("source_name"),
        "risk_score": a.get("risk_score"),
        "risk_level": a.get("risk_level"),
        "sentiment": a.get("sentiment_label"),
    }