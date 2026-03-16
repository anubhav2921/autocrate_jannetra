from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..mongodb import (
    news_articles_collection, signal_problems_collection
)
from ..services.gemini_service import generate_signal_problems

router = APIRouter(prefix="/api", tags=["Signal Problems"])


class GenerateRequest(BaseModel):
    count: Optional[int] = 5


@router.get("/signal-problems")
async def list_signal_problems(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
):
    """Return all signal problems with their current status, filtered by location."""
    match = {}
    if state:
        match["location"] = {"$regex": state, "$options": "i"}
    if district:
        match["location"] = {"$regex": district, "$options": "i"}
    if city:
        match["location"] = {"$regex": city, "$options": "i"}

    problems = await signal_problems_collection.find(match).to_list(None)

    if problems:
        return [
            {
                "id": p["id"],
                "title": p.get("title"),
                "severity": p.get("severity"),
                "category": p.get("category"),
                "location": p.get("location"),
                "detectedAt": p.get("detected_at"),
                "description": p.get("description"),
                "riskScore": p.get("risk_score"),
                "source": p.get("source"),
                "status": p.get("status"),
            }
            for p in problems
        ]

    # Fallback: synthesize from NewsArticle
    art_match = {}
    if state:
        art_match["state"] = {"$regex": f"^{state}$", "$options": "i"}
    if district:
        art_match["district"] = {"$regex": f"^{district}$", "$options": "i"}
    if city:
        art_match["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if ward:
        art_match["ward"] = {"$regex": f"^{ward}$", "$options": "i"}

    articles = await news_articles_collection.find(art_match).sort("risk_score", -1).limit(100).to_list(100)

    def get_severity(score):
        if score >= 80: return "Critical"
        elif score >= 60: return "High"
        elif score >= 40: return "Medium"
        return "Low"

    def article_location_str(a):
        parts = [x for x in [a.get("city"), a.get("district"), a.get("state")] if x]
        return ", ".join(parts) if parts else (a.get("source_name") or "Unknown")

    return [
        {
            "id": f"SIG-{i+1:03d}",
            "title": a.get("title"),
            "severity": get_severity(a.get("risk_score") or 0),
            "category": a.get("category") or "General",
            "location": article_location_str(a),
            "detectedAt": a["scraped_at"].strftime("%Y-%m-%d") if isinstance(a.get("scraped_at"), datetime) else a.get("scraped_at"),
            "description": (a.get("content") or a.get("title") or "")[:300],
            "riskScore": round(a.get("risk_score") or 0, 1),
            "source": a.get("source_name"),
            "status": "Pending",
        }
        for i, a in enumerate(articles)
    ]


@router.get("/signal-problems/{problem_id}")
async def get_signal_problem(problem_id: str):
    p = await signal_problems_collection.find_one({"id": problem_id})
    if not p:
        raise HTTPException(status_code=404, detail=f"Signal problem '{problem_id}' not found.")
    return {
        "id": p["id"],
        "title": p.get("title"),
        "severity": p.get("severity"),
        "category": p.get("category"),
        "location": p.get("location"),
        "detectedAt": p.get("detected_at"),
        "description": p.get("description"),
        "riskScore": p.get("risk_score"),
        "source": p.get("source"),
        "status": p.get("status"),
    }


@router.patch("/signal-problems/{problem_id}/resolve")
async def resolve_signal_problem(problem_id: str):
    p = await signal_problems_collection.find_one({"id": problem_id})
    if not p:
        raise HTTPException(status_code=404, detail=f"Signal problem '{problem_id}' not found.")
    await signal_problems_collection.update_one({"id": problem_id}, {"$set": {"status": "Problem Resolved"}})
    return {"success": True, "id": problem_id, "status": "Problem Resolved"}


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
