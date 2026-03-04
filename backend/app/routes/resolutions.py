from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import Resolution, User

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
def create_resolution(req: ResolutionCreate, db: Session = Depends(get_db)):
    resolution = Resolution(
        alert_id=req.alert_id,
        resolved_by=req.user_id,
        title=req.title,
        category=req.category,
        location=req.location,
        problem_description=req.problem_description,
        action_taken=req.action_taken,
        resources_used=req.resources_used,
        people_benefited=req.people_benefited,
        status=req.status,
    )
    db.add(resolution)
    db.commit()
    db.refresh(resolution)

    return {
        "success": True,
        "resolution": {
            "id": resolution.id,
            "title": resolution.title,
            "status": resolution.status,
            "resolved_at": resolution.resolved_at.isoformat() if resolution.resolved_at else None,
        },
    }


@router.get("/resolutions")
def list_resolutions(db: Session = Depends(get_db)):
    results = (
        db.query(Resolution, User)
        .join(User, User.id == Resolution.resolved_by)
        .order_by(Resolution.created_at.desc())
        .all()
    )

    return {
        "resolutions": [
            {
                "id": r.id,
                "title": r.title,
                "category": r.category,
                "location": r.location,
                "problem_description": r.problem_description,
                "action_taken": r.action_taken,
                "resources_used": r.resources_used,
                "people_benefited": r.people_benefited,
                "status": r.status,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                "leader": {
                    "name": u.name,
                    "department": u.department,
                },
            }
            for r, u in results
        ]
    }
