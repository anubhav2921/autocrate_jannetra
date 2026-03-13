from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Alert, Article, NewsArticle

router = APIRouter(prefix="/api", tags=["Alerts"])


@router.get("/alerts")
def list_alerts(
    severity: str = Query(None),
    active_only: bool = Query(True),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    # Check if legacy Alert table has data
    alert_count = db.query(Alert).count()

    if alert_count > 0:
        # Use legacy Alert + Article join
        query = db.query(Alert, Article).join(Article, Article.id == Alert.article_id)

        if active_only:
            query = query.filter(Alert.is_active == True)
        if severity:
            query = query.filter(Alert.severity == severity)

        total = query.count()
        results = (
            query.order_by(Alert.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        sorted_results = sorted(results, key=lambda x: severity_order.get(x[0].severity, 4))

        return {
            "total": total,
            "page": page,
            "alerts": [
                {
                    "id": alert.id,
                    "severity": alert.severity,
                    "department": alert.department,
                    "recommendation": alert.recommendation,
                    "urgency": alert.urgency,
                    "response_strategy": alert.response_strategy,
                    "is_active": alert.is_active,
                    "created_at": alert.created_at.isoformat() if alert.created_at else None,
                    "article": {
                        "id": art.id,
                        "title": art.title,
                        "category": art.category,
                        "location": art.location,
                    },
                }
                for alert, art in sorted_results
            ],
        }

    # Fallback: synthesize alerts from high-risk NewsArticle entries
    DEPT_MAP = {
        "Corruption": "Anti-Corruption Bureau",
        "Infrastructure": "Public Works Department",
        "Healthcare": "Ministry of Health",
        "Education": "Ministry of Education",
        "Agriculture": "Ministry of Agriculture",
        "Environment": "Ministry of Environment",
        "Economy": "Ministry of Finance",
        "Law & Order": "Ministry of Home Affairs",
        "Water": "Jal Shakti Ministry",
        "Transport": "Ministry of Transport",
        "Energy": "Ministry of Power",
        "General": "District Administration",
        "Politics": "Election Commission",
        "Security": "Ministry of Defence",
        "Social": "Ministry of Social Justice",
    }

    query = db.query(NewsArticle).filter(
        NewsArticle.risk_level.in_(["HIGH", "MODERATE"])
    )

    if severity:
        # Map frontend severity to risk_level
        sev_map = {"CRITICAL": "HIGH", "HIGH": "HIGH", "MEDIUM": "MODERATE", "LOW": "LOW"}
        mapped = sev_map.get(severity, severity)
        query = query.filter(NewsArticle.risk_level == mapped)

    total = query.count()
    articles = (
        query.order_by(NewsArticle.risk_score.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    synthesized = []
    for i, a in enumerate(articles):
        is_high = (a.risk_score or 0) >= 70
        sev = "CRITICAL" if (a.risk_score or 0) >= 80 else "HIGH" if is_high else "MEDIUM"
        dept = DEPT_MAP.get(a.category or "General", "District Administration")
        synthesized.append({
            "id": f"alert-{a.id[:8]}",
            "severity": sev,
            "department": dept,
            "recommendation": f"Immediate review required: {a.title[:120]}",
            "urgency": "Immediate" if sev == "CRITICAL" else "Within 24h",
            "response_strategy": (
                f"Deploy {dept} field team to investigate. "
                f"Risk score: {round(a.risk_score or 0, 1)}/100. "
                f"Fake news confidence: {round(a.fake_news_confidence or 0, 1)*100:.0f}%."
            ),
            "is_active": True,
            "created_at": a.scraped_at.isoformat() if a.scraped_at else None,
            "article": {
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "location": None,
            },
        })

    return {
        "total": total,
        "page": page,
        "alerts": synthesized,
    }


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        # For synthesized alerts derived from NewsArticle, just return success
        return {"status": "acknowledged", "alert_id": alert_id}

    alert.is_active = False
    db.commit()
    return {"status": "acknowledged", "alert_id": alert_id}
