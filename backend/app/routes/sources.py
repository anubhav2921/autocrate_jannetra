from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Source, Article, DetectionResult

router = APIRouter(prefix="/api", tags=["Sources"])


@router.get("/sources")
def list_sources(db: Session = Depends(get_db)):
    sources = db.query(Source).all()

    result = []
    for s in sources:
        article_count = (
            db.query(func.count(Article.id))
            .filter(Article.source_id == s.id)
            .scalar() or 0
        )
        fake_count = (
            db.query(func.count(DetectionResult.id))
            .join(Article, Article.id == DetectionResult.article_id)
            .filter(Article.source_id == s.id, DetectionResult.label == "FAKE")
            .scalar() or 0
        )

        result.append({
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "domain": s.domain,
            "credibility_tier": s.credibility_tier,
            "historical_accuracy": s.historical_accuracy,
            "last_audited_at": s.last_audited_at.isoformat() if s.last_audited_at else None,
            "article_count": article_count,
            "fake_count": fake_count,
        })

    return {"sources": result}
