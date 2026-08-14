import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from ..mongodb import notifications_collection
from ..utils import gen_uuid

logger = logging.getLogger("jannetra.notification")

async def create_system_notification(
    user_id: str,
    title: str,
    message: str,
    problem_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates an internal notification for a user.
    """
    notification = {
        "id": gen_uuid(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "problem_id": problem_id,
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    try:
        await notifications_collection.insert_one(notification)
        logger.info(f"Notification created for user {user_id}: {title}")
    except Exception as e:
        logger.error(f"Failed to insert notification: {e}")
        
    return notification


async def get_unread_notifications(user_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all unread notifications for a user, sorted newest first.
    """
    cursor = notifications_collection.find({
        "user_id": user_id,
        "is_read": False
    }).sort("created_at", -1)
    
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


async def mark_notification_as_read(notification_id: str) -> bool:
    """
    Marks a single notification as read.
    """
    res = await notifications_collection.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    return res.modified_count > 0


async def mark_all_notifications_as_read(user_id: str) -> int:
    """
    Marks all notifications for a user as read.
    """
    res = await notifications_collection.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return res.modified_count
