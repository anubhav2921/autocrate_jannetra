"""
System Monitoring AI Service — Uses Gemini to generate governance subsystem
health metrics and provide AI-powered diagnostics & recommendations.
"""
import json
import google.generativeai as genai

GEMINI_API_KEY = "AIzaSyB0JJ0LlcOoUKsAvdI7_4SCHW20b8AifB0"
genai.configure(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-2.0-flash"


def generate_system_metrics(count: int = 5) -> list[dict]:
    """
    Use Gemini to generate `count` realistic governance system health metrics.
    Returns a list of dicts ready to insert into the SystemMetric table.
    """
    prompt = f"""You are a Governance Infrastructure Monitoring AI. Generate exactly {count} realistic system health metrics
for a Predictive Governance Intelligence & Decision Support System deployed across India.

Each metric must be a JSON object with these exact fields:
- "id": a unique ID in format "SYS-XXX" (use numbers from 100 upwards)
- "subsystem_name": name of the subsystem being monitored (e.g., "NLP Sentiment Engine", "Fraud Detection Cluster", "Citizen Portal API Gateway", "GRI Computation Node", "Threat Intelligence Feed", "Data Lake Ingestion Pipeline", "Blockchain Validator Node", "Real-time Alert Dispatcher")
- "metric_type": one of "CPU Usage", "Memory Usage", "Latency", "Throughput", "Error Rate", "Uptime", "Disk I/O", "Network Bandwidth"
- "status": one of "Healthy", "Warning", "Critical", "Degraded"
- "current_value": a realistic number for the metric type
- "threshold_value": the alert threshold for this metric
- "unit": the unit (e.g., "%", "ms", "req/s", "Mbps", "GB", "ops/s")
- "location": a realistic Indian data center location (e.g., "Mumbai DC-1 Rack A7", "Hyderabad Edge Node 3", "Delhi Central Hub")
- "ai_diagnosis": a detailed 2-3 sentence technical diagnosis from the AI monitoring system explaining the current state, root cause analysis, and any correlations detected
- "ai_recommendation": a specific actionable 2-3 sentence recommendation for the operations team
- "last_checked_at": an ISO 8601 timestamp in February 2026
- "trend": one of "Improving", "Stable", "Degrading"

Return ONLY a valid JSON array with exactly {count} objects. No markdown, no explanation, just the JSON array.
Make the metrics diverse across types, statuses, and locations. Include specific numbers and technical details."""

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            elif "```" in text:
                text = text[:text.rfind("```")]
            text = text.strip()

        metrics = json.loads(text)

        valid_metrics = []
        for m in metrics:
            valid_metrics.append({
                "id": str(m.get("id", "SYS-100")),
                "subsystem_name": str(m.get("subsystem_name", "Unknown Subsystem"))[:300],
                "metric_type": str(m.get("metric_type", "CPU Usage"))[:100],
                "status": m.get("status", "Healthy"),
                "current_value": float(m.get("current_value", 0)),
                "threshold_value": float(m.get("threshold_value", 0)),
                "unit": str(m.get("unit", "%"))[:30],
                "location": str(m.get("location", "Unknown"))[:300],
                "ai_diagnosis": str(m.get("ai_diagnosis", "")),
                "ai_recommendation": str(m.get("ai_recommendation", "")),
                "last_checked_at": str(m.get("last_checked_at", "2026-02-25T12:00:00Z"))[:50],
                "trend": m.get("trend", "Stable"),
            })

        return valid_metrics

    except Exception as e:
        print(f"[GEMINI SYSTEM MONITOR ERROR] {e}")
        return []


def analyze_system_metric(metric: dict) -> dict:
    """
    Send a single metric to Gemini for real-time AI diagnosis and recommendation.
    Returns a dict with 'diagnosis' and 'recommendation'.
    """
    prompt = f"""You are an expert DevOps and Infrastructure AI analyst for a Governance Intelligence System.
Analyze the following system metric and provide a detailed diagnosis and actionable recommendation.

Metric Details:
- Subsystem: {metric.get('subsystem_name', 'Unknown')}
- Metric Type: {metric.get('metric_type', 'Unknown')}
- Current Value: {metric.get('current_value', 0)} {metric.get('unit', '')}
- Threshold: {metric.get('threshold_value', 0)} {metric.get('unit', '')}
- Status: {metric.get('status', 'Unknown')}
- Location: {metric.get('location', 'Unknown')}
- Trend: {metric.get('trend', 'Unknown')}

Respond with ONLY a valid JSON object with exactly these fields:
- "diagnosis": A detailed 3-5 sentence technical diagnosis covering root cause analysis, impact assessment, and any known correlations with other systems. Use specific technical terminology and reference real-world infrastructure concepts.
- "recommendation": A specific 3-5 sentence actionable recommendation with step-by-step remediation guidance, expected impact of the fix, and prevention strategies. Be concrete and prioritized.

Return ONLY the JSON object, no markdown fences or explanation."""

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            elif "```" in text:
                text = text[:text.rfind("```")]
            text = text.strip()

        result = json.loads(text)
        return {
            "diagnosis": str(result.get("diagnosis", "Unable to generate diagnosis.")),
            "recommendation": str(result.get("recommendation", "Unable to generate recommendation.")),
        }

    except Exception as e:
        print(f"[GEMINI ANALYSIS ERROR] {e}")
        return {
            "diagnosis": "AI analysis temporarily unavailable. Please try again.",
            "recommendation": "Manual inspection recommended while AI service recovers.",
        }
