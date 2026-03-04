import hashlib
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import User, Resolution

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
    profile_picture: Optional[str] = None  # base64 or URL


class DeleteAccountRequest(BaseModel):
    user_id: str
    password: str


@router.get("/profile/{user_id}")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    resolution_count = db.query(func.count(Resolution.id)).filter(
        Resolution.resolved_by == user_id
    ).scalar() or 0

    resolved_count = db.query(func.count(Resolution.id)).filter(
        Resolution.resolved_by == user_id,
        Resolution.status == "RESOLVED"
    ).scalar() or 0

    in_progress_count = db.query(func.count(Resolution.id)).filter(
        Resolution.resolved_by == user_id,
        Resolution.status == "IN_PROGRESS"
    ).scalar() or 0

    return {
        "success": True,
        "profile": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "profile_picture": getattr(user, 'profile_picture', None),
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "stats": {
            "total_resolutions": resolution_count,
            "resolved": resolved_count,
            "in_progress": in_progress_count,
        },
    }


@router.post("/update-password")
def update_password(req: UpdatePasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    if user.password_hash != _hash_password(req.current_password):
        return {"success": False, "error": "Current password is incorrect"}

    if len(req.new_password) < 6:
        return {"success": False, "error": "New password must be at least 6 characters"}

    user.password_hash = _hash_password(req.new_password)
    db.commit()
    return {"success": True, "message": "Password updated successfully"}


@router.post("/update-profile")
def update_profile(req: UpdateProfileRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    if req.name:
        user.name = req.name
    if req.department:
        user.department = req.department

    db.commit()
    db.refresh(user)

    updated_user = {
        "id": user.id, "name": user.name, "email": user.email,
        "role": user.role, "department": user.department,
    }
    return {"success": True, "user": updated_user}


@router.post("/delete")
def delete_account(req: DeleteAccountRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    if user.password_hash != _hash_password(req.password):
        return {"success": False, "error": "Incorrect password"}

    db.delete(user)
    db.commit()
    return {"success": True, "message": "Account deleted successfully"}
