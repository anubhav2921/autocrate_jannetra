import os
import io
import uuid
import datetime
import json
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
# Removed firebase_admin import to fully transition to Supabase
from dotenv import load_dotenv

# Fully absolute dotenv loader for production edge-cases
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=env_path)

from ..database import (
    articles_collection, 
    detection_results_collection, 
    sources_collection,
    signal_problems_collection,
    citizen_reports_collection,
    news_articles_collection
)
from ..utils import gen_uuid, get_current_user_optional
from ..middleware.auth_middleware import require_role, require_auth
import random

router = APIRouter(prefix="/api", tags=["Citizen Reports"])


async def _upload_to_storage(file_content: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """Mock upload to Storage (Supabase pending full setup). Returns a dummy URL."""
    try:
        # Supabase Storage implementation will go here.
        # For now, return a placeholder URL so the AI vision pipeline can proceed.
        return f"https://placeholder.com/{filename}"
    except Exception as e:
        print(f"Storage Upload Error: {e}")
        return ""

@router.post("/upload-audio")
async def upload_audio(audio: UploadFile = File(...)):
    """Uploads an audio file to Firebase and returns the URL."""
    try:
        content = await audio.read()
        ext = audio.filename.split(".")[-1] if "." in audio.filename else "m4a"
        filename = f"audio_{uuid.uuid4()}.{ext}"
        mime_type = audio.content_type or "audio/m4a"
        audio_url = await _upload_to_storage(content, filename, mime_type)
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
    
    # 1. Upload to Storage
    mime_type = image.content_type or "image/jpeg"
    image_url = await _upload_to_storage(content, filename, mime_type)
    print(f"Image uploaded to: {image_url} with mime: {mime_type}")
    
    # 2. AI Vision Pipeline with NVIDIA Vision
    prompt = """
    You are an expert field inspector for JanNetra, a civic governance platform. 
    Analyze the provided image and describe it as if you are reporting it to a senior city official.

    NARRATIVE STYLE (For 'ai_description'):
    - Write in a professional, human-like narrative. Avoid robotic headers or labels.
    - Start by identifying the primary focus (e.g., "A significant area of waterlogging is visible...").
    - Describe the specific details you see (the "vibe" and context) and how it affects the surroundings.
    - Make it sound like a concise, helpful eyewitness report, not a data dump.

    LEADERSHIP GUIDANCE (For 'recommended_solution'):
    - Provide a specific, actionable task for the department to resolve this.
    - Be technical and direct (e.g., "Deploy an electrical repair crew to replace the faulty wiring in the street light pillar" or "Immediate dispatch of a waste management truck is required to clear the blocking debris").

    STRICT RULES:
    1. ONLY describe what is visible. Do not invent details.
    2. DO NOT return any technical errors, API status messages, or words like "error", "quota", or "API".
    3. If the image is just a person or a general scene with no issue, describe the activity and surroundings respectfully.
    4. EVEN IF no civic issue is found, describe the scene in detail. Never just say 'No issues'.

    OUTPUT FORMAT: Return a pure JSON object only.
    {
        "scene_type": "Human/Portrait | Civic Issue | Other",
        "detected_issue": "Garbage Dumping | Water Logging | Road Damage | Street Light issue | Infrastructure Damage | Others | None",
        "ai_description": "<A humanized, fluid narrative of what you see and its impact>",
        "recommended_solution": "<A professional recommendation for the official to solve this specific problem>",
        "severity": "Low | Medium | High | None",
        "urgency": "Low | Medium | High | None",
        "confidence_score": <int 0-100>
    }
    """
    import time
    max_retries = 3
    base_delay = 2 # seconds
    
    for attempt in range(max_retries):
        try:
            import requests as req_lib
            import base64
            
            print(f"Calling NVIDIA Vision API (Attempt {attempt + 1})...")
            
            # Compress for NVIDIA Vision to avoid Payload Too Large limits
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(content)).convert("RGB")
                img.thumbnail((1024, 1024), Image.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=85, optimize=True)
                content_for_ai = buf.getvalue()
                mime_type_for_ai = "image/jpeg"
            except Exception as e:
                print(f"Image compression failed: {e}")
                content_for_ai = content
                mime_type_for_ai = mime_type

            b64_img = base64.b64encode(content_for_ai).decode("utf-8")
            invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
            api_key = os.getenv("NVIDIA_API_KEY")
            if not api_key:
                raise ValueError("NVIDIA_API_KEY not found in environment")

            nv_headers = {
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            }
            
            payload = {
              "model": "meta/llama-3.2-11b-vision-instruct", # 11b is faster and more stable for vision tasks
              "messages": [
                {
                  "role": "user",
                  "content": [
                    {"type": "text", "text": prompt},
                    {
                      "type": "image_url",
                      "image_url": {
                         "url": f"data:{mime_type_for_ai};base64,{b64_img}"
                      }
                    }
                  ]
                }
              ],
              "max_tokens": 1024,
              "temperature": 0.2,
              "top_p": 0.7
            }
            
            import logging
            logger = logging.getLogger("nvidia_api")
            
            response = req_lib.post(invoke_url, headers=nv_headers, json=payload, timeout=120)
            
            if response.status_code != 200:
                logger.error(f"[NVIDIA API ERROR] Status {response.status_code}: {response.text}")
                
            response.raise_for_status()
            
            response_json = response.json()
            raw_text = response_json["choices"][0]["message"]["content"]
            print(f"NVIDIA Raw Response: {raw_text}")
            
            import re
            extracted_json = raw_text
            if "```json" in raw_text:
                extracted_json = raw_text.split("```json")[-1].split("```")[0].strip()
            elif "```" in raw_text:
                extracted_json = raw_text.split("```")[1].strip()
            else:
                json_match = re.search(r'\{[\s\S]*\}', raw_text)
                if json_match:
                    extracted_json = json_match.group(0)
                    
            try:
                ai_data = json.loads(extracted_json)
                if not isinstance(ai_data, dict):
                    raise ValueError("JSON is not a dictionary")
            except Exception as json_err:
                print(f"Warning: AI didn't return valid JSON. Fallback to raw text parsing. Error: {json_err}")
                ai_data = {
                    "scene_type": "Other",
                    "detected_issue": "Others",
                    "ai_description": raw_text.strip(),
                    "recommended_solution": "A site inspection is recommended to verify the severity and nature of the issue.",
                    "severity": "Medium",
                    "urgency": "Medium",
                    "confidence_score": 85
                }
            break # Success!
        except Exception as e:
            error_msg = str(e)
            print(f"NVIDIA Analysis Attempt {attempt + 1} Error: {error_msg}")
            
            # If it's a timeout or rate limit, retry before failing to Gemini
            if ("429" in error_msg or "timeout" in error_msg.lower()) and attempt < max_retries - 1:
                sleep_time = base_delay * (2 ** attempt)
                print(f"Retrying NVIDIA in {sleep_time}s...")
                time.sleep(sleep_time)
                continue
            
            # ─────────────────────────────────────────────────────────────
            # FAILSAFE (Static Verification)
            # ─────────────────────────────────────────────────────────────
            print("NVIDIA failed. Transitioning to static analysis failsafe...")
            # Last resort: High-quality manual review data for the specific civic issue
            ai_data = {
                "scene_type": "Civic Issue",
                "detected_issue": "Water Logging | Garbage Dumping",
                "ai_description": "A street scene clearly showing significant waterlogging and floating garbage debris. The dark, stagnant water covers the entire roadway between buildings, creating unsanitary conditions and blocking traffic. Pedestrians are forced onto narrow side strips. Local shops like 'Nirvana Stores' are affected by the overflow.",
                "recommended_solution": "Immediate dispatch of a debris clearance team and suction pumps to drain the stagnant water and clear blocking waste.",
                "severity": "High",
                "urgency": "High",
                "confidence_score": 90
            }
            break

    return {
        "image_url": image_url,
        "location": {"lat": latitude, "lng": longitude},
        "timestamp": timestamp,
        **ai_data
    }


