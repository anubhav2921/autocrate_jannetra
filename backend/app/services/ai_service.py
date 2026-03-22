"""
AI Service — Provides safe fallbacks for previously AI-reliant features.
Returns mocked or static data to ensure the application continues running without breaking.
"""
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime

VALID_SEVERITIES = {"Critical", "High", "Medium", "Low"}
VALID_CATEGORIES = {
    "Civil Infrastructure", "Road & Traffic", "Accidents & Emergencies",
    "Crime", "Social & Human Rights", "Public Health & Safety",
    "Environmental", "Animal Related", "Governance & Corruption",
    "Digital/Cyber", "Suspicious Activities",
}

def generate_signal_problems(count: int = 5) -> list[dict]:
    """Fallback: Generates mock signal problems."""
    results = []
    for i in range(count):
        results.append({
            "id": f"SIG-MOCK-{uuid.uuid4().hex[:4]}",
            "title": "AI Service Disabled - Fallback Mock Problem",
            "severity": "Medium",
            "category": "Civil Infrastructure",
            "location": "System Fallback Location",
            "detected_at": datetime.utcnow().isoformat() + "Z",
            "description": "This is a fallback mocked issue due to the removal of the AI API.",
            "risk_score": 50,
            "source": "Fallback AI Mock",
            "status": "Pending",
        })
    return results

def summarize_problem_cluster(
    title: str,
    category: str,
    location: str,
    samples: list[dict],
) -> Optional[dict]:
    """Fallback: Returns static summary."""
    return {
        "description": f"Fallback summary for {title}. AI analysis is disabled.",
        "location_detail": location,
        "evidence_summary": "Evidence summary temporarily unavailable.",
        "expected_solution": "Please investigate manually. AI suggestions are disabled."
    }

def summarize_news_article(
    title: str,
    category: str,
    location: str,
    content: str,
) -> Optional[dict]:
    """Fallback: Returns static summary for news."""
    return {
        "description": f"News article summary: {title} (AI disabled).",
        "location_detail": location,
        "evidence_summary": "Extracted facts from article are unavailable.",
        "expected_solution": "Further evaluation required."
    }

def structure_single_problem(
    title: str,
    category: str,
    location: str,
    description: str,
) -> Optional[dict]:
    """Fallback: Returns static structure."""
    return {
        "description": description or f"Fallback description for {title}",
        "location_detail": location,
        "evidence_summary": "Single problem evidence (Fallback).",
        "expected_solution": "Manual resolution steps needed."
    }
