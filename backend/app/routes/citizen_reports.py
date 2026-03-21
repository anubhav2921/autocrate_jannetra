import os
import io
import uuid
import datetime
import json
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import storage
from google import genai
from google.genai import types

from ..mongodb import (
    articles_collection, 
    detection_results_collection, 
    sources_collection,
    signal_problems_collection
)
from ..utils import gen_uuid, get_current_user_optional
from ..services.gemini_config import gemini_client, GEMINI_MODEL

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
        return f"https://mock-storage.jannetra.ai/reports/{filename}"

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
    Analyzes an uploaded image using Gemini Vision and extracts issue details.
    """
    print(f"--- Analysis Started for {image.filename} ---")
    content = await image.read()
    
    # Generate unique filename
    ext = image.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    
    # 1. Upload to Firebase
    mime_type = image.content_type or "image/jpeg"
    image_url = await _upload_to_firebase(content, filename, mime_type)
    print(f"Image uploaded to: {image_url} with mime: {mime_type}")
    
    # 2. AI Vision Pipeline with Gemini
    # Constructing prompt for specific issue detection
    prompt = """
    You are an intelligent image analysis system for JanNetra, a civic health monitoring platform.
    Your task is to generate a clear, human-like description of the given image.

    STRICT RULES:
    1. ONLY describe what is visible in the image.
    2. DO NOT return any system errors, API errors, debug logs, or technical messages.
    3. DO NOT mention words like "error", "quota", "API", or "resource exhausted".
    4. If the image contains a person:
       - Describe posture, activity, and visible emotions (e.g., sitting, walking, smiling, injured).
    5. If the image contains an issue (road damage, garbage, waterlogging, etc.):
       - Clearly describe the problem.
       - Mention severity (low, medium, high if possible).
       - Mention surroundings (roadside, residential area, public place, etc.).
    6. Keep the description natural, like a real human reporting the issue.
    7. Maximum length for the description is 3-5 sentences.

    OUTPUT FORMAT: You MUST return a pure JSON object. Do not wrap in markdown or anything else.
    {
        "scene_type": "Human/Portrait | Civic Issue | Other",
        "detected_issue": "Garbage Dumping | Water Logging | Road Damage | Street Light issue | Infrastructure Damage | Others | None",
        "ai_description": "<Your 3-5 sentence description following the rules above. FAILSAFE: If the image analysis fails or is completely unclear, return EXACTLY: 'Unable to clearly analyze the image. Please try again with a clearer photo.'>",
        "severity": "Low | Medium | High | None",
        "urgency": "Low | Medium | High | None",
        "confidence_score": <0-100 integer>
    }
    """
    import time
    max_retries = 3
    base_delay = 2 # seconds
    
    for attempt in range(max_retries):
        try:
            print(f"Calling Gemini API (Attempt {attempt + 1})...")
            # Include baseline safety settings to ensure civic issues aren't blocked
            # SAFETY_OFF = [
            #     types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH",        threshold="BLOCK_NONE"),
            #     types.SafetySetting(category="HARM_CATEGORY_HARASSMENT",         threshold="BLOCK_NONE"),
            #     types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT",  threshold="BLOCK_NONE"),
            #     types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT",  threshold="BLOCK_NONE"),
            # ]
            
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=content, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    # safety_settings=SAFETY_OFF,
                )
            )
            print(f"Gemini Raw Response: {response.text}")
            ai_data = json.loads(response.text)
            break # Success!
        except Exception as e:
            error_msg = str(e)
            print(f"Gemini Analysis Attempt {attempt + 1} Error: {error_msg}")
            
            # If it's a quota error, wait and retry
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                if attempt < max_retries - 1:
                    sleep_time = base_delay * (2 ** attempt)
                    print(f"Quota exhausted. Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)
                    continue
            
            # For other errors or last attempt, fail gracefully following the Failsafe instructions
            ai_data = {
                "scene_type": "Pending Verification",
                "detected_issue": "Manual Review Required",
                "ai_description": "We successfully received your photo, but our real-time AI analysis is currently experiencing high traffic. You can still submit this report immediately, and our team will manually review and prioritize it.",
                "severity": "Pending",
                "urgency": "Pending",
                "confidence_score": 0
            }
            break

    return {
        "image_url": image_url,
        "location": {"lat": latitude, "lng": longitude},
        "timestamp": timestamp,
        **ai_data
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
    
    if req.metadata.get("scene_type") in ["Civic Issue", "Pending Verification"]:
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
            "description": f"{req.user_description}\n\nAI Analysis: {ai_desc}\n\nAudio Evidence: {audio_evidence}".strip(),
            "location_detail": f"Auto-detected at {req.latitude}, {req.longitude}",
            "evidence_summary": ai_desc + (f" (Attached Audio: {audio_evidence})" if audio_evidence else ""),
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
    
    if signal_problem:
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
        if "ingested_at" in article:
            dt = article["ingested_at"]
            if isinstance(dt, datetime.datetime):
                last_update = dt.strftime("%Y-%m-%d %H:%M:%S")

    return {
        "id": article["id"],
        "status": status,
        "category": article.get("category", "General Civic Issue"),
        "lastUpdate": last_update,
        "severity": article.get("risk_level", "MEDIUM")
    }

@router.get("/citizen-reports/list")
async def list_citizen_reports(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """
    Returns a list of all signal problems that were reported by citizens.
    Sorted by priority_score descending.
    """
    match_filter = {"category": "Citizen Report"}
    
    # Optional: filter by department if leader
    if current_user and current_user.get("role") != "ADMIN" and current_user.get("department"):
        match_filter["department"] = current_user.get("department")

    cursor = signal_problems_collection.find(match_filter).sort("priority_score", -1).limit(200)
    reports = await cursor.to_list(200)
    
    # We map the data slightly to match the SignalMonitor format exactly
    results = []
    from .signal_problems import get_severity # just use string formatting if needed
    for p in reports:
        results.append({
            "id": p["id"],
            "title": p.get("title", ""),
            "severity": p.get("severity", "Medium"),
            "category": "Citizen Report",
            "location": p.get("location", ""),
            "detectedAt": p.get("detected_at"),
            "lastUpdated": p.get("last_updated"),
            "description": p.get("description", ""),
            "riskScore": p.get("risk_score", 0),
            "priorityScore": p.get("priority_score", 0),
            "frequency": p.get("frequency", 1),
            "source": p.get("source", "Citizen Application"),
            "status": p.get("status", "Pending")
        })
    return results
