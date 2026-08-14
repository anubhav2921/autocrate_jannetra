import logging
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import HTTPException
from ..mongodb import governance_problems_collection, problem_history_collection
from ..utils import gen_uuid

logger = logging.getLogger("jannetra.workflow")

# Valid state transition map: old_status -> allowed new_statuses
VALID_TRANSITIONS: Dict[str, list] = {
    "DETECTED": ["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "CANCELLED"],
    "PENDING_VERIFICATION": ["VERIFIED", "REJECTED", "CANCELLED"],
    "VERIFIED": ["ROUTED", "ASSIGNED", "CANCELLED"],
    "ROUTED": ["ASSIGNED", "REASSIGNED", "CANCELLED"],
    "ASSIGNED": ["ACCEPTED", "REASSIGNED", "CANCELLED", "ESCALATED"],
    "ACCEPTED": ["IN_PROGRESS", "REASSIGNED", "CANCELLED", "ESCALATED"],
    "IN_PROGRESS": ["RESOLUTION_SUBMITTED", "REASSIGNED", "CANCELLED", "ESCALATED"],
    "RESOLUTION_SUBMITTED": ["UNDER_VERIFICATION", "RESOLVED", "IN_PROGRESS"],
    "UNDER_VERIFICATION": ["RESOLVED", "IN_PROGRESS"],
    "RESOLVED": ["IN_PROGRESS"],  # Allow reopening explicitly
    "REJECTED": ["PENDING_VERIFICATION"],
    "ESCALATED": ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "RESOLUTION_SUBMITTED", "RESOLVED", "REASSIGNED", "CANCELLED"],
    "REASSIGNED": ["ACCEPTED", "CANCELLED", "ESCALATED"],
    "CANCELLED": []
}

async def log_history_record(
    problem_id: str,
    actor_id: str,
    actor_role: str,
    action: str,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    previous_owner: Optional[str] = None,
    new_owner: Optional[str] = None,
    remarks: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> str:
    """
    Appends an immutable record to the problem history log.
    """
    history_id = gen_uuid()
    record = {
        "history_id": history_id,
        "problem_id": problem_id,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "action": action,
        "old_status": old_status,
        "new_status": new_status,
        "previous_owner": previous_owner,
        "new_owner": new_owner,
        "remarks": remarks,
        "timestamp": datetime.utcnow(),
        "metadata": metadata or {}
    }
    await problem_history_collection.insert_one(record)
    return history_id


async def transition_problem_status(
    problem_id: str,
    new_status: str,
    actor: Dict[str, Any],
    remarks: Optional[str] = None,
    additional_updates: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Validates transition, performs the update, and logs the history.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail=f"Governance Problem {problem_id} not found.")

    current_status = problem.get("status", "DETECTED").upper()
    target_status = new_status.upper()

    # If status is the same, no-op
    if current_status == target_status:
        return problem

    # Validate state transition rules
    allowed = VALID_TRANSITIONS.get(current_status, [])
    # Case-insensitive compatibility
    allowed_upper = [a.upper() for a in allowed]
    
    # Exceptions/Overrides: Admin can bypass transitions, or if the current status is not in transitions map
    if actor.get("role") != "ADMIN" and target_status not in allowed_upper:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {current_status} to {target_status}."
        )

    # Perform updates
    now = datetime.utcnow()
    update_fields = {
        "status": target_status,
        "updated_at": now
    }

    # Contextual updates depending on state
    if target_status == "VERIFIED":
        update_fields["verified_by"] = actor["id"]
        update_fields["verified_at"] = now
    elif target_status == "ACCEPTED":
        update_fields["accepted_at"] = now
        update_fields["accepted_by"] = actor["id"]
    elif target_status == "IN_PROGRESS":
        if not problem.get("started_at"):
            update_fields["started_at"] = now
    elif target_status == "RESOLVED":
        update_fields["resolved_at"] = now
        update_fields["verified_at"] = now

    if additional_updates:
        update_fields.update(additional_updates)

    await governance_problems_collection.update_one(
        {"problem_id": problem_id},
        {"$set": update_fields}
    )

    # Fetch updated problem
    updated_problem = await governance_problems_collection.find_one({"problem_id": problem_id})

    # Log history
    await log_history_record(
        problem_id=problem_id,
        actor_id=actor["id"],
        actor_role=actor["role"],
        action=f"Transition to {target_status}",
        old_status=current_status,
        new_status=target_status,
        previous_owner=problem.get("current_owner_user_id"),
        new_owner=updated_problem.get("current_owner_user_id"),
        remarks=remarks
    )

    return updated_problem
