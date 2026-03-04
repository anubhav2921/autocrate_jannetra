from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Alert, Article

router = APIRouter(prefix="/api", tags=["Alerts"])


@router.get("/alerts")
def list_alerts(
    severity: str = Query(None),
    active_only: bool = Query(True),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Alert, Article).join(Article, Article.id == Alert.article_id)

    if active_only:
        query = query.filter(Alert.is_active == True)
    if severity:
        query = query.filter(Alert.severity == severity)

    total = query.count()
    results = (
        query.order_by(
            Alert.severity.desc(),
            Alert.created_at.desc(),
        )
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    sorted_results = sorted(
        results, key=lambda x: severity_order.get(x[0].severity, 4)
    )

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


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return {"error": "Alert not found"}

    alert.is_active = False
    db.commit()
    return {"status": "acknowledged", "alert_id": alert_id}