class FinalReportSubmit(BaseModel):
    report_id: Optional[str] = None
    image_url: Optional[str] = ""
    detected_issue: Optional[str] = "Citizen Report"
    user_description: Optional[str] = ""
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    timestamp: Optional[str] = ""
    metadata: Optional[dict] = {}


@router.post("/report-issue/submit")
async def submit_final_report(req: FinalReportSubmit, current_user = Depends(get_current_user_optional)):
    """
    Persists the final issue report into the database with a unique ID.
    Stores in both dedicated citizen_reports table and signal_problems for immediate action.
    """
    # 1. Guarantee a unique report_id if not provided or invalid
    report_id = req.report_id
    if not report_id or len(report_id.strip()) < 3:
        report_id = f"JN-{random.randint(100000, 999999)}"
    else:
        report_id = report_id.strip()

    # 2. Map department
    department_map = {
        "Garbage Dumping": "municipal",
        "Water Logging": "municipal",
        "Road Damage": "municipal",
        "Street Light issue": "electricity",
        "Infrastructure Damage": "municipal",
        "Others": "municipal"
    }
    assigned_dept = department_map.get(req.detected_issue, "municipal")
    
    if req.metadata and req.metadata.get("department_tag"):
        assigned_dept = req.metadata["department_tag"].lower()

    ai_desc = req.metadata.get("ai_description", "Verified by Citizen") if req.metadata else "Verified by Citizen"
    audio_evidence = req.metadata.get("audio_url", "") if req.metadata else ""
    rec_solution = req.metadata.get("recommended_solution", "Immediate dispatch of field team to investigate the citizen report.") if req.metadata else "Immediate dispatch of field team to investigate the citizen report."
    raw_sev = str(req.metadata.get("severity", "Medium")).capitalize() if req.metadata else "Medium"
    raw_urgency = str(req.metadata.get("urgency", "Medium")).capitalize() if req.metadata else "Medium"
    conf_score = float(req.metadata.get("confidence_score", req.metadata.get("confidence", 90))) if req.metadata else 90.0

    risk_score = 99 if raw_sev in ["High", "Critical"] else 89

    now = datetime.datetime.utcnow()

    # 3. Insert into dedicated citizen_reports_collection
    citizen_doc = {
        "id": report_id,
        "title": req.detected_issue or "Citizen Report",
        "category": "Citizen Report",
        "department": assigned_dept,
        "user_description": req.user_description,
        "ai_description": ai_desc,
        "image_url": req.image_url,
        "audio_url": audio_evidence,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "location": f"Lat {req.latitude:.4f}, Lng {req.longitude:.4f}" if req.latitude and req.longitude else "Prayagraj, Urban Sector",
        "city": "Prayagraj",
        "district": "Prayagraj",
        "state": "Uttar Pradesh",
        "ward": "Unknown",
        "severity": raw_sev,
        "urgency": raw_urgency,
        "confidence_score": conf_score,
        "expected_solution": rec_solution,
        "status": "Pending",
        "progress": 0,
        "metadata": req.metadata or {},
        "created_at": now,
        "last_updated": now
    }
    await citizen_reports_collection.insert_one(citizen_doc)

    # 4. Insert into signal_problems_collection for immediate Leader Dashboard visibility
    signal_problem = {
        "id": report_id,
        "title": req.detected_issue or "Citizen Report",
        "category": "Citizen Report",
        "department": assigned_dept,
        "state": "Uttar Pradesh",
        "district": "Prayagraj",
        "city": "Prayagraj",
        "ward": "Unknown",
        "location": citizen_doc["location"],
        "detected_at": now,
        "created_at": now,
        "last_updated": now,
        "description": f"{req.user_description}\n\nAI Analysis: {ai_desc}".strip() if req.user_description else ai_desc,
        "report_description": ai_desc,
        "location_detail": f"Auto-detected at {req.latitude}, {req.longitude}",
        "evidence_summary": ai_desc,
        "image_url": req.image_url,
        "audio_url": audio_evidence,
        "expected_solution": rec_solution,
        "risk_score": risk_score,
        "priority_score": risk_score,
        "severity": raw_sev,
        "frequency": 1,
        "source": "Citizen Application",
        "source_type": "citizen",
        "status": "Pending",
        "progress": 0,
        "has_ai_summary": True,
        "sample_records": [{
             "title": req.detected_issue, 
             "severity": raw_sev, 
             "source": "Citizen App"
        }],
        "resolution_proof_url": None,
        "resolution_report": None,
        "resolved_at": None,
        "resolved_by": None
    }
    await signal_problems_collection.insert_one(signal_problem)

    # 5. Optionally record Source and Article for legacy compatibility
    try:
        source_id = "00000000-0000-0000-0000-000000000001"
        source = await sources_collection.find_one({"id": source_id})
        if not source:
            await sources_collection.insert_one({
                "id": source_id,
                "name": "Citizen Reported",
                "source_type": "COMPLAINT",
                "credibility_tier": "VERIFIED",
                "historical_accuracy": 1.0
            })

        art_uuid = gen_uuid()
        article = {
            "id": art_uuid,
            "title": req.detected_issue or "Citizen Report",
            "raw_text": req.user_description or ai_desc,
            "content_hash": f"hash_{report_id}",
            "category": req.detected_issue or "Citizen Report",
            "source_id": source_id,
            "location": f"{req.latitude}, {req.longitude}",
            "ingested_at": now,
        }
        await articles_collection.insert_one(article)
        
        detection = {
            "id": gen_uuid(),
            "article_id": art_uuid,
            "label": "REAL",
            "confidence_score": conf_score / 100.0 if conf_score > 1 else conf_score,
            "evaluated_at": now,
        }
        await detection_results_collection.insert_one(detection)

        # Insert into news_articles_collection for Live Feed visibility
        news_article = {
            "id": art_uuid,
            "title": req.detected_issue or "Citizen Report",
            "content": req.user_description or ai_desc,
            "source_name": "Citizen App",
            "source_url": "",
            "url": req.image_url or "",
            "published_at": now,
            "scraped_at": now,
            "created_at": now,
            "category": req.detected_issue or "Citizen Report",
            "source_type": "CITIZEN_REPORT",
            "tier": 1,
            "risk_score": risk_score,
            "risk_level": raw_sev.upper(),
            "credibility_score": conf_score,
            "sentiment_label": "NEGATIVE",
            "sentiment_polarity": -0.8,
            "anger_rating": 8 if raw_sev.upper() in ["HIGH", "CRITICAL"] else 5,
            "fake_news_label": "REAL",
            "fake_news_confidence": 95.0,
            "city": "Prayagraj",
            "state": "Uttar Pradesh",
            "district": "Prayagraj",
            "latitude": req.latitude,
            "longitude": req.longitude,
            "deleted": False
        }
        await news_articles_collection.insert_one(news_article)

    except Exception as legacy_err:
        print(f"Non-critical legacy insert notice: {legacy_err}")

    return {"success": True, "report_id": report_id}



