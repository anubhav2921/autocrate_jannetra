from fastapi import APIRouter, HTTPException, Query, Depends, Form, File, UploadFile
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..mongodb import (
    news_articles_collection, signal_problems_collection
)
from ..services.gemini_service import generate_signal_problems, summarize_problem_cluster, summarize_news_article, structure_single_problem
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
    status: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Return signal problems, filtered by location, department, status, and/or user."""
    
    user_dept = current_user.get("department")
    user_role = current_user.get("role")

    from .location import _build_location_match
    match = _build_location_match(state, district, city, ward)

    # Add Status Filter (default to pending/review unless overridden)
    if status:
        match["status"] = status
    else:
        match["status"] = {"$in": ["Pending", "Under Review", "pending", "under_review", None]}
        
    # Ignore Deleted items
    match["deleted"] = {"$ne": True}
        
    # Add User Filter
    if user_id:
        match["resolved_by"] = user_id
    
    # Add Department Filter if not admin and not specifically filtering by another user
    if user_role != "ADMIN" and user_dept and not user_id:
        match["department"] = user_dept

    # Do NOT show Citizen Reports on the public Signal Monitor. They have their own dedicated section.
    match["category"] = {"$ne": "Citizen Report"}

    # Fetch from the aggregated collection
    # We sort chronologically to ensure new scraped data stays on top
    problems_cursor = await signal_problems_collection.find(match).sort([
        ("_id", -1)
    ]).to_list(100)
    
    results = [
        {
            "id": p["id"],
            "title": p.get("title"),
            "severity": p.get("severity", "LOW"),
            "category": p.get("category"),
            "location": p.get("location") or ", ".join(p.get("locations", [])),
            "detectedAt": p.get("detected_at").strftime("%Y-%m-%d") if hasattr(p.get("detected_at"), "strftime") else p.get("detected_at"),
            "lastUpdated": p.get("last_updated").strftime("%Y-%m-%d %H:%M") if hasattr(p.get("last_updated"), "strftime") else p.get("last_updated"),
            "description": p.get("description") or p.get("title"),
            "riskScore": p.get("priority_score") or p.get("risk_score") or 0.0,
            "priorityScore": p.get("priority_score", 0.0),
            "frequency": p.get("frequency", 1),
            "source": ", ".join(p.get("sources", [])) if isinstance(p.get("sources"), list) else p.get("source"),
            "status": p.get("status"),
            "sampleRecords": p.get("sample_records", []),
            "resolutionReport": p.get("resolution_report"),
            "resolutionProofUrl": p.get("resolution_proof_url"),
            "resolvedAt": p.get("resolved_at").strftime("%Y-%m-%d %H:%M") if hasattr(p.get("resolved_at"), "strftime") else None,
            "hasGeminiSummary": p.get("has_gemini_summary", False)
        }
        for p in problems_cursor
    ]

    existing_ids = {r["id"] for r in results}

    # Always fetch from news_articles_collection to supplement signal_problems_collection
    article_match = _build_location_match(state, district, city, ward)
    if user_role != "ADMIN" and user_dept and not user_id:
        article_match["department"] = user_dept
        
    # We want to show unresolved/scraped articles alongside manual/resolved problems
    # Only fetch pending if status filter is "Pending" or None
    if not status or status == "Pending":
        needed = 100 - len(results)
        if needed > 0:
            articles_cursor = await news_articles_collection.find(article_match).sort("_id", -1).limit(needed + 100).to_list(needed + 100)
            
            def get_severity(score):
                if score >= 85: return "Critical"
                elif score >= 70: return "High"
                elif score >= 50: return "Medium"
                return "Low"
    
            for a in articles_cursor:
                a_id = a.get("id") or f"SIG-{str(a['_id'])[-6:].upper()}"
                
                # Deduplicate: if this article was already resolved/tracked, it's in existing_ids
                if a_id in existing_ids:
                    continue
                    
                loc_parts = [x for x in [a.get("city"), a.get("district"), a.get("state")] if x]
                location_str = ", ".join(loc_parts) if loc_parts else (a.get("source_name") or "Unknown")
                det_at = a.get("scraped_at") or datetime.utcnow()
                
                results.append({
                    "id": a_id,
                    "title": a.get("title") or "Unknown Event",
                    "severity": get_severity(a.get("risk_score") or 0),
                    "category": a.get("category", "General"),
                    "location": location_str,
                    "detectedAt": det_at.strftime("%Y-%m-%d") if hasattr(det_at, "strftime") else det_at,
                    "lastUpdated": det_at.strftime("%Y-%m-%d %H:%M") if hasattr(det_at, "strftime") else det_at,
                    "description": a.get("content") or a.get("title") or "",
                    "riskScore": round(a.get("risk_score") or 0, 1),
                    "priorityScore": round(a.get("risk_score") or 0, 1),
                    "frequency": 1,
                    "source": a.get("source_name", "Unknown"),
                    "status": "Pending",
                    "sampleRecords": [],
                    "resolutionReport": None,
                    "resolutionProofUrl": None,
                    "resolvedAt": None,
                    "hasGeminiSummary": False
                })
                existing_ids.add(a_id)
                if len(results) >= 100:
                    break

    # We no longer resort by priority; we keep the chronological DB order
    pass

    return results



@router.get("/signal-problems/{problem_id}")
async def get_signal_problem(problem_id: str):
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        # Fallback text check - aggressive re-generation if missing or placeholder
        FALLBACK_SOL = "Immediate investigation by the concerned department (Municipal/Infrastructure)."
        current_sol = p.get("expected_solution", "")
        
        needs_summary = (
            not p.get("has_gemini_summary") or 
            current_sol == FALLBACK_SOL or
            not current_sol or
            len(p.get("description", "")) < 30
        )

        if needs_summary:
            # Limit samples to avoid token overflow and speed up processing
            raw_samples = p.get("sample_records", [])[:5]
            if raw_samples:
                summary = summarize_problem_cluster(
                    title=p.get("title", ""),
                    category=p.get("category", "General"),
                    location=p.get("location") or ", ".join(p.get("locations", [])),
                    samples=raw_samples
                )
            else:
                summary = structure_single_problem(
                    title=p.get("title", ""),
                    category=p.get("category", "General"),
                    location=p.get("location") or ", ".join(p.get("locations", [])),
                    description=p.get("description", "")
                )
            if summary:
                update_fields = {
                    "description": summary["description"],
                    "location_detail": summary["location_detail"],
                    "evidence_summary": summary["evidence_summary"],
                    "expected_solution": summary["expected_solution"],
                    "has_gemini_summary": True
                }
                await signal_problems_collection.update_one({"id": problem_id}, {"$set": update_fields})
                p.update(update_fields)

        return {
            "id": p["id"],
            "title": p.get("title"),
            "severity": p.get("severity", "LOW"),
            "category": p.get("category"),
            "location": p.get("location") or ", ".join(p.get("locations", [])),
            "detectedAt": p.get("detected_at"),
            "lastUpdated": p.get("last_updated"),
            "description": p.get("description") or p.get("title"),
            "locationDetail": p.get("location_detail"),
            "evidenceSummary": p.get("evidence_summary"),
            "expectedSolution": p.get("expected_solution"),
            "hasGeminiSummary": p.get("has_gemini_summary", False),
            "priorityScore": p.get("priority_score") or p.get("risk_score") or 0.0,
            "frequency": p.get("frequency", 1),
            "source": ", ".join(p.get("sources", [])) if isinstance(p.get("sources"), list) else p.get("source"),
            "status": p.get("status"),
            "sampleRecords": p.get("sample_records", []),
            "resolutionReport": p.get("resolution_report"),
            "resolutionProofUrl": p.get("resolution_proof_url"),
            "resolvedAt": p.get("resolved_at"),
            "image_url": p.get("image_url") if "mock-storage" not in p.get("image_url", "") else None,
            "audio_url": p.get("audio_url") if "mock-storage" not in p.get("audio_url", "") else None,
            "department": p.get("department"),
            "assignedName": p.get("assigned_name", "Unknown"),
            "assigneeId": p.get("assigned_to", "unknown"),
            "collaborators": p.get("collaborators", [])
        }

    # 2. Try to find in synthetic (news articles) if not in signal_problems
    a = await news_articles_collection.find_one({"id": problem_id})
    if not a and problem_id.startswith("SIG-"):
        suffix = problem_id[4:].lower()
        async for article in news_articles_collection.find({}):
            if str(article["_id"])[-6:].lower() == suffix:
                a = article
                break

    if a:
        def get_severity(score):
            if score >= 85: return "Critical"
            elif score >= 70: return "High"
            elif score >= 50: return "Medium"
            return "Low"

        loc_parts = [x for x in [a.get("city"), a.get("district"), a.get("state")] if x]
        location_str = ", ".join(loc_parts) if loc_parts else (a.get("source_name") or "Unknown")

        # Generate structured report if missing
        needs_summary = (
            not a.get("has_gemini_summary") or
            not a.get("gemini_description")
        )

        if needs_summary and a.get("content"):
            summary = summarize_news_article(
                title=a.get("title", ""),
                category=a.get("category", "General"),
                location=location_str,
                content=a.get("content", "")
            )
            if summary:
                update_fields = {
                    "gemini_description": summary["description"],
                    "location_detail": summary["location_detail"],
                    "evidence_summary": summary["evidence_summary"],
                    "expected_solution": summary["expected_solution"],
                    "has_gemini_summary": True
                }
                await news_articles_collection.update_one({"_id": a["_id"]}, {"$set": update_fields})
                a.update(update_fields)

        return {
            "id": problem_id,
            "title": a.get("title"),
            "severity": get_severity(a.get("risk_score") or 0),
            "category": a.get("category") or "General",
            "location": location_str,
            "detectedAt": a.get("scraped_at"),
            "lastUpdated": a.get("scraped_at"),
            "description": a.get("gemini_description") if a.get("has_gemini_summary") else (a.get("content") or a.get("title") or ""),
            "locationDetail": a.get("location_detail") or location_str,
            "evidenceSummary": a.get("evidence_summary") or "Synthetic problem derived from news article.",
            "expectedSolution": a.get("expected_solution") or "Investigation required by concerned department.",
            "hasGeminiSummary": a.get("has_gemini_summary", False),
            "priorityScore": a.get("risk_score") or 0.0,
            "frequency": 1,
            "source": a.get("source_name"),
            "status": "Pending",
            "sampleRecords": [],
            "resolutionReport": None,
            "resolutionProofUrl": None,
            "resolvedAt": None,
            "image_url": a.get("image_url") or a.get("url"),
            "audio_url": None,
            "department": a.get("department", "General"),
            "assignedName": a.get("assigned_name", "Unknown"),
            "assigneeId": a.get("assigned_to", "unknown"),
            "collaborators": a.get("collaborators", [])
        }

    raise HTTPException(status_code=404, detail=f"Signal problem '{problem_id}' not found.")


@router.patch("/signal-problems/{problem_id}/resolve")
async def resolve_signal_problem(
    problem_id: str,
    report: str = Form(...),
    proof: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Marks a signal as resolved but REQUIRES a report. Proof photo is optional but tracked."""
    
    # In a real environment, we'd upload 'proof' to S3/GCS
    # Here we'll just track if it was provided
    proof_url = f"/uploads/{proof.filename}" if proof else None
    
    update_data = {
        "status": "Problem Resolved",
        "resolution_report": report,
        "resolution_proof_url": proof_url,
        "resolved_at": datetime.utcnow(),
        "resolved_by": current_user.get("id")
    }

    # 1. Try to find in manual collection
    p = await signal_problems_collection.find_one({"id": problem_id})
    if p:
        await signal_problems_collection.update_one({"id": problem_id}, {"$set": update_data})
        return {"success": True, "id": problem_id, "status": "Problem Resolved"}

    # 2. Try to find in synthetic (news articles)
    a = await news_articles_collection.find_one({"id": problem_id})
    if not a and problem_id.startswith("SIG-"):
        suffix = problem_id[4:].lower()
        async for article in news_articles_collection.find({}):
            if str(article["_id"])[-6:].lower() == suffix:
                a = article
                break
                
    if a:
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
            "detected_at": a["scraped_at"].strftime("%Y-%m-%d") if hasattr(a.get("scraped_at"), "strftime") else a.get("scraped_at"),
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
