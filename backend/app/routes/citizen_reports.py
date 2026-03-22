import os
import uuid
import datetime
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import storage

from ..mongodb import (
    articles_collection, 
    detection_results_collection, 
    sources_collection,
    signal_problems_collection
)
from ..utils import gen_uuid, get_current_user_optional

router = APIRouter(prefix="/api", tags=["Citizen Reports"])


async def _upload_to_firebase(file_content: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """Uploads bytes to Firebase Storage and returns public URL."""
    try:
        bucket = storage.bucket("jannetra.firebasestorage.app")
        blob = bucket.blob(f"citizen_reports/{filename}")
        blob.upload_from_string(file_content, content_type=content_type)
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"Firebase Upload Error: {e}")
        return ""

@router.post("/upload-audio")
async def upload_audio(audio: UploadFile = File(...)):
    """Uploads an audio file to Firebase and returns the URL."""
    try:
        content = await audio.read()
        ext = audio.filename.split(".")[-1] if "." in audio.filename else "m4a"
        filename = f"audio_{uuid.uuid4()}.{ext}"
        mime_type = audio.content_type or "audio/m4a"
        audio_url = await _upload_to_firebase(content, filename, mime_type)
        return {"success": True, "audio_url": audio_url}
    except Exception as e:
        print(f"Audio upload failed: {e}")
        return {"success": False, "error": str(e)}


@router.post("/report-issue")
async def analyze_reported_issue(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: str = Form(...),
):
    """
    Uploads the citizen report image to Firebase and returns pending fields.
    AI analysis has been removed — reports go straight to manual review.
    """
    print(f"--- Report received for {image.filename} ---")
    content = await image.read()

    # Generate unique filename and upload to Firebase
    ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    mime_type = image.content_type or "image/jpeg"
    image_url = await _upload_to_firebase(content, filename, mime_type)
    print(f"Image uploaded to: {image_url}")

    return {
        "image_url": image_url,
        "location": {"lat": latitude, "lng": longitude},
        "timestamp": timestamp,
        "scene_type": "Pending Verification",
        "detected_issue": "Civic Issue",
        "ai_description": "Your photo has been received. Please add a description below and our team will review it shortly.",
        "severity": "Medium",
        "urgency": "Medium",
        "confidence_score": 0
    }


class FinalReportSubmit(BaseModel):
    report_id: str
    image_url: Optional[str] = ""
    detected_issue: Optional[str] = "Unknown Issue"
    user_description: Optional[str] = ""
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    timestamp: Optional[str] = ""
    metadata: Optional[dict] = {}


@router.post("/report-issue/submit")
async def submit_final_report(req: FinalReportSubmit, current_user: Optional[dict] = Depends(get_current_user_optional)):
    """
    Persists the final issue report into the database.
    """
    # 1. Create source if not exists (Citizen Reports)
    source_id = "citizen_reporter"
    source = await sources_collection.find_one({"id": source_id})
    if not source:
        await sources_collection.insert_one({
            "id": source_id,
            "name": "Citizen Reported",
            "source_type": "COMPLAINT",
            "reliability_score": 1.0
        })

    # 2. Save Article
    article = {
        "id": req.report_id,
        "title": req.detected_issue,
        "content": req.user_description,
        "summary": req.user_description[:200],
        "category": req.detected_issue,
        "source_id": source_id,
        "url": req.image_url,
        "location": f"{req.latitude}, {req.longitude}",
        "city": "Prayagraj", # Default or infer from lat/lng
        "ingested_at": datetime.datetime.utcnow(),
        "risk_score": 75 if req.metadata.get("severity", "Medium") == "High" else 50,
        "risk_level": req.metadata.get("severity", "MEDIUM").upper(),
    }
    await articles_collection.insert_one(article)
    
    # 3. Save Detection Results
    detection = {
        "id": gen_uuid(),
        "article_id": req.report_id,
        "label": "REAL",
        "confidence_score": 0.95,
        "explanation": f"Reported by citizen and verified via AI Vision. {req.metadata.get('ai_description', '')}",
        "created_at": datetime.datetime.utcnow(),
    }
    await detection_results_collection.insert_one(detection)

    # 4. Instant NLP & Dashboard Integration
    # Create the Signal Problem so the Leader Dashboard sees it immediately!
    department_map = {
        "Garbage Dumping": "municipal",
        "Water Logging": "municipal",
        "Road Damage": "municipal",
        "Street Light issue": "electricity",
        "Infrastructure Damage": "municipal",
        "Others": "municipal"
    }
    assigned_dept = department_map.get(req.detected_issue, "municipal")
    
    # Allow user override for proper authority routing
    if req.metadata.get("department_tag"):
        assigned_dept = req.metadata["department_tag"].lower()
    
    # Always insert the report into signals collection so no public grievances are silently dropped!
    ai_desc = req.metadata.get("ai_description", "Verified by Citizen")
    audio_evidence = req.metadata.get("audio_url", "")
    
    signal_problem = {
        "id": req.report_id,  # Link IDs directly for tracking
        "title": req.detected_issue,
        "category": "Citizen Report",
        "department": assigned_dept,
        "state": "Uttar Pradesh",
        "district": "Prayagraj",
        "city": "Prayagraj",
        "ward": "Unknown",
        "location": f"Lat {req.latitude}, Lng {req.longitude}",
        "detected_at": datetime.datetime.utcnow(),
        "last_updated": datetime.datetime.utcnow(),
        "description": f"{req.user_description}\n\nAI Analysis: {ai_desc}".strip(),
        "location_detail": f"Auto-detected at {req.latitude}, {req.longitude}",
        "evidence_summary": ai_desc,
        "image_url": req.image_url,
        "audio_url": audio_evidence,
        "expected_solution": "Immediate dispatch of field team to investigate the citizen report.",
        "risk_score": article["risk_score"],
        "priority_score": article["risk_score"],
        "severity": article["risk_level"],
        "frequency": 1,
        "source": "Citizen Application",
        "status": "Pending",
        "has_gemini_summary": True, # Pre-summarized conceptually
        "sample_records": [{
             "title": req.detected_issue, 
             "severity": article["risk_level"], 
             "source": "Citizen App"
        }],
        "resolution_proof_url": None,
        "resolution_report": None,
        "resolved_at": None,
        "resolved_by": None
    }
    await signal_problems_collection.insert_one(signal_problem)

    return {"success": True, "report_id": req.report_id}


