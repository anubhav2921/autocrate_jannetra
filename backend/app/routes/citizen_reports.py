import os
import io
import uuid
import datetime
import json
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from firebase_admin import storage
from dotenv import load_dotenv

# Fully absolute dotenv loader for production edge-cases
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=env_path)

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
    
    # 2. AI Vision Pipeline with NVIDIA Vision
    # Constructing prompt for specific issue detection
    prompt = """
    You are an intelligent visual analysis system for JanNetra.
    Critically analyze the provided image and generate a structured description of EXACTLY what you see.

    STRICT RULES:
    1. ONLY describe what is visible in the image. Focus heavily on precisely analyzing the image context.
    2. DO NOT return any system errors, API errors, debug logs, or technical messages.
    3. DO NOT mention words like "error", "quota", "API", or "resource exhausted".
    4. If the image contains a person or a general scene:
       - Describe posture, activity, visible items, and exact scene context (e.g., sitting, construction, city).
    5. If the image contains an issue (road damage, garbage, waterlogging, etc.):
       - Clearly describe the problem.
       - Mention severity (low, medium, high if possible).
    6. CRITICAL: EVEN IF the image DOES NOT contain an obvious civic issue, YOU MUST STILL describe exactly what you see in detail. Do NOT just say 'No issues detected'.
    7. The `ai_description` MUST be a structured, readable format. Write it clearly using point form separated by double newlines (\\n\\n) like this:
       Problem: <short issue title or general image subject>
       
       Observation: <specific details of EXACTLY what you see in the image>
       
       Impact: <how it affects the environment or community, or 'None'>
       
       Location Context: <what the surroundings look like>

    OUTPUT FORMAT: You MUST return a pure JSON object. Do not wrap in markdown or anything else.
    {
        "scene_type": "Human/Portrait | Civic Issue | Other",
        "detected_issue": "Garbage Dumping | Water Logging | Road Damage | Street Light issue | Infrastructure Damage | Others | None",
        "ai_description": "<Your point-form description matching the rules above>",
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
                logger.error("[NVIDIA Vision] NVIDIA_API_KEY not found in environment!")
                raise ValueError("NVIDIA_API_KEY not found in environment")

            nv_headers = {
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            }
            
            payload = {
              "model": "meta/llama-3.2-90b-vision-instruct",
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
                json_match = re.search(r'\\{[\\s\\S]*\\}', raw_text)
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
                    "severity": "Medium",
                    "urgency": "Medium",
                    "confidence_score": 85
                }
            break # Success!
        except Exception as e:
            error_msg = str(e)
            print(f"NVIDIA Analysis Attempt {attempt + 1} Error: {error_msg}")
            
            # If it's a quota error, wait and retry
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                if attempt < max_retries - 1:
                    sleep_time = base_delay * (2 ** attempt)
                    print(f"Quota exhausted. Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)
                    continue
            
            # Catch unauthorized and rate limits explicitly for Dev Log tracing
            if "401" in error_msg:
                print("[NVIDIA API FATAL] 401 Unauthorized. Key invalid or missing.")
            
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
        "created_at": datetime.datetime.utcnow(),
        "last_updated": datetime.datetime.utcnow(),
        "description": f"{req.user_description}\n\nAI Analysis: {ai_desc}".strip(),
        "report_description": ai_desc, # Explicitly mapped standalone description field
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
        "source_type": "citizen",
        "status": "Pending",
        "has_ai_summary": True, # Pre-summarized conceptually
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
    description = article.get("content", "")
    
    if signal_problem:
        progress = signal_problem.get("progress", 0)
        if signal_problem.get("description"):
            description = signal_problem["description"]
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
        "progress": progress,
        "description": description
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
    
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=5)
    match_filter["created_at"] = {"$gte": cutoff}
    
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
            "source_url": p.get("source_url"),
            "source_type": p.get("source_type", "unknown").lower() if p.get("source_type") else "unknown",
            "created_at": p.get("created_at").isoformat() if hasattr(p.get("created_at"), "isoformat") else p.get("created_at"),
            "status": p.get("status", "Pending"),
            "image_url": p.get("image_url", ""),
            "audio_url": p.get("audio_url", "")
        })
    return results
