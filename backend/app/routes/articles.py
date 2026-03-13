from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import NewsArticle

router = APIRouter(prefix="/api", tags=["Articles"])


@router.get("/articles")
def list_articles(
    category: str | None = Query(None),
    label: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(NewsArticle)

    if category:
        query = query.filter(NewsArticle.category == category)

    if label:
        query = query.filter(NewsArticle.fake_news_label == label)

    total = query.count()

    articles = (
        query.order_by(NewsArticle.risk_score.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "articles": [
            {
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "source": a.source_name,
                "url": a.url or a.source_url,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "sentiment": a.sentiment_label,
            }
            for a in articles
        ],
    }


@router.get("/articles/{article_id}")
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "category": article.category,
        "source": article.source_name,
        "risk_score": article.risk_score,
        "risk_level": article.risk_level,
        "sentiment": article.sentiment_label,
    }