@router.get("/report/{report_id}")
async def get_report_status(report_id: str):
    """
    Retrieves the status for a specific citizen report.
    Checks mapped signal_problem for updated resolutions by leaders.
    """
    article = await articles_collection.find_one({"id": report_id})
    if not article:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Check if a leader updated the associated signal problem
    signal_problem = await signal_problems_collection.find_one({"id": report_id})
    
    status = "Escalated to Dept"
    last_update = "Just Now"
    progress = 0
    
    if signal_problem:
        progress = signal_problem.get("progress", 0)
        # Give priority to Leader Dashboard status updates
        if signal_problem.get("status"):
            status = signal_problem["status"]
            
        if signal_problem.get("resolved_at"):
            dt = signal_problem["resolved_at"]
            if isinstance(dt, datetime.datetime):
                last_update = dt.strftime("%Y-%m-%d %H:%M:%S")
        elif "last_updated" in signal_problem:
            dt = signal_problem["last_updated"]
            if isinstance(dt, datetime.datetime):
                last_update = dt.strftime("%Y-%m-%d %H:%M:%S")
    else:
        # Fallback to article tracking
        risk_score = article.get("risk_score", 50)
        status = "Escalated to Dept" if risk_score >= 75 else "AI Analysis Complete"
        progress = int(risk_score / 2) if risk_score < 100 else 50
        if "ingested_at" in article:
            dt = article["ingested_at"]
            if isinstance(dt, datetime.datetime):
                last_update = dt.strftime("%Y-%m-%d %H:%M:%S")

    return {
        "id": article["id"],
        "status": status,
        "category": article.get("category", "General Civic Issue"),
        "lastUpdate": last_update,
        "severity": article.get("risk_level", "MEDIUM"),
        "progress": progress
    }

@router.get("/citizen-reports/list")
async def list_citizen_reports(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """
    Returns a list of all signal problems that were reported by citizens.
    Sorted by priority_score descending.
    """
    match_filter = {
        "category": "Citizen Report", 
        "deleted": {"$ne": True}, 
        "status": {"$in": ["Pending", "Under Review", "pending", "under_review", None]}
    }
    
    # Optional: filter by department if leader
    if current_user and current_user.get("role") != "ADMIN" and current_user.get("department"):
        match_filter["department"] = current_user.get("department")

    cursor = signal_problems_collection.find(match_filter).sort("_id", -1).limit(200)
    reports = await cursor.to_list(200)
    
    # We map the data slightly to match the SignalMonitor format exactly
    results = []
    for p in reports:
        results.append({
            "id": p["id"],
            "title": p.get("title", ""),
            "severity": str(p.get("severity", "Medium")).capitalize(),
            "category": "Citizen Report",
            "location": p.get("location", ""),
            "detectedAt": p.get("detected_at"),
            "lastUpdated": p.get("last_updated"),
            "description": p.get("description", ""),
            "riskScore": p.get("risk_score", 0),
            "priorityScore": p.get("priority_score", 0),
            "frequency": p.get("frequency", 1),
            "source": p.get("source", "Citizen Application"),
            "status": p.get("status", "Pending"),
            "image_url": p.get("image_url", ""),
            "audio_url": p.get("audio_url", "")
        })
    return results
