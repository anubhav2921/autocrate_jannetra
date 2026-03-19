from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..mongodb import articles_collection, sources_collection, detection_results_collection, community_reviews_collection
from ..utils import gen_uuid, get_current_user, get_current_user_optional

router = APIRouter(prefix="/api", tags=["Complaints"])


class ReviewCreate(BaseModel):
    complaint_id: str
    review_text: str
    verified_as: str  # real, false, needs_more_info
    user_id: Optional[str] = None


@router.get("/complaints")
async def list_complaints(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Returns articles joined with detection results. Public access allowed."""
    # Get all source IDs that are COMPLAINT or SOCIAL_MEDIA type
    source_query = {"source_type": {"$in": ["COMPLAINT", "SOCIAL_MEDIA"]}}
    complaint_sources = await sources_collection.find(source_query, {"id": 1}).to_list(None)
    source_ids = [s["id"] for s in complaint_sources]

    user_dept = current_user.get("department") if current_user else None
    user_role = current_user.get("role") if current_user else None

    query = {"source_id": {"$in": source_ids}}
    
    # Apply Department Filter if not admin
    if user_role != "ADMIN" and user_dept:
        query["department"] = user_dept

    art_cursor = articles_collection.find(query)
    art_docs = await art_cursor.to_list(None)

    # Pre-fetch all relevant source names to avoid N+1 queries
    sources = await sources_collection.find({"id": {"$in": source_ids}}, {"id": 1, "name": 1}).to_list(None)
    source_map = {s["id"]: s.get("name") for s in sources}

    complaints = []
    for art in art_docs:
        det = await detection_results_collection.find_one({"article_id": art["id"]})
        ingested = art.get("ingested_at")
        complaints.append({
            "id": art["id"],
            "title": art.get("title"),
            "location": art.get("location"),
            "category": art.get("category"),
            "source_name": source_map.get(art.get("source_id"), "External Intelligence"),
            "confidence_score": det.get("confidence_score", 0.0) if det else 0.0,
            "status": "verified" if (det and det.get("label") == "REAL" and (det.get("confidence_score") or 0) > 0.8) else "pending",
            "ingested_at": ingested.isoformat() if isinstance(ingested, datetime) else ingested,
        })
    return complaints


@router.post("/reviews")
async def create_review(req: ReviewCreate, current_user: Optional[dict] = Depends(get_current_user_optional)):
    article = await articles_collection.find_one({"id": req.complaint_id})
    if not article:
        raise HTTPException(status_code=404, detail="Complaint not found")

    review = {
        "id": gen_uuid(),
        "article_id": req.complaint_id,
        "user_id": current_user.get("id") if current_user else req.user_id,
        "review_text": req.review_text,
        "verdict": req.verified_as,
        "created_at": datetime.utcnow(),
    }
    await community_reviews_collection.insert_one(review)

    # If the user is a logged-in LEADER or OFFICIAL, record a resolution to boost leaderboard
    if current_user and current_user.get("role") in ["LEADER", "OFFICIAL", "ADMIN"]:
        resolution = {
            "id": gen_uuid(),
            "article_id": req.complaint_id,
            "resolved_by": current_user.get("id"),
            "status": "RESOLVED" if req.verified_as == "real" else "DISMISSED",
            "notes": req.review_text,
            "metadata": {"source": "landing_page_verification"},
            "created_at": datetime.utcnow()
        }
        await resolutions_collection.insert_one(resolution)
        
        # Also update the article detection if verified
        if req.verified_as == "real":
            await detection_results_collection.update_one(
                {"article_id": req.complaint_id},
                {"$set": {"label": "REAL", "confidence_score": 1.0}}
            )

    return {"success": True, "message": "Review submitted successfully and recorded for Leaderboard"}


@router.post("/complaints/{id}/support")
async def support_complaint(id: str):
    return {"success": True, "message": "Support recorded"}


@router.post("/complaints/{id}/false")
async def mark_false(id: str):
    return {"success": True, "message": "Voted as false"}
