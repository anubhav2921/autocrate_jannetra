from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Article, DetectionResult, GovernanceRiskScore, Alert, SentimentRecord, NewsArticle

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    # Primary source: NewsArticle (populated by the live scraping pipeline)
    na_total = db.query(func.count(NewsArticle.id)).scalar() or 0

    if na_total > 0:
        # All stats derived from NewsArticle
        avg_risk = db.query(func.avg(NewsArticle.risk_score)).scalar() or 0
        avg_anger = db.query(func.avg(NewsArticle.anger_rating)).scalar() or 0

        fake_count = (
            db.query(func.count(NewsArticle.id))
            .filter(NewsArticle.fake_news_label == "FAKE")
            .scalar() or 0
        )
        fake_pct = round((fake_count / max(na_total, 1)) * 100, 1)

        # Sentiment distribution
        sentiments = (
            db.query(NewsArticle.sentiment_label, func.count(NewsArticle.id))
            .group_by(NewsArticle.sentiment_label)
            .all()
        )
        sentiment_dist = {label: count for label, count in sentiments if label}

        # Risk by category
        categories = (
            db.query(
                NewsArticle.category,
                func.avg(NewsArticle.risk_score).label("avg_gri"),
                func.count(NewsArticle.id).label("count"),
            )
            .group_by(NewsArticle.category)
            .order_by(func.avg(NewsArticle.risk_score).desc())
            .all()
        )

        # Top risk articles (sorted by risk_score descending)
        top_articles = (
            db.query(NewsArticle)
            .order_by(NewsArticle.risk_score.desc())
            .limit(10)
            .all()
        )

        # Active alerts from Alert table (kept from legacy model)
        active_alerts = (
            db.query(func.count(Alert.id)).filter(Alert.is_active == True).scalar() or 0
        )

        # Count HIGH / MODERATE articles as proxy alerts if Alert table is empty
        if active_alerts == 0:
            active_alerts = (
                db.query(func.count(NewsArticle.id))
                .filter(NewsArticle.risk_level.in_(["HIGH", "MODERATE"]))
                .scalar() or 0
            )

        return {
            "overall_gri": round(avg_risk, 1),
            "total_articles": na_total,
            "fake_news_percentage": fake_pct,
            "average_anger": round(avg_anger, 2),
            "active_alerts": active_alerts,
            "sentiment_distribution": sentiment_dist,
            "category_risk": [
                {"category": c or "General", "avg_gri": round(g or 0, 1), "count": n}
                for c, g, n in categories
            ],
            "location_risk": [],   # NewsArticle has no location column; extend later
            "top_risks": [
                {
                    "id": a.id,
                    "title": a.title,
                    "category": a.category,
                    "location": None,
                    "gri_score": round(a.risk_score or 0, 1),
                    "risk_level": a.risk_level,
                    "label": a.fake_news_label,
                    "confidence": round(a.fake_news_confidence or 0, 2),
                    "anger_rating": round(a.anger_rating or 0, 1),
                }
                for a in top_articles
            ],
            "critical_alerts": [],
        }

    # Fallback: legacy seeded Article / GovernanceRiskScore tables
    total_articles = db.query(func.count(Article.id)).scalar() or 0

    fake_count = (
        db.query(func.count(DetectionResult.id))
        .filter(DetectionResult.label == "FAKE")
        .scalar() or 0
    )
    fake_pct = round((fake_count / max(total_articles, 1)) * 100, 1)

    avg_gri = db.query(func.avg(GovernanceRiskScore.gri_score)).scalar() or 0
    avg_gri = round(avg_gri, 1)

    active_alerts = (
        db.query(func.count(Alert.id)).filter(Alert.is_active == True).scalar() or 0
    )

    critical_alerts = (
        db.query(Alert)
        .filter(Alert.is_active == True, Alert.severity.in_(["CRITICAL", "HIGH"]))
        .order_by(Alert.created_at.desc())
        .limit(5)
        .all()
    )

    sentiments = (
        db.query(SentimentRecord.sentiment_label, func.count(SentimentRecord.id))
        .group_by(SentimentRecord.sentiment_label)
        .all()
    )
    sentiment_dist = {label: count for label, count in sentiments}

    category_risk = (
        db.query(
            Article.category,
            func.avg(GovernanceRiskScore.gri_score).label("avg_gri"),
            func.count(Article.id).label("count"),
        )
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .group_by(Article.category)
        .order_by(func.avg(GovernanceRiskScore.gri_score).desc())
        .all()
    )

    location_risk = (
        db.query(
            Article.location,
            func.avg(GovernanceRiskScore.gri_score).label("avg_gri"),
            func.count(Article.id).label("count"),
        )
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .group_by(Article.location)
        .order_by(func.avg(GovernanceRiskScore.gri_score).desc())
        .all()
    )

    top_risks = (
        db.query(Article, GovernanceRiskScore, DetectionResult, SentimentRecord)
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .join(DetectionResult, DetectionResult.article_id == Article.id)
        .outerjoin(SentimentRecord, SentimentRecord.article_id == Article.id)
        .order_by(GovernanceRiskScore.gri_score.desc())
        .limit(10)
        .all()
    )

    avg_anger = db.query(func.avg(SentimentRecord.anger_rating)).scalar() or 0

    return {
        "overall_gri": avg_gri,
        "total_articles": total_articles,
        "fake_news_percentage": fake_pct,
        "average_anger": round(avg_anger, 1),
        "active_alerts": active_alerts,
        "sentiment_distribution": sentiment_dist,
        "critical_alerts": [
            {
                "id": a.id,
                "severity": a.severity,
                "department": a.department,
                "recommendation": a.recommendation,
                "urgency": a.urgency,
            }
            for a in critical_alerts
        ],
        "category_risk": [
            {"category": c, "avg_gri": round(g, 1), "count": n}
            for c, g, n in category_risk
        ],
        "location_risk": [
            {"location": l, "avg_gri": round(g, 1), "count": n}
            for l, g, n in location_risk
        ],
        "top_risks": [
            {
                "id": art.id,
                "title": art.title,
                "category": art.category,
                "location": art.location,
                "gri_score": gri.gri_score,
                "risk_level": gri.risk_level,
                "label": det.label,
                "confidence": det.confidence_score,
                "anger_rating": sent.anger_rating if sent else 0,
            }
            for art, gri, det, sent in top_risks
        ],
    }
