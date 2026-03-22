"""
System Monitoring AI Service — Fallback structure.
Uses mocked data as AI API is removed.
"""
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime

# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def generate_system_metrics(count: int = 5) -> List[Dict[str, Any]]:
    """
    Fallback: Generate mock system metrics.
    """
    results = []
    for i in range(count):
        results.append({
            "id": f"SYS-{100 + i}",
            "subsystem_name": "Mock Network Subsystem",
            "metric_type": "CPU Usage",
            "status": "Warning",
            "current_value": 85.0,
            "threshold_value": 80.0,
            "unit": "%",
            "location": "Mock Hub 1",
            "ai_diagnosis": "AI analysis unavailable. (AI Removed)",
            "ai_recommendation": "Manual check recommended.",
            "last_checked_at": datetime.utcnow().isoformat() + "Z",
            "trend": "Stable"
        })
    return results

def analyze_system_metric(metric: dict) -> dict:
    """
    Fallback: Static response for metric analysis.
    """
    return {
        "diagnosis": "AI diagnostics are disabled.",
        "recommendation": "Please perform a manual review of this metric."
    }

