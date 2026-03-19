"""
System Monitoring AI Service — Uses Gemini to generate governance subsystem
health metrics and provide AI-powered diagnostics & recommendations.

Security: API key is loaded from environment via gemini_config.
"""
import json
import logging
import re
from typing import Optional, List, Dict, Any

from google.genai import types
from .gemini_config import gemini_client, GEMINI_MODEL

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Constants & Helpers
# --------------------------------------------------------------------------- #

SAFETY_OFF = [
    types.SafetySetting(category="HATE_SPEECH",        threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARASSMENT",          threshold="BLOCK_NONE"),
    types.SafetySetting(category="SEXUALLY_EXPLICIT",   threshold="BLOCK_NONE"),
    types.SafetySetting(category="DANGEROUS_CONTENT",   threshold="BLOCK_NONE"),
]

def _strip_fences(text: str) -> str:
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.DOTALL).strip()

def _call_gemini(prompt: str, max_output_tokens: int = 2048) -> Optional[str]:
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=max_output_tokens,
                temperature=0.7,
                safety_settings=SAFETY_OFF,
            ),
        )
        return response.text.strip()
    except Exception as exc:
        logger.error("[GEMINI-SYS] API call failed: %s", exc, exc_info=True)
        return None

def _parse_json(text: str, context: str = "") -> Optional[Any]:
    clean = _strip_fences(text)
    try:
        return json.loads(clean)
    except json.JSONDecodeError as exc:
        logger.error("[GEMINI-SYS] JSON parse error (%s): %s\nRaw text: %.300s", context, exc, clean)
        return None

# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def generate_system_metrics(count: int = 5) -> List[Dict[str, Any]]:
    """
    Use Gemini to generate `count` realistic governance system health metrics.
    Returns a list of dicts ready to insert into the system_metrics_collection.
    """
    prompt = f"""You are a Governance Infrastructure Monitoring AI. Generate exactly {count} realistic system health metrics \
for a Predictive Governance Intelligence & Decision Support System deployed across India.

Each metric must be a JSON object with these exact fields:
- "id": a unique ID in format "SYS-XXX" (use numbers from 100 upwards)
- "subsystem_name": name of the subsystem (e.g., "NLP Sentiment Engine", "Fraud Detection Cluster", "Citizen Portal API Gateway")
- "metric_type": one of "CPU Usage", "Memory Usage", "Latency", "Throughput", "Error Rate", "Uptime", "Disk I/O", "Network Bandwidth"
- "status": one of "Healthy", "Warning", "Critical", "Degraded"
- "current_value": a realistic number for the metric type
- "threshold_value": the alert threshold for this metric (e.g. 80.0 for CPU)
- "unit": the unit (e.g., "%", "ms", "req/s", "Mbps", "GB")
- "location": a realistic Indian DC location (e.g., "Mumbai DC-1 Rack A7", "Hyderabad Edge Node 3")
- "ai_diagnosis": 2-3 sentence technical diagnosis of the root cause
- "ai_recommendation": 2-3 sentence actionable remediation recommendation
- "last_checked_at": ISO timestamp in February 2026
- "trend": one of "Improving", "Stable", "Degrading"

Return ONLY a valid JSON array. No markdown, no explanation."""

    raw_text = _call_gemini(prompt, max_output_tokens=4096)
    if not raw_text:
        return []

    metrics_raw = _parse_json(raw_text, "generate_system_metrics")
    if not isinstance(metrics_raw, list):
        return []

    results = []
    for m in metrics_raw:
        results.append({
            "id":             str(m.get("id", f"SYS-{100 + len(results)}")),
            "subsystem_name": str(m.get("subsystem_name", "Unknown Subsystem"))[:300],
            "metric_type":    str(m.get("metric_type", "CPU Usage"))[:100],
            "status":         str(m.get("status", "Healthy")),
            "current_value":  float(m.get("current_value", 0)),
            "threshold_value":float(m.get("threshold_value", 100.0)),
            "unit":           str(m.get("unit", "%"))[:30],
            "location":       str(m.get("location", "Cloud Hub"))[:300],
            "ai_diagnosis":   str(m.get("ai_diagnosis", "Diagnosis unavailable.")),
            "ai_recommendation": str(m.get("ai_recommendation", "Manual check recommended.")),
            "last_checked_at":str(m.get("last_checked_at", "2026-02-25T12:00:00Z"))[:50],
            "trend":          str(m.get("trend", "Stable")),
        })
    return results


def analyze_system_metric(metric: dict) -> dict:
    """
    Send a single metric to Gemini for real-time AI diagnosis and recommendation.
    Returns a dict with 'diagnosis' and 'recommendation'.
    """
    prompt = f"""Analyze this system metric for a Governance Intelligence System and provide a diagnosis and recommendation.

Metric Details:
- Subsystem: {metric.get('subsystem_name', 'Unknown')}
- Metric Type: {metric.get('metric_type', 'Unknown')}
- Value: {metric.get('current_value', 0)} {metric.get('unit', '')}
- Threshold: {metric.get('threshold_value', 0)} {metric.get('unit', '')}
- Status: {metric.get('status', 'Unknown')}
- Trend: {metric.get('trend', 'Unknown')}

JSON Response exactly with:
- "diagnosis": 3-5 sentence technical analysis and impact
- "recommendation": 3-5 sentence prioritized remediation steps

Return ONLY JSON."""

    raw_text = _call_gemini(prompt, max_output_tokens=1024)
    if not raw_text:
         return {"diagnosis": "AI analysis unavailable.", "recommendation": "Manual review required."}

    result = _parse_json(raw_text, "analyze_system_metric")
    if not isinstance(result, dict):
        return {"diagnosis": "AI analysis unavailable.", "recommendation": "Manual review required."}

    return {
        "diagnosis":      str(result.get("diagnosis", "AI analysis unavailable.")),
        "recommendation": str(result.get("recommendation", "Manual review required.")),
    }

