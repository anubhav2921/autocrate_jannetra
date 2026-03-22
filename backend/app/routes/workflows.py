import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..mongodb import (
    signal_problems_collection,
    news_articles_collection,
    activity_logs_collection
)
from ..utils import gen_uuid, get_current_user_optional

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])

class DeleteRequest(BaseModel):
    reason: str

class AssignRequest(BaseModel):
    assignee_id: str
    assignee_name: str

class ProgressRequest(BaseModel):
    progress: int

class NoteRequest(BaseModel):
    note: str

class EscalateRequest(BaseModel):
    reason: str

class InviteRequest(BaseModel):
    account_id: str

async def log_activity(problem_id: str, action: str, user_name: str, details: str = ""):
    log_entry = {
        "id": gen_uuid(),
        "problem_id": problem_id,
        "action": action,
        "performed_by": user_name,
        "timestamp": datetime.datetime.utcnow(),
        "details": details
    }
    await activity_logs_collection.insert_one(log_entry)

@router.get("/{problem_id}/activity")
async def get_activity(problem_id: str):
    cursor = activity_logs_collection.find({"problem_id": problem_id}).sort("timestamp", -1)
    logs = await cursor.to_list(length=100)
    for l in logs:
        l["_id"] = str(l["_id"])
    return logs

@router.post("/{problem_id}/delete")
async def delete_problem(problem_id: str, req: DeleteRequest, user: dict = Depends(get_current_user_optional)):
    performer = user["name"] if user else "System Admin"
    
    # Check signal_problems first
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        await signal_problems_collection.update_one(
            {"id": problem_id},
            {"$set": {"deleted": True, "deletion_reason": req.reason, "status": "Deleted", "last_updated": datetime.datetime.utcnow()}}
        )
    else:
        # Check news_articles
        a = await news_articles_collection.find_one({"id": problem_id})
        if a:
            await news_articles_collection.update_one(
                {"id": problem_id},
                {"$set": {"deleted": True, "deletion_reason": req.reason, "status": "Deleted", "last_updated": datetime.datetime.utcnow()}}
            )
        else:
            raise HTTPException(status_code=404, detail="Problem not found")

    await log_activity(problem_id, "Deleted", performer, f"Reason: {req.reason}")
    return {"success": True, "status": "Deleted"}

@router.post("/{problem_id}/assign")
async def assign_problem(problem_id: str, req: AssignRequest, user: dict = Depends(get_current_user_optional)):
    performer = user["name"] if user else "System"
    
    update_data = {
        "assigned_to": req.assignee_id,
        "assigned_name": req.assignee_name,
        "status": "In Progress",
        "progress": 0,
        "assigned_at": datetime.datetime.utcnow(),
        "last_updated": datetime.datetime.utcnow()
    }
    
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        await signal_problems_collection.update_one({"id": problem_id}, {"$set": update_data})
    else:
        a = await news_articles_collection.find_one({"id": problem_id})
        if a:
            await news_articles_collection.update_one({"id": problem_id}, {"$set": update_data})
        else:
            raise HTTPException(status_code=404, detail="Problem not found")

    await log_activity(problem_id, "Assigned", performer, f"Assigned to {req.assignee_name}")
    return {"success": True, "status": "In Progress"}

@router.post("/{problem_id}/progress")
async def update_progress(problem_id: str, req: ProgressRequest, user: dict = Depends(get_current_user_optional)):
    performer = user["name"] if user else "System"
    
    status = "In Progress"
    if req.progress >= 100:
        status = "Resolved"
        req.progress = 100
        
    update_data = {
        "progress": req.progress,
        "status": status,
        "last_updated": datetime.datetime.utcnow()
    }
    if status == "Resolved":
        update_data["resolved_at"] = datetime.datetime.utcnow()
        update_data["resolved_by"] = performer
        
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        await signal_problems_collection.update_one({"id": problem_id}, {"$set": update_data})
    else:
        a = await news_articles_collection.find_one({"id": problem_id})
        if a:
            await news_articles_collection.update_one({"id": problem_id}, {"$set": update_data})

    action = "Resolved" if status == "Resolved" else "Progress Updated"
    await log_activity(problem_id, action, performer, f"Progress set to {req.progress}%")
    return {"success": True, "progress": req.progress, "status": status}

