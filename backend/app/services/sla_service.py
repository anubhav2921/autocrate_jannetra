import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from ..mongodb import sla_configs_collection, governance_problems_collection

logger = logging.getLogger("jannetra.sla")

DEFAULT_SLAS = {
    "LOW": 72,       # hours
    "MEDIUM": 48,    # hours
    "HIGH": 24,      # hours
    "CRITICAL": 12   # hours
}

async def get_sla_duration_hours(priority: str) -> int:
    """
    Get the configured SLA duration for a priority level, falling back to defaults.
    """
    p_upper = str(priority).upper()
    config = await sla_configs_collection.find_one({"priority": p_upper})
    if config:
        return config.get("duration_hours", DEFAULT_SLAS.get(p_upper, 48))
    return DEFAULT_SLAS.get(p_upper, 48)


async def calculate_due_date(priority: str, start_time: datetime) -> datetime:
    """
    Computes due date from start time based on SLA config.
    """
    hours = await get_sla_duration_hours(priority)
    return start_time + timedelta(hours=hours)


async def check_for_sla_breaches() -> int:
    """
    Checks all pending and active governance problems for SLA breaches.
    Triggers automatic escalations for breached problems.
    Returns count of newly escalated problems.
    """
    now = datetime.utcnow()
    
    # Active statuses that are subject to SLA breaches
    active_statuses = ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "ROUTED"]
    
    # Find problems that are past their due date and not resolved/cancelled
    cursor = governance_problems_collection.find({
        "status": {"$in": active_statuses},
        "due_at": {"$lt": now}
    })
    
    breached_problems = await cursor.to_list(length=100)
    if not breached_problems:
        return 0
        
    logger.info(f"Found {len(breached_problems)} problems with SLA breaches. Processing escalations...")
    
    from .escalation_service import escalate_problem_automatically
    escalated_count = 0
    for prob in breached_problems:
        try:
            success = await escalate_problem_automatically(prob)
            if success:
                escalated_count += 1
        except Exception as e:
            logger.error(f"Error escalating problem {prob.get('problem_id')}: {e}")
            
    return escalated_count
