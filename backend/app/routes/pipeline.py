"""
Data Pipeline API — Manual trigger + status + scraped articles endpoint.
════════════════════════════════════════════════════════════════════════
Endpoints:
  POST /api/pipeline/run           — Trigger a full scrape cycle
  GET  /api/pipeline/status        — Scheduler status + last run info
  GET  /api/news-articles          — List scraped & analyzed articles
  GET  /api/news-articles/{id}     — Single article detail
  GET  /api/news-articles/stats    — Aggregated statistics
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import NewsArticle

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
def pipeline_status(db: Session = Depends(get_db)):
    """Return pipeline status and statistics."""
    total = db.query(func.count(NewsArticle.id)).scalar() or 0
    latest = (
        db.query(NewsArticle)
        .order_by(NewsArticle.scraped_at.desc())
        .first()
    )

    # Source breakdown
    sources = (
        db.query(NewsArticle.source_name, func.count(NewsArticle.id))
        .group_by(NewsArticle.source_name)
        .all()
    )

    # Risk breakdown
    risk_counts = dict(
        db.query(NewsArticle.risk_level, func.count(NewsArticle.id))
        .group_by(NewsArticle.risk_level)
        .all()
    )

    return {
        "total_articles": total,
        "last_scraped_at": latest.scraped_at.isoformat() if latest else None,
        "last_article_title": latest.title if latest else None,
        "source_breakdown": {name: count for name, count in sources},
        "risk_breakdown": risk_counts,
        "scheduler": "APScheduler — every 30 minutes",
    }


@router.get("/news-articles/stats")
def news_article_stats(db: Session = Depends(get_db)):
    """Aggregated statistics for scraped articles."""
    total = db.query(func.count(NewsArticle.id)).scalar() or 0
    avg_risk = db.query(func.avg(NewsArticle.risk_score)).scalar() or 0
    avg_anger = db.query(func.avg(NewsArticle.anger_rating)).scalar() or 0
    fake_count = (
        db.query(func.count(NewsArticle.id))
        .filter(NewsArticle.fake_news_label == "FAKE")
        .scalar() or 0
    )

    # By category
    categories = (
        db.query(
            NewsArticle.category,
            func.count(NewsArticle.id),
            func.avg(NewsArticle.risk_score),
        )
        .group_by(NewsArticle.category)
        .order_by(func.avg(NewsArticle.risk_score).desc())
        .all()
    )

    # By sentiment
    sentiments = dict(
        db.query(NewsArticle.sentiment_label, func.count(NewsArticle.id))
        .group_by(NewsArticle.sentiment_label)
        .all()
    )

    return {
        # Dashboard-compatible field names
        "overall_gri": round(avg_risk, 1),
        "total_articles": total,
        "fake_news_percentage": round(fake_count / max(total, 1) * 100, 1),
        "average_anger": round(avg_anger, 2),
        "active_alerts": 0,
        "sentiment_distribution": sentiments,
        "category_risk": [
            {"category": c or "General", "avg_gri": round(g or 0, 1), "count": n}
            for c, n, g in categories
        ],
        "location_risk": [],
        "top_risks": [],
        "critical_alerts": [],
        # Legacy fields kept for backward compatibility
        "total": total,
        "avg_risk_score": round(avg_risk, 1),
        "avg_anger_rating": round(avg_anger, 2),
        "fake_news_count": fake_count,
        "fake_news_pct": round(fake_count / max(total, 1) * 100, 1),
    }


@router.get("/news-articles")
def list_news_articles(
    category: str = Query(None),
    risk_level: str = Query(None),
    label: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List scraped & analyzed articles with filters."""
    query = db.query(NewsArticle)

    if category:
        query = query.filter(NewsArticle.category == category)
    if risk_level:
        query = query.filter(NewsArticle.risk_level == risk_level)
    if label:
        query = query.filter(NewsArticle.fake_news_label == label)

    total = query.count()
    results = (
        query.order_by(NewsArticle.scraped_at.desc())
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
                "source_name": a.source_name,
                "url": a.url,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "category": a.category,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "sentiment": a.sentiment_label,
                "anger_rating": a.anger_rating,
                "fake_label": a.fake_news_label,
                "fake_confidence": a.fake_news_confidence,
                "credibility": a.credibility_score,
                "scraped_at": a.scraped_at.isoformat() if a.scraped_at else None,
            }
            for a in results
        ],
    }


@router.get("/news-articles/{article_id}")
def get_news_article(article_id: str, db: Session = Depends(get_db)):
    """Return a single scraped article with full analysis."""
    a = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")

    return {
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "source_name": a.source_name,
        "source_url": a.source_url,
        "url": a.url,
        "published_at": a.published_at.isoformat() if a.published_at else None,
        "category": a.category,
        "source_type": a.source_type,
        "tier": a.tier,
        "analysis": {
            "risk_score": a.risk_score,
            "risk_level": a.risk_level,
            "credibility_score": a.credibility_score,
            "sentiment_label": a.sentiment_label,
            "sentiment_polarity": a.sentiment_polarity,
            "anger_rating": a.anger_rating,
            "fake_news_label": a.fake_news_label,
            "fake_news_confidence": a.fake_news_confidence,
        },
        "scraped_at": a.scraped_at.isoformat() if a.scraped_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }
