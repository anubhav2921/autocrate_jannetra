from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..mongodb import resolutions_collection, users_collection
from ..utils import gen_uuid

router = APIRouter(prefix="/api", tags=["Resolutions"])


class ResolutionCreate(BaseModel):
    title: str
    category: str
    location: str
    problem_description: str
    action_taken: str
    resources_used: str = ""
    people_benefited: str = ""
    status: str = "RESOLVED"
    alert_id: Optional[str] = None
    user_id: str


@router.post("/resolutions")
async def create_resolution(req: ResolutionCreate):
    now = datetime.utcnow()
    resolution = {
        "id": gen_uuid(),
        "alert_id": req.alert_id,
        "resolved_by": req.user_id,
        "title": req.title,
        "category": req.category,
        "location": req.location,
        "problem_description": req.problem_description,
        "action_taken": req.action_taken,
        "resources_used": req.resources_used,
        "people_benefited": req.people_benefited,
        "status": req.status,
        "created_at": now,
        "resolved_at": now,
        "submitted_at": now,
    }
    await resolutions_collection.insert_one(resolution)
    return {
        "success": True,
        "resolution": {
            "id": resolution["id"],
            "title": resolution["title"],
            "status": resolution["status"],
            "resolved_at": resolution["resolved_at"].isoformat(),
        },
    }


@router.get("/resolutions")
async def list_resolutions(user_id: Optional[str] = None):
    query = {}
    if user_id:
        query["resolved_by"] = user_id
    
    # manual resolutions
    cursor = resolutions_collection.find(query).sort("submitted_at", -1)
    res_docs = await cursor.to_list(None)

    # signal problem resolutions
    from ..mongodb import signal_problems_collection
    sig_query = {"status": "Problem Resolved"}
    if user_id:
        sig_query["resolved_by"] = user_id
    sig_cursor = await signal_problems_collection.find(sig_query).sort("resolved_at", -1).to_list(None)

    results = []
    
    # Process manual resolutions
    for r in res_docs:
        user = await users_collection.find_one({"id": r.get("resolved_by")}) or {}
        resolved_at = r.get("resolved_at")
        results.append({
            "id": r["id"],
            "title": r.get("title"),
            "category": r.get("category"),
            "location": r.get("location"),
            "problem_description": r.get("problem_description"),
            "action_taken": r.get("action_taken"),
            "resources_used": r.get("resources_used"),
            "people_benefited": r.get("people_benefited"),
            "status": r.get("status"),
            "resolved_at": resolved_at.isoformat() if isinstance(resolved_at, datetime) else resolved_at,
            "leader": {
                "name": user.get("name"),
                "department": user.get("department"),
            },
            "type": "Manual"
        })

    # Process signal resolutions
    for s in sig_cursor:
        user = await users_collection.find_one({"id": s.get("resolved_by")}) or {}
        resolved_at = s.get("resolved_at")
        results.append({
            "id": s["id"],
            "title": s.get("title"),
            "category": s.get("category"),
            "location": s.get("location"),
            "problem_description": s.get("description"),
            "action_taken": s.get("resolution_report"),
            "resources_used": "N/A",
            "people_benefited": "N/A",
            "status": "RESOLVED",
            "resolved_at": resolved_at.isoformat() if isinstance(resolved_at, datetime) else resolved_at,
            "leader": {
                "name": user.get("name"),
                "department": user.get("department"),
            },
            "type": "Signal"
        })

    # Sort combined list by date
    results.sort(key=lambda x: x["resolved_at"] or "", reverse=True)

    return {"resolutions": results}
