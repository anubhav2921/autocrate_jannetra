from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import (
    Article, SentimentRecord, GovernanceRiskScore, DetectionResult, Source
)

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/analytics/sentiment-trend")
def sentiment_trend(db: Session = Depends(get_db)):
    """Sentiment polarity over time, grouped by date."""
    results = (
        db.query(
            func.date(Article.ingested_at).label("date"),
            func.avg(SentimentRecord.polarity).label("avg_polarity"),
            func.avg(SentimentRecord.anger_rating).label("avg_anger"),
            func.count(Article.id).label("count"),
        )
        .join(SentimentRecord, SentimentRecord.article_id == Article.id)
        .group_by(func.date(Article.ingested_at))
        .order_by(func.date(Article.ingested_at))
        .all()
    )

    return {
        "trend": [
            {
                "date": str(r.date),
                "avg_polarity": round(r.avg_polarity, 3),
                "avg_anger": round(r.avg_anger, 2),
                "count": r.count,
            }
            for r in results
        ]
    }


@router.get("/analytics/risk-heatmap")
def risk_heatmap(db: Session = Depends(get_db)):
    """GRI scores by location for heatmap visualization."""
    results = (
        db.query(
            Article.location,
            func.avg(GovernanceRiskScore.gri_score).label("avg_gri"),
            func.max(GovernanceRiskScore.gri_score).label("max_gri"),
            func.count(Article.id).label("signal_count"),
            func.avg(SentimentRecord.anger_rating).label("avg_anger"),
        )
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .outerjoin(SentimentRecord, SentimentRecord.article_id == Article.id)
        .group_by(Article.location)
        .order_by(func.avg(GovernanceRiskScore.gri_score).desc())
        .all()
    )

    return {
        "heatmap": [
            {
                "location": r.location,
                "avg_gri": round(r.avg_gri, 1),
                "max_gri": round(r.max_gri, 1),
                "signal_count": r.signal_count,
                "avg_anger": round(r.avg_anger, 1) if r.avg_anger else 0,
                "risk_level": (
                    "HIGH" if r.avg_gri > 60
                    else "MODERATE" if r.avg_gri > 30
                    else "LOW"
                ),
            }
            for r in results
        ]
    }


@router.get("/analytics/category-breakdown")
def category_breakdown(db: Session = Depends(get_db)):
    """Risk breakdown by category with detection stats."""
    results = (
        db.query(
            Article.category,
            func.avg(GovernanceRiskScore.gri_score).label("avg_gri"),
            func.count(Article.id).label("total"),
        )
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .group_by(Article.category)
        .order_by(func.avg(GovernanceRiskScore.gri_score).desc())
        .all()
    )

    # Get fake counts per category
    fake_counts = dict(
        db.query(
            Article.category,
            func.count(DetectionResult.id),
        )
        .join(DetectionResult, DetectionResult.article_id == Article.id)
        .filter(DetectionResult.label == "FAKE")
        .group_by(Article.category)
        .all()
    )

    return {
        "categories": [
            {
                "category": r.category,
                "avg_gri": round(r.avg_gri, 1),
                "total_signals": r.total,
                "fake_count": fake_counts.get(r.category, 0),
                "risk_level": (
                    "HIGH" if r.avg_gri > 60
                    else "MODERATE" if r.avg_gri > 30
                    else "LOW"
                ),
            }
            for r in results
        ]
    }