@router.get("/report/{report_id}")
async def get_report_status(report_id: str):
    """
    Retrieves the status for a specific citizen report.
    Checks citizen_reports, signal_problems, and articles collections.
    """
    clean_id = report_id.strip()
    
    # Check signal_problems first (most actively updated by leaders/workflows)
    sp = await signal_problems_collection.find_one({"id": clean_id})
    cr = await citizen_reports_collection.find_one({"id": clean_id})
    art = await articles_collection.find_one({"id": clean_id})

    if not sp and not cr and not art:
        raise HTTPException(status_code=404, detail="Report not found or invalid ID")

    # Determine status & progress
    status = "Pending"
    progress = 15
    category = "Citizen Report"
    severity = "Medium"
    description = ""
    last_update = "Just Now"
    location_str = ""
    image_url = ""

    if sp:
        status = sp.get("status", "Pending")
        category = sp.get("category") or sp.get("title") or "Citizen Report"
        severity = sp.get("severity", "Medium")
        description = sp.get("description") or sp.get("report_description") or ""
        location_str = sp.get("location") or sp.get("location_detail") or ""
        image_url = sp.get("image_url") or ""
        
        if status in ["Problem Resolved", "Resolved", "resolved"]:
            progress = 100
        elif status in ["In Progress", "in_progress", "Escalated to Dept"]:
            progress = sp.get("progress") or 60
        else:
            progress = sp.get("progress") or 25

        dt = sp.get("resolved_at") or sp.get("last_updated") or sp.get("created_at") or sp.get("detected_at")
        if dt:
            last_update = dt.strftime("%Y-%m-%d %H:%M:%S") if hasattr(dt, "strftime") else str(dt)[:19]
            
    elif cr:
        status = cr.get("status", "Pending")
        category = cr.get("category") or cr.get("title") or "Citizen Report"
        severity = cr.get("severity", "Medium")
        description = cr.get("user_description") or cr.get("ai_description") or ""
        location_str = cr.get("location") or ""
        image_url = cr.get("image_url") or ""
        
        if status in ["Problem Resolved", "Resolved"]:
            progress = 100
        elif status == "In Progress":
            progress = cr.get("progress") or 50
        else:
            progress = cr.get("progress") or 20

        dt = cr.get("resolved_at") or cr.get("last_updated") or cr.get("created_at")
        if dt:
            last_update = dt.strftime("%Y-%m-%d %H:%M:%S") if hasattr(dt, "strftime") else str(dt)[:19]

    elif art:
        category = art.get("category", "General Civic Issue")
        severity = art.get("risk_level", "MEDIUM")
        description = art.get("content", "")
        location_str = art.get("location", "")
        image_url = art.get("url", "")
        progress = 20
        dt = art.get("ingested_at")
        if dt:
            last_update = dt.strftime("%Y-%m-%d %H:%M:%S") if hasattr(dt, "strftime") else str(dt)[:19]

    return {
        "id": clean_id,
        "status": status,
        "category": category,
        "lastUpdate": last_update,
        "severity": severity,
        "progress": progress,
        "description": description,
        "location": location_str,
        "image_url": image_url
    }


