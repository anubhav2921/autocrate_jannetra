from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Article, GovernanceRiskScore

router = APIRouter(prefix="/api", tags=["Signals"])

@router.get("/signal-problems")
def get_signal_problems(db: Session = Depends(get_db)):
    results = (
        db.query(
            Article.id,
            Article.title,
            Article.category,
            Article.location,
            GovernanceRiskScore.gri_score
        )
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .order_by(GovernanceRiskScore.gri_score.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category,
            "location": r.location,
            "risk": r.gri_score,
            "status": "ACTIVE"
        }
        for r in results
    ]