from fastapi import APIRouter, HTTPException, Query, Depends, Form, File, UploadFile
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..mongodb import (
    news_articles_collection, signal_problems_collection
)
from ..services.gemini_service import generate_signal_problems
from ..utils import get_current_user

router = APIRouter(prefix="/api", tags=["Signal Problems"])


class GenerateRequest(BaseModel):
    count: Optional[int] = 5


@router.get("/signal-problems")
async def list_signal_problems(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Return all signal problems, filtered by user's department, sorted by priority."""
    
    user_dept = current_user.get("department")
    user_role = current_user.get("role")

    from .location import _build_location_match
    match = _build_location_match(state, district, city, ward)

    # Add Department Filter if not admin
    if user_role != "ADMIN" and user_dept:
        match["department"] = user_dept

    # Fetch from the aggregated collection
    # We sort by priority_score descending to show high-impact issues first
    problems_cursor = await signal_problems_collection.find(match).sort([
        ("priority_score", -1), 
        ("frequency", -1),
        ("last_updated", -1)
    ]).to_list(100)
    
    results = [
        {
            "id": p["id"],
            "title": p.get("title"),
            "severity": p.get("severity", "LOW"),
            "category": p.get("category"),
            "location": p.get("location") or ", ".join(p.get("locations", [])),
            "detectedAt": p.get("detected_at").strftime("%Y-%m-%d") if isinstance(p.get("detected_at"), datetime) else p.get("detected_at"),
            "lastUpdated": p.get("last_updated").strftime("%Y-%m-%d %H:%M") if isinstance(p.get("last_updated"), datetime) else p.get("last_updated"),
            "description": p.get("description") or p.get("title"),
            "riskScore": p.get("priority_score") or p.get("risk_score") or 0.0,
            "priorityScore": p.get("priority_score", 0.0),
            "frequency": p.get("frequency", 1),
            "source": ", ".join(p.get("sources", [])) if isinstance(p.get("sources"), list) else p.get("source"),
            "status": p.get("status"),
            "sampleRecords": p.get("sample_records", []),
            "resolutionReport": p.get("resolution_report"),
            "resolutionProofUrl": p.get("resolution_proof_url"),
            "resolvedAt": p.get("resolved_at").strftime("%Y-%m-%d %H:%M") if isinstance(p.get("resolved_at"), datetime) else None
        }
        for p in problems_cursor
    ]

    return results


@router.get("/signal-problems/{problem_id}")
async def get_signal_problem(problem_id: str):
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        return {
            "id": p["id"],
            "title": p.get("title"),
            "severity": p.get("severity", "LOW"),
            "category": p.get("category"),
            "location": p.get("location") or ", ".join(p.get("locations", [])),
            "detectedAt": p.get("detected_at"),
            "lastUpdated": p.get("last_updated"),
            "description": p.get("description") or p.get("title"),
            "priorityScore": p.get("priority_score") or p.get("risk_score") or 0.0,
            "frequency": p.get("frequency", 1),
            "source": ", ".join(p.get("sources", [])) if isinstance(p.get("sources"), list) else p.get("source"),
            "status": p.get("status"),
            "sampleRecords": p.get("sample_records", []),
            "resolutionReport": p.get("resolution_report"),
            "resolutionProofUrl": p.get("resolution_proof_url"),
            "resolvedAt": p.get("resolved_at")
        }

    raise HTTPException(status_code=404, detail=f"Signal problem '{problem_id}' not found.")


@router.patch("/signal-problems/{problem_id}/resolve")
async def resolve_signal_problem(
    problem_id: str,
    report: str = Form(...),
    proof: Optional[UploadFile] = File(None)
):
    """Marks a signal as resolved but REQUIRES a report. Proof photo is optional but tracked."""
    
    # In a real environment, we'd upload 'proof' to S3/GCS
    # Here we'll just track if it was provided
    proof_url = f"/uploads/{proof.filename}" if proof else None
    
    update_data = {
        "status": "Problem Resolved",
        "resolution_report": report,
        "resolution_proof_url": proof_url,
        "resolved_at": datetime.utcnow()
    }

    # 1. Try to find in manual collection
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        await signal_problems_collection.update_one({"id": problem_id}, {"$set": update_data})
        return {"success": True, "id": problem_id, "status": "Problem Resolved"}

    # 2. Try to find in synthetic (news articles)
    if problem_id.startswith("SIG-"):
        suffix = problem_id[4:].lower()
        async for a in news_articles_collection.find({}):
            if str(a["_id"])[-6:].lower() == suffix:
                
                def get_severity(score):
                    if score >= 85: return "Critical"
                    elif score >= 70: return "High"
                    elif score >= 50: return "Medium"
                    return "Low"

                def article_location_str(a):
                    parts = [x for x in [a.get("city"), a.get("district"), a.get("state")] if x]
                    return ", ".join(parts) if parts else (a.get("source_name") or "Unknown")

                new_sp = {
                    "id": problem_id,
                    "title": a.get("title"),
                    "severity": get_severity(a.get("risk_score") or 0),
                    "category": a.get("category") or "General",
                    "location": article_location_str(a),
                    "detected_at": a["scraped_at"].strftime("%Y-%m-%d") if isinstance(a.get("scraped_at"), datetime) else a.get("scraped_at"),
                    "description": a.get("content") or a.get("title") or "",
                    "risk_score": round(a.get("risk_score") or 0, 1),
                    "source": a.get("source_name"),
                    **update_data
                }
                await signal_problems_collection.insert_one(new_sp)
                return {"success": True, "id": problem_id, "status": "Problem Resolved"}

    raise HTTPException(status_code=404, detail=f"Signal problem '{problem_id}' not found.")


@router.post("/signal-problems/generate")
async def generate_problems_with_ai(body: GenerateRequest):
    count = min(body.count or 5, 15)
    generated = generate_signal_problems(count)
    if not generated:
        raise HTTPException(status_code=500, detail="Gemini AI failed to generate problems. Check API key.")

    existing = await signal_problems_collection.find({}, {"id": 1}).to_list(None)
    existing_ids = {p["id"] for p in existing}

    saved = []
    for p in generated:
        if p["id"] in existing_ids:
            base = p["id"].split("-")[0] if "-" in p["id"] else "SIG"
            counter = 100
            while f"{base}-{counter}" in existing_ids:
                counter += 1
            p["id"] = f"{base}-{counter}"
            existing_ids.add(p["id"])
        await signal_problems_collection.insert_one(p)
        saved.append(p)

    return {"success": True, "generated": len(saved), "problems": saved}


@router.delete("/signal-problems/clear")
async def clear_signal_problems():
    result = await signal_problems_collection.delete_many({})
    return {"success": True, "deleted": result.deleted_count}
