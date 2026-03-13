from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import (
    Article,
    NewsArticle,
    GovernanceRiskScore,
    DetectionResult,
    SentimentRecord,
)

router = APIRouter(prefix="/api", tags=["Analytics"])


# =========================
# Sentiment Trend
# =========================
@router.get("/analytics/sentiment-trend")
def sentiment_trend(db: Session = Depends(get_db)):
    """Sentiment polarity over time — derived from NewsArticle (live pipeline data)."""

    # Primary: use NewsArticle which is populated by the live pipeline
    na_count = db.query(func.count(NewsArticle.id)).scalar() or 0
    if na_count > 0:
        results = (
            db.query(
                func.date(NewsArticle.scraped_at).label("date"),
                func.avg(NewsArticle.sentiment_polarity).label("avg_polarity"),
                func.avg(NewsArticle.anger_rating).label("avg_anger"),
                func.count(NewsArticle.id).label("count"),
            )
            .group_by(func.date(NewsArticle.scraped_at))
            .order_by(func.date(NewsArticle.scraped_at))
            .all()
        )
        return {
            "trend": [
                {
                    "date": str(r.date),
                    "avg_polarity": round(r.avg_polarity or 0, 3),
                    "avg_anger": round(r.avg_anger or 0, 2),
                    "count": r.count,
                }
                for r in results
            ]
        }

    # Fallback: legacy Article + SentimentRecord tables
    results = (
        db.query(
            func.date(Article.ingested_at).label("date"),
            func.avg(SentimentRecord.polarity).label("avg_polarity"),
            func.avg(SentimentRecord.anger_rating).label("avg_anger"),
            func.count(Article.id).label("count"),
        )
        .outerjoin(SentimentRecord, SentimentRecord.article_id == Article.id)
        .group_by(func.date(Article.ingested_at))
        .order_by(func.date(Article.ingested_at))
        .all()
    )

    return {
        "trend": [
            {
                "date": str(r.date),
                "avg_polarity": round(r.avg_polarity or 0, 3),
                "avg_anger": round(r.avg_anger or 0, 2),
                "count": r.count,
            }
            for r in results
        ]
    }


# =========================
# Risk Heatmap
# =========================
@router.get("/analytics/risk-heatmap")
def risk_heatmap(db: Session = Depends(get_db)):
    """Governance Risk Index heatmap by category (NewsArticle-based)."""

    na_count = db.query(func.count(NewsArticle.id)).scalar() or 0
    if na_count > 0:
        # Group by category since NewsArticle has no location column
        results = (
            db.query(
                NewsArticle.category.label("location"),
                func.avg(NewsArticle.risk_score).label("avg_gri"),
                func.max(NewsArticle.risk_score).label("max_gri"),
                func.count(NewsArticle.id).label("signal_count"),
                func.avg(NewsArticle.anger_rating).label("avg_anger"),
            )
            .group_by(NewsArticle.category)
            .order_by(func.avg(NewsArticle.risk_score).desc())
            .all()
        )

        return {
            "heatmap": [
                {
                    "location": r.location or "General",
                    "avg_gri": round(r.avg_gri or 0, 1),
                    "max_gri": round(r.max_gri or 0, 1),
                    "signal_count": r.signal_count,
                    "avg_anger": round(r.avg_anger or 0, 1),
                    "risk_level": (
                        "HIGH"
                        if (r.avg_gri or 0) > 60
                        else "MODERATE"
                        if (r.avg_gri or 0) > 30
                        else "LOW"
                    ),
                }
                for r in results
            ]
        }

    # Fallback: legacy tables
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
        .all()
    )

    return {
        "heatmap": [
            {
                "location": r.location,
                "avg_gri": round(r.avg_gri or 0, 1),
                "max_gri": round(r.max_gri or 0, 1),
                "signal_count": r.signal_count,
                "avg_anger": round(r.avg_anger or 0, 1),
                "risk_level": (
                    "HIGH"
                    if (r.avg_gri or 0) > 60
                    else "MODERATE"
                    if (r.avg_gri or 0) > 30
                    else "LOW"
                ),
            }
            for r in results
        ]
    }


# =========================
# Category Breakdown
# =========================
@router.get("/analytics/category-breakdown")
def category_breakdown(db: Session = Depends(get_db)):
    """Risk breakdown by category — derived from NewsArticle."""

    na_count = db.query(func.count(NewsArticle.id)).scalar() or 0
    if na_count > 0:
        results = (
            db.query(
                NewsArticle.category,
                func.avg(NewsArticle.risk_score).label("avg_gri"),
                func.count(NewsArticle.id).label("total"),
            )
            .group_by(NewsArticle.category)
            .order_by(func.avg(NewsArticle.risk_score).desc())
            .all()
        )

        fake_counts = dict(
            db.query(
                NewsArticle.category,
                func.count(NewsArticle.id),
            )
            .filter(NewsArticle.fake_news_label == "FAKE")
            .group_by(NewsArticle.category)
            .all()
        )

        return {
            "categories": [
                {
                    "category": r.category or "General",
                    "avg_gri": round(r.avg_gri or 0, 1),
                    "total_signals": r.total,
                    "fake_count": fake_counts.get(r.category, 0),
                    "risk_level": (
                        "HIGH"
                        if (r.avg_gri or 0) > 60
                        else "MODERATE"
                        if (r.avg_gri or 0) > 30
                        else "LOW"
                    ),
                }
                for r in results
            ]
        }

    # Fallback: legacy tables
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
                "avg_gri": round(r.avg_gri or 0, 1),
                "total_signals": r.total,
                "fake_count": fake_counts.get(r.category, 0),
                "risk_level": (
                    "HIGH"
                    if (r.avg_gri or 0) > 60
                    else "MODERATE"
                    if (r.avg_gri or 0) > 30
                    else "LOW"
                ),
            }
            for r in results
        ]
    }