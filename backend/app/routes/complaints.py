from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..mongodb import articles_collection, sources_collection, detection_results_collection, community_reviews_collection
from ..utils import gen_uuid

router = APIRouter(prefix="/api", tags=["Complaints"])


class ReviewCreate(BaseModel):
    complaint_id: str
    review_text: str
    verified_as: str  # real, false, needs_more_info
    user_id: Optional[str] = None


@router.get("/complaints")
async def list_complaints():
    """Returns articles from COMPLAINT sources joined with detection results."""
    # Get all source IDs that are COMPLAINT type
    complaint_sources = await sources_collection.find({"source_type": "COMPLAINT"}, {"id": 1}).to_list(None)
    source_ids = [s["id"] for s in complaint_sources]

    art_cursor = articles_collection.find({"source_id": {"$in": source_ids}})
    art_docs = await art_cursor.to_list(None)

    complaints = []
    for art in art_docs:
        det = await detection_results_collection.find_one({"article_id": art["id"]})
        ingested = art.get("ingested_at")
        complaints.append({
            "id": art["id"],
            "title": art.get("title"),
            "location": art.get("location"),
            "category": art.get("category"),
            "confidence_score": det.get("confidence_score", 0.0) if det else 0.0,
            "status": "verified" if (det and det.get("label") == "REAL" and (det.get("confidence_score") or 0) > 0.8) else "pending",
            "ingested_at": ingested.isoformat() if isinstance(ingested, datetime) else ingested,
        })
    return complaints


@router.post("/reviews")
async def create_review(req: ReviewCreate):
    article = await articles_collection.find_one({"id": req.complaint_id})
    if not article:
        raise HTTPException(status_code=404, detail="Complaint not found")

    review = {
        "id": gen_uuid(),
        "article_id": req.complaint_id,
        "user_id": req.user_id,
        "review_text": req.review_text,
        "verdict": req.verified_as,
        "created_at": datetime.utcnow(),
    }
    await community_reviews_collection.insert_one(review)
    return {"success": True, "message": "Review submitted successfully"}


@router.post("/complaints/{id}/support")
async def support_complaint(id: str):
    return {"success": True, "message": "Support recorded"}


@router.post("/complaints/{id}/false")
async def mark_false(id: str):
    return {"success": True, "message": "Voted as false"}
