from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Article, DetectionResult, GovernanceRiskScore, Alert, SentimentRecord, Source

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total_articles = db.query(func.count(Article.id)).scalar() or 0

    # Fake news percentage
    fake_count = (
        db.query(func.count(DetectionResult.id))
        .filter(DetectionResult.label == "FAKE")
        .scalar() or 0
    )
    fake_pct = round((fake_count / max(total_articles, 1)) * 100, 1)

    # Overall GRI (average)
    avg_gri = db.query(func.avg(GovernanceRiskScore.gri_score)).scalar() or 0
    avg_gri = round(avg_gri, 1)

    # Active alerts
    active_alerts = (
        db.query(func.count(Alert.id)).filter(Alert.is_active == True).scalar() or 0
    )

    # Critical alerts (for banner)
    critical_alerts = (
        db.query(Alert)
        .filter(Alert.is_active == True, Alert.severity.in_(["CRITICAL", "HIGH"]))
        .order_by(Alert.created_at.desc())
        .limit(5)
        .all()
    )

    # Sentiment distribution
    sentiments = (
        db.query(SentimentRecord.sentiment_label, func.count(SentimentRecord.id))
        .group_by(SentimentRecord.sentiment_label)
        .all()
    )
    sentiment_dist = {label: count for label, count in sentiments}

    # Risk by category
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

    # Risk by location (for heatmap)
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

    # Top risk articles (priority ranking)
    top_risks = (
        db.query(Article, GovernanceRiskScore, DetectionResult, SentimentRecord)
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .join(DetectionResult, DetectionResult.article_id == Article.id)
        .outerjoin(SentimentRecord, SentimentRecord.article_id == Article.id)
        .order_by(GovernanceRiskScore.gri_score.desc())
        .limit(10)
        .all()
    )

    # Average anger
    avg_anger = db.query(func.avg(SentimentRecord.anger_rating)).scalar() or 0

    return {
        "total_articles": total_articles,
        "fake_news_percentage": fake_pct,
        "overall_gri": avg_gri,
        "active_alerts": active_alerts,
        "average_anger": round(avg_anger, 1),
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
