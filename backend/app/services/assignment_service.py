import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from ..mongodb import (
    users_collection,
    jurisdictions_collection,
    problem_assignments_collection,
    governance_problems_collection
)
from ..utils import gen_uuid

logger = logging.getLogger("jannetra.assignment")

async def get_descendant_jurisdictions(jurisdiction_id: str) -> List[str]:
    """
    Recursively fetch all sub-jurisdiction IDs (descendants) of a given jurisdiction.
    """
    if not jurisdiction_id:
        return []
        
    descendants = [jurisdiction_id]
    to_check = [jurisdiction_id]
    
    while to_check:
        cursor = jurisdictions_collection.find({
            "parent_id": {"$in": to_check},
            "is_active": True
        })
        children = await cursor.to_list(length=100)
        if not children:
            break
        child_ids = [c["id"] for c in children]
        # Prevent infinite loops in case of circular references
        new_child_ids = [cid for cid in child_ids if cid not in descendants]
        if not new_child_ids:
            break
        descendants.extend(new_child_ids)
        to_check = new_child_ids
        
    return descendants


async def search_eligible_assignees(current_user: Dict[str, Any], query_str: str) -> List[Dict[str, Any]]:
    """
    Search users eligible for assignment by name, username, or phone.
    Enforces that the current user can only see users inside their administrative jurisdiction.
    """
    user_role = (current_user.get("role") or "").upper()
    user_jur_id = current_user.get("jurisdiction_id")

    # Base match: active non-citizen users
    match = {
        "role": {"$ne": "CITIZEN"},
        "is_active": True
    }

    # Apply jurisdiction restrictions if not global Admin
    if user_role != "ADMIN":
        if not user_jur_id:
            # If user has no jurisdiction and is not admin, they can't assign to anyone
            return []
            
        allowed_jurs = await get_descendant_jurisdictions(user_jur_id)
        match["jurisdiction_id"] = {"$in": allowed_jurs}

    # Add text search conditions (name, username, phone)
    if query_str:
        q = str(query_str).strip()
        match["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"phone_number": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ]

    users = []
    cursor = users_collection.find(match).limit(20)
    async for u in cursor:
        users.append({
            "id": u["id"],
            "name": u["name"],
            "username": u.get("username"),
            "email": u.get("email"),
            "phone": u.get("phone") or u.get("phone_number"),
            "role": u["role"],
            "organization_id": u.get("organization_id"),
            "jurisdiction_id": u.get("jurisdiction_id"),
            "is_active": u["is_active"]
        })
        
    return users


async def create_assignment(
    problem_id: str,
    assigned_by_user_id: str,
    assigned_to_user_id: Optional[str],
    assigned_to_organization_id: Optional[str],
    assigned_to_jurisdiction_id: Optional[str],
    assignment_type: str,  # USER | ORGANIZATION | DEPARTMENT | JURISDICTION
    reason: Optional[str] = None,
    due_days: int = 2  # default SLA
) -> Dict[str, Any]:
    """
    Creates a new problem assignment record and schedules the due date.
    """
    assignment_id = gen_uuid()
    now = datetime.utcnow()
    due_at = datetime.utcnow() + timedelta(days=due_days) if due_days else None

    # Calculate due date
    from datetime import timedelta
    due_at = now + timedelta(days=due_days)

    assignment = {
        "assignment_id": assignment_id,
        "problem_id": problem_id,
        "assigned_by": assigned_by_user_id,
        "assigned_to_user_id": assigned_to_user_id,
        "assigned_to_organization_id": assigned_to_organization_id,
        "assigned_to_jurisdiction_id": assigned_to_jurisdiction_id,
        "assignment_type": assignment_type,
        "reason": reason,
        "assigned_at": now,
        "accepted_at": None,
        "due_at": due_at,
        "status": "PENDING"
    }

    await problem_assignments_collection.insert_one(assignment)
    return assignment
