import hashlib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..mongodb import users_collection, resolutions_collection

router = APIRouter(prefix="/api/account", tags=["Account"])


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class UpdatePasswordRequest(BaseModel):
    user_id: str
    current_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    user_id: str
    name: Optional[str] = None
    department: Optional[str] = None
    profile_picture: Optional[str] = None


class DeleteAccountRequest(BaseModel):
    user_id: str
    password: str


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    user = await users_collection.find_one({"id": user_id})
    if not user:
        return {"success": False, "error": "User not found"}

    total_res = await resolutions_collection.count_documents({"resolved_by": user_id})
    resolved = await resolutions_collection.count_documents({"resolved_by": user_id, "status": "RESOLVED"})
    in_progress = await resolutions_collection.count_documents({"resolved_by": user_id, "status": "IN_PROGRESS"})

    return {
        "success": True,
        "profile": {
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email"),
            "role": user.get("role"),
            "department": user.get("department"),
            "profile_picture": user.get("picture"),
            "created_at": user["created_at"].isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at"),
        },
        "stats": {
            "total_resolutions": total_res,
            "resolved": resolved,
            "in_progress": in_progress,
        },
    }


@router.post("/update-password")
async def update_password(req: UpdatePasswordRequest):
    user = await users_collection.find_one({"id": req.user_id})
    if not user:
        return {"success": False, "error": "User not found"}

    if user.get("password_hash") != _hash_password(req.current_password):
        return {"success": False, "error": "Current password is incorrect"}

    if len(req.new_password) < 6:
        return {"success": False, "error": "New password must be at least 6 characters"}

    await users_collection.update_one(
        {"id": req.user_id},
        {"$set": {"password_hash": _hash_password(req.new_password)}}
    )
    return {"success": True, "message": "Password updated successfully"}


@router.post("/update-profile")
async def update_profile(req: UpdateProfileRequest):
    user = await users_collection.find_one({"id": req.user_id})
    if not user:
        return {"success": False, "error": "User not found"}

    update = {}
    if req.name:
        update["name"] = req.name
    if req.department:
        update["department"] = req.department
    if req.profile_picture:
        update["picture"] = req.profile_picture

    if update:
        await users_collection.update_one({"id": req.user_id}, {"$set": update})
        user.update(update)

    return {
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email"),
            "role": user.get("role"),
            "department": user.get("department"),
        }
    }


@router.post("/delete")
async def delete_account(req: DeleteAccountRequest):
    user = await users_collection.find_one({"id": req.user_id})
    if not user:
        return {"success": False, "error": "User not found"}

    if user.get("password_hash") != _hash_password(req.password):
        return {"success": False, "error": "Incorrect password"}

    await users_collection.delete_one({"id": req.user_id})
    return {"success": True, "message": "Account deleted successfully"}
