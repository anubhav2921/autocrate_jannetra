from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..services.nlp_service import run_nlp_pipeline
from ..services.fake_news_detector import detect_fake_news
from ..services.gri_service import compute_gri
from ..services.alert_service import generate_alert

router = APIRouter(prefix="/api", tags=["Scanner"])


class ScanRequest(BaseModel):
    text: str
    platform: str = "unknown"
    source_url: str = ""
    source_credibility: float = 0.3  # social media default low


@router.post("/scan")
def scan_post(req: ScanRequest, db: Session = Depends(get_db)):
    """Run a pasted social media post through the full analysis pipeline."""
    if len(req.text.strip()) < 10:
        return {"success": False, "error": "Text too short. Paste at least 10 characters."}

    # 1. NLP Pipeline
    nlp = run_nlp_pipeline(req.text)

    # 2. Fake News Detection
    detection = detect_fake_news(
        text=req.text,
        source_credibility=req.source_credibility,
        source_type=_platform_to_type(req.platform),
    )

    # 3. GRI Scoring
    gri = compute_gri(
        detection_features=detection.get("features", {}),
        source_credibility=req.source_credibility,
        source_type=_platform_to_type(req.platform),
        nlp_result=nlp,
    )

    # 4. Alert Assessment
    category = _guess_category(req.text)
    location = _extract_location(nlp)
    is_fake = detection.get("label", "UNCERTAIN") == "FAKE"
    alert = generate_alert(
        category=category,
        location=location,
        gri_score=gri["gri_score"],
        anger_rating=nlp.get("anger_rating", 0),
        is_fake=is_fake,
    )

    return {
        "success": True,
        "analysis": {
            "nlp": {
                "sentiment": nlp.get("sentiment_label", "NEUTRAL"),
                "polarity": nlp.get("polarity", 0),
                "subjectivity": nlp.get("subjectivity", 0),
                "anger_rating": nlp.get("anger_rating", 0),
                "word_count": nlp.get("word_count", 0),
                "entities": nlp.get("entities", {}),
                "claims": nlp.get("claims", []),
            },
            "fake_news": {
                "label": detection.get("label", "UNCERTAIN"),
                "confidence": detection.get("confidence", 0),
                "signals": detection.get("features", {}),
            },
            "gri": {
                "score": gri["gri_score"],
                "risk_level": gri["risk_level"],
                "components": gri.get("component_scores", {}),
            },
            "alert": alert if alert else None,
            "platform": req.platform,
        },
    }


def _platform_to_type(platform: str) -> str:
    mapping = {
        "instagram": "SOCIAL_MEDIA",
        "twitter": "SOCIAL_MEDIA",
        "x": "SOCIAL_MEDIA",
        "facebook": "SOCIAL_MEDIA",
        "whatsapp": "SOCIAL_MEDIA",
        "news": "NEWS",
        "complaint": "COMPLAINT",
    }
    return mapping.get(platform.lower(), "SOCIAL_MEDIA")


def _guess_category(text: str) -> str:
    t = text.lower()
    categories = {
        "Water": ["water", "supply", "pipeline", "tanker", "drought", "contaminated"],
        "Infrastructure": ["road", "bridge", "building", "construction", "pothole"],
        "Healthcare": ["hospital", "doctor", "medicine", "health", "disease", "dengue"],
        "Education": ["school", "teacher", "student", "education", "exam"],
        "Law & Order": ["police", "crime", "theft", "murder", "violence", "mob"],
        "Corruption": ["corrupt", "bribe", "scam", "fraud", "embezzle"],
        "Environment": ["pollution", "environment", "forest", "waste", "garbage"],
        "Sanitation": ["sanitation", "sewer", "drain", "toilet", "clean"],
        "Transport": ["traffic", "transport", "bus", "metro", "railway"],
    }
    for cat, keywords in categories.items():
        if any(k in t for k in keywords):
            return cat
    return "General"


def _extract_location(nlp: dict) -> str:
    locs = nlp.get("entities", {}).get("locations", [])
    return locs[0] if locs else "Unknown"
