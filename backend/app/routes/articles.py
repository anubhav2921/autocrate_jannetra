from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Article, DetectionResult, GovernanceRiskScore, SentimentRecord

router = APIRouter(prefix="/api", tags=["Articles"])


@router.get("/articles")
def list_articles(
    category: str = Query(None),
    label: str = Query(None),
    location: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Article, DetectionResult, GovernanceRiskScore, SentimentRecord)
        .join(DetectionResult, DetectionResult.article_id == Article.id)
        .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
        .outerjoin(SentimentRecord, SentimentRecord.article_id == Article.id)
    )

    if category:
        query = query.filter(Article.category == category)
    if label:
        query = query.filter(DetectionResult.label == label)
    if location:
        query = query.filter(Article.location == location)

    total = query.count()
    results = (
        query.order_by(GovernanceRiskScore.gri_score.desc())
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
                "id": art.id,
                "title": art.title,
                "category": art.category,
                "location": art.location,
                "source_id": art.source_id,
                "ingested_at": art.ingested_at.isoformat() if art.ingested_at else None,
                "label": det.label,
                "confidence": det.confidence_score,
                "gri_score": gri.gri_score,
                "risk_level": gri.risk_level,
                "anger_rating": sent.anger_rating if sent else 0,
                "sentiment": sent.sentiment_label if sent else "NEUTRAL",
            }
            for art, det, gri, sent in results
        ],
    }


@router.get("/articles/{article_id}")
def get_article(article_id: str, db: Session = Depends(get_db)):
    art = db.query(Article).filter(Article.id == article_id).first()
    if not art:
        return {"error": "Article not found"}

    det = db.query(DetectionResult).filter(DetectionResult.article_id == article_id).first()
    gri = db.query(GovernanceRiskScore).filter(GovernanceRiskScore.article_id == article_id).first()
    sent = db.query(SentimentRecord).filter(SentimentRecord.article_id == article_id).first()

    from ..models import Source
    source = db.query(Source).filter(Source.id == art.source_id).first()

    return {
        "id": art.id,
        "title": art.title,
        "raw_text": art.raw_text,
        "category": art.category,
        "location": art.location,
        "language": art.language,
        "ingested_at": art.ingested_at.isoformat() if art.ingested_at else None,
        "source": {
            "name": source.name if source else "Unknown",
            "type": source.source_type if source else None,
            "domain": source.domain if source else None,
            "credibility_tier": source.credibility_tier if source else None,
            "historical_accuracy": source.historical_accuracy if source else None,
        },
        "detection": {
            "label": det.label if det else None,
            "confidence": det.confidence_score if det else None,
            "features": det.features_json if det else {},
        },
        "gri": {
            "score": gri.gri_score if gri else None,
            "risk_level": gri.risk_level if gri else None,
            "components": gri.component_scores if gri else {},
        },
        "sentiment": {
            "polarity": sent.polarity if sent else None,
            "subjectivity": sent.subjectivity if sent else None,
            "anger_rating": sent.anger_rating if sent else None,
            "label": sent.sentiment_label if sent else None,
        },
    }
