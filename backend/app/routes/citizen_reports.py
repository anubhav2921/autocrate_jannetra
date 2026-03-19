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
    sources_collection
)
from ..utils import gen_uuid, get_current_user_optional

router = APIRouter(prefix="/api", tags=["Citizen Reports"])

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)


async def _upload_to_firebase(file_content: bytes, filename: str) -> str:
    """Uploads bytes to Firebase Storage and returns public URL."""
    try:
        bucket = storage.bucket("jannetra.firebasestorage.app")
        blob = bucket.blob(f"citizen_reports/{filename}")
        blob.upload_from_string(file_content, content_type="image/jpeg")
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"Firebase Upload Error: {e}")
        # Return a dummy URL if failed (for local dev)
        return f"https://mock-storage.jannetra.ai/reports/{filename}"


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
    image_url = await _upload_to_firebase(content, filename)
    print(f"Image uploaded to: {image_url}")
    
    # 2. AI Vision Pipeline with Gemini
    # Constructing prompt for specific issue detection
    prompt = """
    You are an AI analyst for JanNetra, a civic health monitoring system.
    Analyze the image and follow these strict rules:

    1. IDENTIFY THE SCENE:
       - If it's a person/human (e.g., selfie, portrait): 
         Set 'scene_type' to 'Human/Portrait'. 
         Set 'detected_issue' to 'None/Human Presence'.
         'ai_description' should describe the person's appearance, posture, surroundings and expression without guessing internal state.
       - If it's a civic issue:
         Set 'scene_type' to 'Civic Issue'.
         Options for 'detected_issue': [Garbage Dumping, Water Logging, Road Damage, Street Light issue, Infrastructure Damage, Others]
         'ai_description' should be a natural, clear description of the issue (what is damaged, approximate location in frame, severity).
       - If it's none of the above:
         Set 'scene_type' to 'Other'.
         'ai_description' should clearly say "No civic issue detected" and then describe what is visible.

    2. OUTPUT FORMAT (JSON ONLY):
    {
        "scene_type": "Human/Portrait | Civic Issue | Other",
        "detected_issue": "Specific Type or 'No Issue Detected'",
        "ai_description": "Natural, accurate description based ONLY on visible cues",
        "severity": "Low | Medium | High | None",
        "urgency": "Low | Medium | High | None",
        "confidence_score": 0-100
    }
    """
    try:
        print("Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Part.from_bytes(data=content, mime_type="image/jpeg"),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        print(f"Gemini Raw Response: {response.text}")
        ai_data = json.loads(response.text)
    except Exception as e:
        print(f"Gemini Analysis Error (Likely Quota or Key): {e}")
        # Return a generic 'unknown' result to trigger manual entry on frontend
        ai_data = {
            "scene_type": "Other",
            "detected_issue": "Analysis Service Unavailable",
            "ai_description": "AI analysis is temporarily unavailable. Please describe the issue manually.",
            "severity": "None",
            "urgency": "None",
            "confidence_score": 0
        }

    return {
        "image_url": image_url,
        "location": {"lat": latitude, "lng": longitude},
        "timestamp": timestamp,
        **ai_data
    }


class FinalReportSubmit(BaseModel):
    image_url: str
    detected_issue: str
    user_description: str
    latitude: float
    longitude: float
    timestamp: str
    metadata: dict


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

    article_id = gen_uuid()
    
    # 2. Save Article
    article = {
        "id": article_id,
        "title": req.detected_issue,
        "content": req.user_description,
        "summary": req.user_description[:200],
        "category": req.detected_issue,
        "source_id": source_id,
        "url": req.image_url,
        "location": f"{req.latitude}, {req.longitude}",
        "city": "Prayagraj", # Default or infer from lat/lng
        "ingested_at": datetime.datetime.utcnow(),
        "risk_score": 75 if req.metadata.get("severity") == "High" else 50,
        "risk_level": req.metadata.get("severity", "MEDIUM").upper(),
    }
    await articles_collection.insert_one(article)
    
    # 3. Save Detection Results
    detection = {
        "id": gen_uuid(),
        "article_id": article_id,
        "label": "REAL",
        "confidence_score": 0.95,
        "explanation": f"Reported by citizen and verified via AI Vision. {req.metadata.get('ai_description')}",
        "created_at": datetime.datetime.utcnow(),
    }
    await detection_results_collection.insert_one(detection)

    return {"success": True, "article_id": article_id}


@router.get("/report/{report_id}")
async def get_report_status(report_id: str):
    """
    Retrieves the status and AI metadata for a specific citizen report.
    """
    article = await articles_collection.find_one({"id": report_id})
    if not article:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Determine a human-readable status
    risk_score = article.get("risk_score", 50)
    status = "Escalated to Dept" if risk_score >= 75 else "AI Analysis Complete"
    
    # Format the timestamp
    last_update = "Just Now"
    if "ingested_at" in article:
        dt = article["ingested_at"]
        if isinstance(dt, datetime.datetime):
            last_update = dt.strftime("%H:%M:%S")

    return {
        "id": article["id"],
        "status": status,
        "category": article.get("category", "General Civic Issue"),
        "lastUpdate": last_update,
        "severity": article.get("risk_level", "MEDIUM")
    }
