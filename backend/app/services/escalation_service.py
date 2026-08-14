import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from ..mongodb import (
    users_collection,
    jurisdictions_collection,
    governance_problems_collection,
    escalations_collection,
    organizations_collection
)
from .workflow_service import transition_problem_status, log_history_record
from .notification_service import create_system_notification
from ..utils import gen_uuid

logger = logging.getLogger("jannetra.escalation")

ROLE_ESCALATION_HIERARCHY = {
    "PANCHAYAT_OFFICER": "BLOCK_OFFICER",
    "LOCAL_LEADER": "BLOCK_OFFICER",
    "MUNICIPAL_OFFICER": "DISTRICT_OFFICER",
    "BLOCK_OFFICER": "DISTRICT_OFFICER",
    "DISTRICT_OFFICER": "STATE_OFFICER",
    "STATE_OFFICER": "ADMIN",
    "DEPARTMENT_OFFICER": "DISTRICT_OFFICER"
}

async def find_higher_authority(user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Looks up the next administrative authority in the hierarchy for a given official.
    For example: Panchayat P -> Parent Block B -> Find Block Officer for B.
    """
    current_role = user.get("role", "").upper()
    next_role = ROLE_ESCALATION_HIERARCHY.get(current_role, "ADMIN")
    
    current_jur_id = user.get("jurisdiction_id")
    if not current_jur_id:
        # Fall back to any active administrator
        return await users_collection.find_one({"role": "ADMIN", "is_active": True})

    # Look up parent jurisdiction
    current_jur = await jurisdictions_collection.find_one({"id": current_jur_id})
    parent_jur_id = current_jur.get("parent_id") if current_jur else None
    
    # Try finding an officer at the parent jurisdiction level
    if parent_jur_id:
        supervisor = await users_collection.find_one({
            "jurisdiction_id": parent_jur_id,
            "role": next_role,
            "is_active": True
        })
        if supervisor:
            return supervisor
            
    # Fallback: Find any officer matching the next escalated role in the region or district
    supervisor = await users_collection.find_one({
        "role": next_role,
        "is_active": True
    })
    if supervisor:
        return supervisor
        
    # Final fallback: Admin
    return await users_collection.find_one({"role": "ADMIN", "is_active": True})


async def escalate_problem_automatically(problem: Dict[str, Any]) -> bool:
    """
    Triggered when an SLA deadline is breached. Computes the higher authority,
    reassigns ownership, changes status, and writes to escalations log.
    """
    problem_id = problem["problem_id"]
    current_owner_id = problem.get("current_owner_user_id")
    
    owner = None
    if current_owner_id:
        owner = await users_collection.find_one({"id": current_owner_id})
        
    if not owner:
        # If not assigned to a user, escalate using default rules
        owner = {"role": "PANCHAYAT_OFFICER", "jurisdiction_id": problem.get("jurisdiction_id")}

    supervisor = await find_higher_authority(owner)
    if not supervisor:
        logger.warning(f"Could not resolve higher authority to escalate problem {problem_id}")
        return False

    escalation_id = gen_uuid()
    now = datetime.utcnow()

    # Create Escalation document
    escalation = {
        "escalation_id": escalation_id,
        "problem_id": problem_id,
        "escalated_by": "SYSTEM",
        "escalated_from_user_id": current_owner_id,
        "escalated_to_user_id": supervisor["id"],
        "escalated_to_organization_id": supervisor.get("organization_id"),
        "level": int(problem.get("escalation_level", 0)) + 1,
        "reason": "SLA Breach - Automatically Escalated by Scheduler",
        "escalated_at": now,
        "resolved_at": None,
        "status": "PENDING"
    }
    await escalations_collection.insert_one(escalation)

    # Transition the problem status and update ownership
    # We increase the priority when escalated
    current_priority = problem.get("priority", "MEDIUM").upper()
    next_priority = "HIGH"
    if current_priority == "HIGH":
        next_priority = "CRITICAL"
    elif current_priority == "CRITICAL":
        next_priority = "CRITICAL"

    # Extend due date by another SLA round for the next level
    from .sla_service import calculate_due_date
    new_due_at = await calculate_due_date(next_priority, now)

    additional_updates = {
        "current_owner_user_id": supervisor["id"],
        "current_owner_organization_id": supervisor.get("organization_id"),
        "priority": next_priority,
        "severity": next_priority,
        "due_at": new_due_at,
        "escalation_level": escalation["level"],
        "updated_at": now
    }

    # Perform the state transition
    await transition_problem_status(
        problem_id=problem_id,
        new_status="ESCALATED",
        actor={"id": "SYSTEM", "role": "SYSTEM"},
        remarks=f"Auto-escalated to {supervisor['name']} due to SLA breach.",
        additional_updates=additional_updates
    )

    # Send Notification to Supervisor
    await create_system_notification(
        user_id=supervisor["id"],
        title="⚠️ Problem Escalated to You",
        message=f"Problem '{problem['title']}' has been escalated to you due to SLA breach by the previous owner.",
        problem_id=problem_id
    )

    logger.info(f"✅ Problem {problem_id} successfully escalated to {supervisor['name']}")
    return True


async def escalate_problem_manually(
    problem_id: str,
    actor: Dict[str, Any],
    reason: str
) -> Dict[str, Any]:
    """
    Manually escalates a problem to the next authority.
    """
    problem = await governance_problems_collection.find_one({"problem_id": problem_id})
    if not problem:
        raise Exception(f"Problem {problem_id} not found.")

    current_owner_id = problem.get("current_owner_user_id")
    owner = None
    if current_owner_id:
        owner = await users_collection.find_one({"id": current_owner_id})
    if not owner:
        owner = actor

    supervisor = await find_higher_authority(owner)
    if not supervisor:
        raise Exception("Unable to determine higher authority for manual escalation.")

    now = datetime.utcnow()
    escalation_id = gen_uuid()

    escalation = {
        "escalation_id": escalation_id,
        "problem_id": problem_id,
        "escalated_by": actor["id"],
        "escalated_from_user_id": current_owner_id,
        "escalated_to_user_id": supervisor["id"],
        "escalated_to_organization_id": supervisor.get("organization_id"),
        "level": int(problem.get("escalation_level", 0)) + 1,
        "reason": f"Manual Escalation: {reason}",
        "escalated_at": now,
        "resolved_at": None,
        "status": "PENDING"
    }
    await escalations_collection.insert_one(escalation)

    additional_updates = {
        "current_owner_user_id": supervisor["id"],
        "current_owner_organization_id": supervisor.get("organization_id"),
        "escalation_level": escalation["level"],
        "updated_at": now
    }

    updated_problem = await transition_problem_status(
        problem_id=problem_id,
        new_status="ESCALATED",
        actor=actor,
        remarks=f"Manually escalated: {reason}",
        additional_updates=additional_updates
    )

    # Send Notification to Supervisor
    await create_system_notification(
        user_id=supervisor["id"],
        title="⚠️ Manual Problem Escalation",
        message=f"Problem '{problem['title']}' has been manually escalated to you by {actor.get('name')}.",
        problem_id=problem_id
    )

    return updated_problem