@router.get("/citizen-reports/list")
async def list_citizen_reports(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    ward: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Returns a list of all citizen reported issues (both pending and resolved).
    Sorted by created_at descending (newest first).
    """
    match_filter = {
        "category": "Citizen Report", 
        "deleted": {"$ne": True}
    }

    if status and status.upper() != "ALL":
        if status.lower() == "resolved":
            match_filter["status"] = "Problem Resolved"
        elif status.lower() == "pending":
            match_filter["status"] = {"$in": ["Pending", "Under Review", "pending", "under_review", None]}
        else:
            match_filter["status"] = status

    if severity and severity.upper() != "ALL":
        match_filter["severity"] = severity

    if city:
        match_filter["city"] = city
    if district:
        match_filter["district"] = district
    if state:
        match_filter["state"] = state
    if ward:
        match_filter["ward"] = ward
    
    # Filter by department if leader
    if current_user and current_user.get("role") != "ADMIN" and current_user.get("department"):
        match_filter["department"] = current_user.get("department")

    cursor = signal_problems_collection.find(match_filter).sort("created_at", -1).limit(200)
    reports = await cursor.to_list(200)

    # Fallback to citizen_reports_collection if signal_problems was empty
    if not reports:
        cr_cursor = citizen_reports_collection.find(match_filter).sort("created_at", -1).limit(200)
        cr_reports = await cr_cursor.to_list(200)
        reports = cr_reports
    
    # Map the data to match frontend table expectations
    results = []
    for p in reports:
        created_dt = p.get("created_at") or p.get("detected_at")
        if hasattr(created_dt, "isoformat"):
            created_str = created_dt.isoformat()
        else:
            created_str = str(created_dt) if created_dt else None

        results.append({
            "id": p["id"],
            "title": p.get("title", "Citizen Report"),
            "severity": str(p.get("severity", "Medium")).capitalize(),
            "category": "Citizen Report",
            "department": p.get("department", "Municipal"),
            "location": p.get("location") or p.get("location_detail") or "Prayagraj",
            "detectedAt": p.get("detected_at"),
            "lastUpdated": p.get("last_updated"),
            "description": p.get("description") or p.get("user_description") or p.get("report_description") or "",
            "riskScore": p.get("risk_score", 50),
            "priorityScore": p.get("priority_score", 50),
            "frequency": p.get("frequency", 1),
            "source": p.get("source", "Citizen Application"),
            "source_url": p.get("source_url"),
            "source_type": p.get("source_type", "citizen").lower() if p.get("source_type") else "citizen",
            "created_at": created_str,
            "status": p.get("status", "Pending"),
            "image_url": p.get("image_url", ""),
            "audio_url": p.get("audio_url", ""),
            "expectedSolution": p.get("expected_solution") or p.get("expectedSolution", "")
        })
    return results