@router.post("/{problem_id}/notes")
async def add_note(problem_id: str, req: NoteRequest, user: dict = Depends(get_current_user_optional)):
    performer = user["name"] if user else "System"
    await log_activity(problem_id, "Note Added", performer, req.note)
    return {"success": True}

@router.post("/{problem_id}/invite")
async def invite_leader(problem_id: str, req: InviteRequest, user: dict = Depends(get_current_user_optional)):
    performer = user["name"] if user else "System Admin"
    await log_activity(problem_id, "Leader Invited", performer, f"Invited Department Leader Account ID: {req.account_id} to collaborate")
    return {"success": True}

@router.post("/{problem_id}/escalate")
async def escalate_problem(problem_id: str, req: EscalateRequest, user: dict = Depends(get_current_user_optional)):
    performer = user["name"] if user else "System"
    
    # Increase priority mathematically
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        new_score = min(100, p.get("priority_score", 50) + 20)
        await signal_problems_collection.update_one({"id": problem_id}, {"$set": {"priority_score": new_score, "severity": "CRITICAL"}})
    else:
        a = await news_articles_collection.find_one({"id": problem_id})
        if a:
            new_score = min(100, a.get("risk_score", 50) + 20)
            await news_articles_collection.update_one({"id": problem_id}, {"$set": {"risk_score": new_score, "risk_level": "CRITICAL"}})

    await log_activity(problem_id, "Escalated", performer, f"Reason: {req.reason}")
    return {"success": True}

@router.get("/working")
async def get_working_problems(user: dict = Depends(get_current_user_optional)):
    # Returns problems assigned to current user, or all in_progress if no auth
    q_sig = {"status": "In Progress", "deleted": {"$ne": True}}
    q_news = {"status": "In Progress", "deleted": {"$ne": True}}
    
    # In a real system we'd filter by assignee_id == user["uid"], but for this demo 
    # we allow seeing all "Working Problems" to show functionality.
    
    results = []
    
    async for p in signal_problems_collection.find(q_sig).sort("last_updated", -1).limit(50):
        results.append({
            "id": p["id"],
            "title": p.get("title", ""),
            "severity": p.get("severity", "Medium").capitalize(),
            "category": p.get("category", "General"),
            "location": p.get("location_detail") or p.get("location") or "Unknown",
            "detectedAt": p.get("detected_at"),
            "priorityScore": p.get("priority_score", 50),
            "frequency": p.get("frequency", 1),
            "status": p.get("status", "In Progress"),
            "progress": p.get("progress", 0),
            "assignedName": p.get("assigned_name", "Unknown"),
            "assignedTo": p.get("assigned_to", "demo-user-id"),
            "ownerId": p.get("owner_id", p.get("assigned_to", "demo-user-id")),
            "collaborators": p.get("collaborators", []),
            "invitedBy": p.get("invited_by", "System Admin"),
            "source": "Citizen Application"
        })
        
    async for a in news_articles_collection.find(q_news).sort("ingested_at", -1).limit(50):
        results.append({
            "id": a["id"],
            "title": a.get("title", ""),
            "severity": a.get("risk_level", "Medium").capitalize(),
            "category": a.get("category", "General"),
            "location": a.get("city") or "Unknown",
            "detectedAt": a.get("ingested_at"),
            "priorityScore": a.get("risk_score", 50),
            "frequency": 1,
            "status": a.get("status", "In Progress"),
            "progress": a.get("progress", 0),
            "assignedName": a.get("assigned_name", "Unknown"),
            "assignedTo": a.get("assigned_to", "demo-user-id"),
            "ownerId": a.get("owner_id", a.get("assigned_to", "demo-user-id")),
            "collaborators": a.get("collaborators", []),
            "invitedBy": a.get("invited_by", "System Admin"),
            "source": "Automated Scanner"
        })
        
    return sorted(results, key=lambda x: x.get("priorityScore", 0), reverse=True)
