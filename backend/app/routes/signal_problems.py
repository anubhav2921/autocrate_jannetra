"""
Signal Problems API — CRUD + resolve + AI generation for Signal Monitor dashboard.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import SignalProblem
from app.services.gemini_service import generate_signal_problems

router = APIRouter(prefix="/api", tags=["Signal Problems"])


class GenerateRequest(BaseModel):
    count: Optional[int] = 5


@router.get("/signal-problems")
def list_signal_problems(db: Session = Depends(get_db)):
    """Return all signal problems with their current status."""
    problems = db.query(SignalProblem).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "severity": p.severity,
            "category": p.category,
            "location": p.location,
            "detectedAt": p.detected_at,
            "description": p.description,
            "riskScore": p.risk_score,
            "source": p.source,
            "status": p.status,
        }
        for p in problems
    ]


@router.get("/signal-problems/{problem_id}")
def get_signal_problem(problem_id: str, db: Session = Depends(get_db)):
    """Return a single signal problem by ID."""
    p = db.query(SignalProblem).filter(SignalProblem.id == problem_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Signal problem '{problem_id}' not found.")
    return {
        "id": p.id,
        "title": p.title,
        "severity": p.severity,
        "category": p.category,
        "location": p.location,
        "detectedAt": p.detected_at,
        "description": p.description,
        "riskScore": p.risk_score,
        "source": p.source,
        "status": p.status,
    }


@router.patch("/signal-problems/{problem_id}/resolve")
def resolve_signal_problem(problem_id: str, db: Session = Depends(get_db)):
    """Mark a signal problem as 'Problem Resolved'."""
    p = db.query(SignalProblem).filter(SignalProblem.id == problem_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Signal problem '{problem_id}' not found.")
    p.status = "Problem Resolved"
    db.commit()
    db.refresh(p)
    return {"success": True, "id": p.id, "status": p.status}


@router.post("/signal-problems/generate")
def generate_problems_with_ai(body: GenerateRequest, db: Session = Depends(get_db)):
    """Use Gemini AI to generate new signal problems and save to DB."""
    count = min(body.count or 5, 15)  # Cap at 15

    generated = generate_signal_problems(count)
    if not generated:
        raise HTTPException(status_code=500, detail="Gemini AI failed to generate problems. Check API key.")

    # Avoid duplicate IDs
    existing_ids = {p.id for p in db.query(SignalProblem.id).all()}
    saved = []
    for p in generated:
        if p["id"] in existing_ids:
            # Generate a unique ID
            base = p["id"].split("-")[0] if "-" in p["id"] else "SIG"
            counter = 100
            while f"{base}-{counter}" in existing_ids:
                counter += 1
            p["id"] = f"{base}-{counter}"
            existing_ids.add(p["id"])

        problem = SignalProblem(**p)
        db.add(problem)
        saved.append(p)

    db.commit()
    return {
        "success": True,
        "generated": len(saved),
        "problems": saved,
    }


@router.delete("/signal-problems/clear")
def clear_signal_problems(db: Session = Depends(get_db)):
    """Delete all signal problems (for regeneration)."""
    count = db.query(SignalProblem).delete()
    db.commit()
    return {"success": True, "deleted": count}

