"""
Signal Problems API — CRUD + resolve + AI generation for Signal Monitor dashboard.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import SignalProblem
from ..services.gemini_service import generate_signal_problems

router = APIRouter(prefix="/api", tags=["Signal Problems"])


class GenerateRequest(BaseModel):
    count: Optional[int] = 5


@router.get("/signal-problems")
def list_signal_problems(db: Session = Depends(get_db)):
    """Return all signal problems with their current status."""
    problems = db.query(SignalProblem).all()

    if problems:
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

    # Fallback: synthesize from NewsArticle when SignalProblem table is empty
    from ..models import NewsArticle

    articles = (
        db.query(NewsArticle)
        .order_by(NewsArticle.risk_score.desc())
        .limit(100)
        .all()
    )

    def get_severity(score):
        if score >= 80:
            return "Critical"
        elif score >= 60:
            return "High"
        elif score >= 40:
            return "Medium"
        return "Low"

    return [
        {
            "id": f"SIG-{i+1:03d}",
            "title": a.title,
            "severity": get_severity(a.risk_score or 0),
            "category": a.category or "General",
            "location": "India",  # NewsArticle has no city location
            "detectedAt": a.scraped_at.strftime("%Y-%m-%d") if a.scraped_at else None,
            "description": (a.content or a.title)[:300],
            "riskScore": round(a.risk_score or 0, 1),
            "source": a.source_name,
            "status": "Pending",
        }
        for i, a in enumerate(articles)
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

