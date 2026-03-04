"""
Gemini AI Service — Generates realistic governance signal problems
using the Google Gemini API (new google-genai SDK).

Security: API key is loaded from environment via gemini_config.
"""
import json
import logging

from .gemini_config import gemini_client, GEMINI_MODEL

logger = logging.getLogger(__name__)


def generate_signal_problems(count: int = 5) -> list[dict]:
    """
    Use Gemini to generate `count` realistic governance signal problems.
    Returns a list of dicts ready to be inserted into the SignalProblem table.
    """
    prompt = f"""You are a Governance Intelligence AI System. Generate exactly {count} realistic governance signal problems \
that would be detected by an AI-powered governance monitoring system in India.

Each problem must be a JSON object with these exact fields:
- "id": a unique signal ID in format "SIG-XXX" (use numbers from 100 upwards to avoid conflicts)
- "title": a concise but descriptive title (max 80 chars)
- "severity": one of "Critical", "High", "Medium", "Low"
- "category": one of "Financial Integrity", "Public Sentiment", "Misinformation", "Security Breach", "Supply Chain", "Environmental", "Electoral Oversight", "Urban Planning", "Healthcare", "Education", "Law & Order", "Infrastructure", "Corruption"
- "location": a realistic Indian location with district/zone detail (e.g., "District Gamma — Medical Hub 3")
- "detected_at": an ISO 8601 timestamp in February 2026
- "description": a detailed 3-4 sentence technical description explaining what the AI system detected, the evidence, and recommended action. Make it sound like a real AI monitoring system report with specific numbers and technical details.
- "risk_score": a number between 0 and 100
- "source": the name of the AI subsystem that detected it (e.g., "Financial Anomaly Detector v3.1", "Sentiment Pulse Network", etc.)
- "status": always "Pending"

Return ONLY a valid JSON array with exactly {count} objects. No markdown, no explanation, just the JSON array.
Make the problems diverse across categories and severity levels. Include specific numbers, percentages, and technical details to make them realistic."""

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        # Extract the text and parse JSON
        text = response.text.strip()

        # Remove markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            elif "```" in text:
                text = text[:text.rfind("```")]
            text = text.strip()

        problems = json.loads(text)

        # Validate and clean up
        valid_problems = []
        for p in problems:
            valid_problems.append({
                "id": str(p.get("id", "SIG-100")),
                "title": str(p.get("title", "Unknown Signal"))[:500],
                "severity": p.get("severity", "Medium"),
                "category": str(p.get("category", "Unknown"))[:200],
                "location": str(p.get("location", "Unknown"))[:300],
                "detected_at": str(p.get("detected_at", "2026-02-25T12:00:00Z"))[:50],
                "description": str(p.get("description", "")),
                "risk_score": float(p.get("risk_score", 50)),
                "source": str(p.get("source", "AI Monitor"))[:300],
                "status": "Pending",
            })

        return valid_problems

    except Exception as e:
        logger.error("[GEMINI ERROR] %s", e)
        return []
