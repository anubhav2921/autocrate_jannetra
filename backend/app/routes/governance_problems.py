import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel

from ..mongodb import (
    governance_problems_collection,
    organizations_collection,
    jurisdictions_collection,
    problem_history_collection,
    escalations_collection,
    signal_problems_collection,
    articles_collection,
    notifications_collection,
    users_collection
)
from ..utils import get_current_user, gen_uuid, serialize_doc, serialize_docs
from ..services.routing_service import get_routing_recommendation, resolve_hierarchical_location
from ..services.assignment_service import search_eligible_assignees, get_descendant_jurisdictions, create_assignment
from ..services.workflow_service import transition_problem_status, log_history_record
from ..services.escalation_service import escalate_problem_manually
from ..services.sla_service import calculate_due_date
from ..services.notification_service import create_system_notification, get_unread_notifications, mark_notification_as_read

logger = logging.getLogger("jannetra.routes.problems")

router = APIRouter(prefix="/api", tags=["Governance Problems"])


# ==========================================
# PYDANTIC SCHEMAS FOR API INPUTS
# ==========================================
class CreateDirectProblemRequest(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "MEDIUM"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    source_signal_id: Optional[str] = None
    source_citizen_report_id: Optional[str] = None

class VerifyProblemRequest(BaseModel):
    priority: Optional[str] = "MEDIUM"
    remarks: Optional[str] = None

class AssignProblemRequest(BaseModel):
    assigned_to_user_id: Optional[str] = None
    assigned_to_organization_id: Optional[str] = None
    assigned_to_jurisdiction_id: Optional[str] = None
    reason: Optional[str] = None
    priority: Optional[str] = None
    due_days: Optional[int] = 2

class ResolveProblemRequest(BaseModel):
    resolution_summary: str
    evidence_url: Optional[str] = None

class VerifyResolutionRequest(BaseModel):
    approved: bool
    remarks: Optional[str] = None

class EscalateProblemRequest(BaseModel):
    reason: str


# ==========================================
# HELPER FOR SECURITY JURISDICTION CHECK
# ==========================================
async def enforce_problem_jurisdiction_access(problem: dict, current_user: dict):
    """
    Enforces that non-admin government officers can only access problems
    located in their assigned jurisdiction or its descendants.
    """
    user_role = (current_user.get("role") or "").upper()
    user_jur_id = current_user.get("jurisdiction_id")
    problem_jur_id = problem.get("jurisdiction_id")

    if user_role == "ADMIN":
        return

    if user_role == "CITIZEN":
        # Citizens can only view problems they created
        if problem.get("created_by") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access Denied. You did not create this problem.")
        return

    # Official roles check
    if not user_jur_id:
        raise HTTPException(status_code=403, detail="Access Denied. No jurisdiction assigned to your account.")

    # Get descendants
    allowed_jurs = await get_descendant_jurisdictions(user_jur_id)
    if problem_jur_id not in allowed_jurs:
        raise HTTPException(
            status_code=403,
            detail="Access Denied. Problem is outside your authorized administrative jurisdiction."
        )


# ==========================================
# ENDPOINTS
# ==========================================

@router.post("/problems")
async def create_governance_problem(
    req: CreateDirectProblemRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Directly creates an officially actionable Government Problem.
    Resolves location administrative hierarchy automatically.
    """
    loc_details = {
        "latitude": req.latitude,
        "longitude": req.longitude,
        "address": req.address
    }
    
    # Geocode administrative fields
    geo_h = resolve_hierarchical_location(req.latitude, req.longitude, req.address)
    loc_details.update(geo_h)

    # Resolve jurisdiction ID based on resolved administrative boundaries
    resolved_jur = None
    search_tiers = [
        ("village", "VILLAGE"),
        ("ward", "WARD"),
        ("panchayat", "PANCHAYAT"),
        ("municipality", "MUNICIPALITY"),
        ("block", "BLOCK"),
        ("district", "DISTRICT"),
        ("state", "STATE")
    ]
    for field, level in search_tiers:
        val = loc_details.get(field)
        if val:
            db_j = await jurisdictions_collection.find_one({"name": val, "level": level, "is_active": True})
            if db_j:
                resolved_jur = db_j
                break

    # Calculate SLA due date
    now = datetime.utcnow()
    from .sla_service import calculate_due_date
    due_at = await calculate_due_date(req.priority, now)

    # Determine default organization matching jurisdiction
    org_id = None
    if resolved_jur:
        org = await organizations_collection.find_one({"jurisdiction_id": resolved_jur["id"], "is_active": True})
        if org:
            org_id = org["id"]

    problem_id = f"GP-{gen_uuid()[:8].upper()}"
    problem_doc = {
        "problem_id": problem_id,
        "source_signal_id": req.source_signal_id,
        "source_citizen_report_id": req.source_citizen_report_id,
        "title": req.title,
        "description": req.description,
        "category": req.category,
        "subcategory": None,
        "priority": req.priority.upper(),
        "severity": req.priority.upper(),
        "status": "VERIFIED" if req.source_signal_id or req.source_citizen_report_id else "DETECTED",
        "location": loc_details,
        "department_id": None,
        "organization_id": org_id,
        "jurisdiction_id": resolved_jur["id"] if resolved_jur else None,
        "created_by": current_user["id"],
        "verified_by": current_user["id"] if (req.source_signal_id or req.source_citizen_report_id) else None,
        "current_owner_user_id": None,
        "current_owner_organization_id": org_id,
        "created_at": now,
        "updated_at": now,
        "assigned_at": None,
        "accepted_at": None,
        "started_at": None,
        "due_at": due_at,
        "resolved_at": None,
        "verified_at": None,
        "resolution_summary": None
    }

    await governance_problems_collection.insert_one(problem_doc)

    # Log in immutable history
    await log_history_record(
        problem_id=problem_id,
        actor_id=current_user["id"],
        actor_role=current_user["role"],
        action="Created",
        old_status=None,
        new_status=problem_doc["status"],
        remarks="Problem registered in official governance database."
    )

    return serialize_doc(problem_doc)


@router.get("/problems")
async def list_governance_problems(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns governance problems.
    Enforces role + organization + jurisdiction level access control.
    """
    user_role = (current_user.get("role") or "").upper()
    user_jur_id = current_user.get("jurisdiction_id")

    query: Dict[str, Any] = {}

    # Enforce Jurisdiction Filters
    if user_role == "CITIZEN":
        query["created_by"] = current_user["id"]
    elif user_role != "ADMIN":
        if not user_jur_id:
            return []  # Secure by default
        allowed_jurs = await get_descendant_jurisdictions(user_jur_id)
        query["jurisdiction_id"] = {"$in": allowed_jurs}

    # Query params filters
    if status:
        query["status"] = status.upper()
    if priority:
        query["priority"] = priority.upper()
    if department_id:
        query["department_id"] = department_id

    cursor = governance_problems_collection.find(query).sort("created_at", -1)
    problems = await cursor.to_list(length=100)
    return serialize_docs(problems)


@router.get("/problems/{problem_id}")
async def get_governance_problem(
    problem_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Detail view of a governance problem. Enforces jurisdiction access.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found.")

    await enforce_problem_jurisdiction_access(problem, current_user)
    return serialize_doc(problem)


@router.post("/problems/{problem_id}/verify")
async def verify_governance_problem(
    problem_id: str,
    req: VerifyProblemRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifies a pending detected problem and registers it as verified.
    Can be used to escalate AI signal problems (e.g. SIG-XXXXXX) or citizen reports (e.g. CR-XXXXXX).
    """
    user_role = (current_user.get("role") or "").upper()
    # Check permissions
    if user_role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens are not authorized to verify problems.")

    # 1. Check if GovernanceProblem already exists
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    
    # 2. If it does not exist, check if it exists in Signal Problems or Citizen Reports collections
    if not problem:
        signal_data = await signal_problems_collection.find_one({"id": problem_id})
        
        # Build direct copy model from SignalProblem
        if signal_data:
            # Resolve geocode
            geo_h = resolve_hierarchical_location(None, None, signal_data.get("location"))
            loc = {
                "latitude": signal_data.get("latitude"),
                "longitude": signal_data.get("longitude"),
                "address": signal_data.get("location"),
                **geo_h
            }
            # Find jurisdiction
            resolved_jur = None
            for f, l in [("village", "VILLAGE"), ("ward", "WARD"), ("panchayat", "PANCHAYAT"), ("municipality", "MUNICIPALITY"), ("block", "BLOCK"), ("district", "DISTRICT"), ("state", "STATE")]:
                val = loc.get(f)
                if val:
                    db_j = await jurisdictions_collection.find_one({"name": val, "level": l, "is_active": True})
                    if db_j:
                        resolved_jur = db_j
                        break

            now = datetime.utcnow()
            due_at = await calculate_due_date(req.priority or "MEDIUM", now)
            
            # Create Governance Problem
            problem = {
                "problem_id": problem_id,
                "source_signal_id": problem_id,
                "source_citizen_report_id": None,
                "title": signal_data.get("title", "AI Signal Issue"),
                "description": signal_data.get("description", ""),
                "category": signal_data.get("category", "General"),
                "subcategory": None,
                "priority": (req.priority or "MEDIUM").upper(),
                "severity": (req.priority or "MEDIUM").upper(),
                "status": "VERIFIED",
                "location": loc,
                "department_id": signal_data.get("department"),
                "organization_id": None,
                "jurisdiction_id": resolved_jur["id"] if resolved_jur else None,
                "created_by": current_user["id"],
                "verified_by": current_user["id"],
                "current_owner_user_id": None,
                "current_owner_organization_id": None,
                "created_at": now,
                "updated_at": now,
                "due_at": due_at
            }
            await governance_problems_collection.insert_one(problem)
            
            # Update source signal problem status
            await signal_problems_collection.update_one({"id": problem_id}, {"$set": {"status": "Verified"}})
            
            await log_history_record(
                problem_id=problem_id,
                actor_id=current_user["id"],
                actor_role=current_user["role"],
                action="Verified",
                old_status="DETECTED",
                new_status="VERIFIED",
                remarks=req.remarks or "AI Signal Problem promoted to official governance database."
            )
            return serialize_doc(problem)
            
        else:
            raise HTTPException(status_code=404, detail="Source Problem/Signal not found.")

    # 3. If GovernanceProblem already exists in DETECTED status, transition it
    await enforce_problem_jurisdiction_access(problem, current_user)
    updated = await transition_problem_status(
        problem_id=problem_id,
        new_status="VERIFIED",
        actor=current_user,
        remarks=req.remarks or "Verified by authority."
    )
    return serialize_doc(updated)


@router.get("/problems/{problem_id}/routing-recommendation")
async def get_problem_routing_recommendation(
    problem_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyzes problem category and geocodes metadata to recommend organizations and officers.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        # Check signal problems fallback for routing recommend on unverified items
        problem = await signal_problems_collection.find_one({"id": problem_id})
        if not problem:
            raise HTTPException(status_code=404, detail="Problem/Signal not found.")
        # Mock dictionary to calculate routing recommendation
        problem = {
            "category": problem.get("category", "General"),
            "location": {
                "latitude": problem.get("latitude"),
                "longitude": problem.get("longitude"),
                "address": problem.get("location")
            }
        }
    
    rec = await get_routing_recommendation(
        category=problem.get("category"),
        subcategory=problem.get("subcategory"),
        location=problem.get("location", {})
    )
    return rec


@router.post("/problems/{problem_id}/assign")
async def assign_governance_problem(
    problem_id: str,
    req: AssignProblemRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Assigns the problem to an organization, jurisdiction, and/or specific user.
    Calculates the due date based on SLA config.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found.")

    await enforce_problem_jurisdiction_access(problem, current_user)
    
    user_role = (current_user.get("role") or "").upper()
    if user_role not in ["ADMIN", "MUNICIPAL_OFFICER", "BLOCK_OFFICER", "DISTRICT_OFFICER", "STATE_OFFICER"]:
        raise HTTPException(status_code=403, detail="You do not have assignment permissions.")

    now = datetime.utcnow()
    priority = (req.priority or problem.get("priority", "MEDIUM")).upper()
    
    from .sla_service import calculate_due_date
    due_at = await calculate_due_date(priority, now)

    # Perform assignment
    assignment = await create_assignment(
        problem_id=problem_id,
        assigned_by_user_id=current_user["id"],
        assigned_to_user_id=req.assigned_to_user_id,
        assigned_to_organization_id=req.assigned_to_organization_id,
        assigned_to_jurisdiction_id=req.assigned_to_jurisdiction_id,
        assignment_type="USER" if req.assigned_to_user_id else "ORGANIZATION",
        reason=req.reason,
        due_days=req.due_days
    )

    updates = {
        "current_owner_user_id": req.assigned_to_user_id,
        "current_owner_organization_id": req.assigned_to_organization_id,
        "jurisdiction_id": req.assigned_to_jurisdiction_id or problem.get("jurisdiction_id"),
        "assigned_at": now,
        "due_at": due_at,
        "priority": priority,
        "severity": priority
    }

    updated_problem = await transition_problem_status(
        problem_id=problem_id,
        new_status="ASSIGNED",
        actor=current_user,
        remarks=f"Problem assigned. Reason: {req.reason}",
        additional_updates=updates
    )

    # In-app Notification
    if req.assigned_to_user_id:
        await create_system_notification(
            user_id=req.assigned_to_user_id,
            title="📥 New Problem Assignment",
            message=f"You have been assigned to solve problem: '{problem['title']}'. Due at: {due_at.strftime('%Y-%m-%d %H:%M')}",
            problem_id=problem_id
        )

    return {
        "success": True,
        "problem": serialize_doc(updated_problem),
        "assignment": serialize_doc(assignment)
    }


@router.get("/problems/{problem_id}/eligible-assignees")
async def get_eligible_assignees(
    problem_id: str,
    search: Optional[str] = Query(""),
    current_user: dict = Depends(get_current_user)
):
    """
    Search endpoint for eligible officials for routing assignment.
    Restricts results to authorized jurisdiction sub-trees.
    """
    # Enforce basic authorization check
    user_role = (current_user.get("role") or "").upper()
    if user_role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens cannot search assignees.")

    users = await search_eligible_assignees(current_user, search)
    return users


@router.post("/problems/{problem_id}/accept")
async def accept_governance_problem(
    problem_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Changes status to ACCEPTED. Owner indicates they will resolve it.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found.")

    if problem.get("current_owner_user_id") != current_user["id"] and current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only the assigned officer can accept the problem.")

    updated = await transition_problem_status(
        problem_id=problem_id,
        new_status="ACCEPTED",
        actor=current_user,
        remarks="Problem accepted by assignee."
    )
    return serialize_doc(updated)


@router.post("/problems/{problem_id}/start")
async def start_governance_problem(
    problem_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Transitions problem status to IN_PROGRESS.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found.")

    if problem.get("current_owner_user_id") != current_user["id"] and current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only the assigned officer can start work.")

    updated = await transition_problem_status(
        problem_id=problem_id,
        new_status="IN_PROGRESS",
        actor=current_user,
        remarks="Work in progress initiated."
    )
    return serialize_doc(updated)



# Wait, let's write it fully!
@router.post("/problems/{problem_id}/resolve")
async def resolve_governance_problem(
    problem_id: str,
    req: ResolveProblemRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a resolution details sheet. Transitions to RESOLUTION_SUBMITTED.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found.")

    if problem.get("current_owner_user_id") != current_user["id"] and current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only the assigned officer can submit a resolution.")

    updates = {
        "resolution_summary": req.resolution_summary,
        "evidence_url": req.evidence_url,
        "resolved_at": datetime.utcnow()
    }

    updated = await transition_problem_status(
        problem_id=problem_id,
        new_status="RESOLUTION_SUBMITTED",
        actor=current_user,
        remarks=f"Resolution submitted. Summary: {req.resolution_summary}",
        additional_updates=updates
    )

    # Notify Supervisor or Creator
    if problem.get("created_by"):
        await create_system_notification(
            user_id=problem["created_by"],
            title="✅ Resolution Submitted",
            message=f"The assigned official has submitted a resolution for: '{problem['title']}'. Needs verification.",
            problem_id=problem_id
        )

    return serialize_doc(updated)


@router.post("/problems/{problem_id}/verify-resolution")
async def verify_governance_problem_resolution(
    problem_id: str,
    req: VerifyResolutionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifies the resolution of a problem.
    Rejects the resolution back to IN_PROGRESS if approved=False.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found.")

    # Rule: The person who submitted the resolution must not verify it
    if problem.get("current_owner_user_id") == current_user["id"] and current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=400,
            detail="Independent verification required. You cannot verify a resolution you submitted."
        )

    # Access checks
    await enforce_problem_jurisdiction_access(problem, current_user)

    target_status = "RESOLVED" if req.approved else "IN_PROGRESS"
    remarks = req.remarks or ("Resolution approved." if req.approved else "Resolution rejected. Reopened.")

    updates = {
        "verified_at": datetime.utcnow() if req.approved else None,
        "verified_by": current_user["id"] if req.approved else None
    }

    updated = await transition_problem_status(
        problem_id=problem_id,
        new_status=target_status,
        actor=current_user,
        remarks=remarks,
        additional_updates=updates
    )

    # Notify resolver
    resolver_id = problem.get("current_owner_user_id")
    if resolver_id:
        title = "🎉 Resolution Verified & Closed" if req.approved else "⚠️ Resolution Rejected"
        msg = f"Your resolution for '{problem['title']}' was approved by supervisor." if req.approved else f"Your resolution for '{problem['title']}' was rejected: {remarks}"
        await create_system_notification(
            user_id=resolver_id,
            title=title,
            message=msg,
            problem_id=problem_id
        )

    return serialize_doc(updated)


@router.post("/problems/{problem_id}/escalate")
async def manual_escalate_problem(
    problem_id: str,
    req: EscalateProblemRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually escalates the problem to a supervisor.
    """
    try:
        updated = await escalate_problem_manually(problem_id, current_user, req.reason)
        return serialize_doc(updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/problems/{problem_id}/reassign")
async def reassign_governance_problem(
    problem_id: str,
    req: AssignProblemRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Reassigns problem to a different user/organization.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found.")

    await enforce_problem_jurisdiction_access(problem, current_user)

    user_role = (current_user.get("role") or "").upper()
    if user_role not in ["ADMIN", "MUNICIPAL_OFFICER", "BLOCK_OFFICER", "DISTRICT_OFFICER", "STATE_OFFICER"]:
        raise HTTPException(status_code=403, detail="You do not have reassignment privileges.")

    now = datetime.utcnow()
    updates = {
        "current_owner_user_id": req.assigned_to_user_id,
        "current_owner_organization_id": req.assigned_to_organization_id,
        "jurisdiction_id": req.assigned_to_jurisdiction_id or problem.get("jurisdiction_id"),
        "updated_at": now
    }

    updated = await transition_problem_status(
        problem_id=problem_id,
        new_status="REASSIGNED",
        actor=current_user,
        remarks=f"Reassigned. Reason: {req.reason}",
        additional_updates=updates
    )

    return serialize_doc(updated)


@router.get("/problems/{problem_id}/history")
async def get_problem_history(
    problem_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Gets the history timeline logs for a specific problem.
    """
    cursor = problem_history_collection.find({"problem_id": problem_id}).sort("timestamp", 1)
    history = await cursor.to_list(length=100)
    return serialize_docs(history)


@router.get("/organizations")
async def list_organizations():
    """
    Lists all administrative organizations in the database.
    """
    cursor = organizations_collection.find({"is_active": True})
    orgs = await cursor.to_list(length=100)
    return serialize_docs(orgs)


@router.get("/organizations/{organization_id}")
async def get_organization(organization_id: str):
    org = await organizations_collection.find_one({"id": organization_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    return serialize_doc(org)


@router.get("/jurisdictions")
async def list_jurisdictions():
    """
    Lists all geolocated administrative jurisdictions.
    """
    cursor = jurisdictions_collection.find({"is_active": True})
    jurs = await cursor.to_list(length=100)
    return serialize_docs(jurs)


@router.get("/escalations")
async def list_active_escalations(
    current_user: dict = Depends(get_current_user)
):
    """
    Lists active escalations. Officials see escalations scoped to their jurisdictions.
    """
    user_role = (current_user.get("role") or "").upper()
    user_jur_id = current_user.get("jurisdiction_id")

    query: Dict[str, Any] = {"status": "PENDING"}

    if user_role != "ADMIN":
        if not user_jur_id:
            return []
        allowed_jurs = await get_descendant_jurisdictions(user_jur_id)
        # Find problem IDs that belong to these jurisdictions
        problems_cursor = governance_problems_collection.find({"jurisdiction_id": {"$in": allowed_jurs}}, {"problem_id": 1})
        problem_ids = [p["problem_id"] for p in await problems_cursor.to_list(length=500)]
        query["problem_id"] = {"$in": problem_ids}

    cursor = escalations_collection.find(query).sort("escalated_at", -1)
    docs = await cursor.to_list(length=100)
    
    # Enrich docs with problem details for display convenience
    enriched = []
    for doc in docs:
        p = await governance_problems_collection.find_one({"problem_id": doc["problem_id"]})
        if p:
            doc["problem_title"] = p.get("title")
            doc["priority"] = p.get("priority")
            doc["due_at"] = p.get("due_at").isoformat() if isinstance(p.get("due_at"), datetime) else p.get("due_at")
        enriched.append(serialize_doc(doc))
        
    return enriched


@router.get("/notifications")
async def get_notifications(
    current_user: dict = Depends(get_current_user)
):
    """
    Get unread notifications for logged in user.
    """
    notifications = await get_unread_notifications(current_user["id"])
    return notifications


@router.post("/notifications/{notification_id}/read")
async def read_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a notification as read.
    """
    success = await mark_notification_as_read(notification_id)
    return {"success": success}
