from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..database import get_db
from ..models import Article, Source, DetectionResult, CommunityReview, User
import uuid

router = APIRouter(prefix="/api", tags=["Complaints"])

class ReviewCreate(BaseModel):
    complaint_id: str
    review_text: str
    verified_as: str  # real, false, needs_more_info
    user_id: Optional[str] = None

@router.get("/complaints")
def list_complaints(db: Session = Depends(get_db)):
    """
    Returns articles that originate from 'COMPLAINT' sources.
    Joined with detection results to provide confidence scores.
    """
    results = (
        db.query(Article, DetectionResult)
        .join(Source, Article.source_id == Source.id)
        .outerjoin(DetectionResult, Article.id == DetectionResult.article_id)
        .filter(Source.source_type == "COMPLAINT")
        .all()
    )

    complaints = []
    for art, det in results:
        complaints.append({
            "id": art.id,
            "title": art.title,
            "location": art.location,
            "category": art.category,
            "confidence_score": det.confidence_score if det else 0.0,
            "status": "verified" if (det and det.label == "REAL" and det.confidence_score > 0.8) else "pending",
            "ingested_at": art.ingested_at.isoformat() if art.ingested_at else None
        })
    
    return complaints

@router.post("/reviews")
def create_review(req: ReviewCreate, db: Session = Depends(get_db)):
    """
    Submit a community review for an AI-flagged issue.
    """
    # Verify article exists
    article = db.query(Article).filter(Article.id == req.complaint_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Complaint not found")

    review = CommunityReview(
        article_id=req.complaint_id,
        user_id=req.user_id,
        review_text=req.review_text,
        verdict=req.verified_as
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return {"success": True, "message": "Review submitted successfully"}

@router.post("/complaints/{id}/support")
def support_complaint(id: str, db: Session = Depends(get_db)):
    """
    Placeholder for support/upvote logic.
    In a real app, this would increment a counter or track user votes.
    """
    return {"success": True, "message": "Support recorded"}

@router.post("/complaints/{id}/false")
def mark_false(id: str, db: Session = Depends(get_db)):
    """
    Placeholder for marking an issue as false.
    """
    return {"success": True, "message": "Voted as false"}
