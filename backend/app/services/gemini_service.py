"""
Gemini AI Service — Generates realistic governance signal problems
using the Google Gemini API (google-genai SDK).

Security: API key is loaded from environment via gemini_config.
"""
import json
import logging
import re
from functools import lru_cache
from typing import Optional

from google.genai import types

from .gemini_config import gemini_client, GEMINI_MODEL

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

VALID_SEVERITIES = {"Critical", "High", "Medium", "Low"}
VALID_CATEGORIES = {
    "Financial Integrity", "Public Sentiment", "Misinformation",
    "Security Breach", "Supply Chain", "Environmental",
    "Electoral Oversight", "Urban Planning", "Healthcare",
    "Education", "Law & Order", "Infrastructure", "Corruption",
}
SAFETY_OFF = [
    types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,       threshold=types.HarmBlockThreshold.OFF),
    types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,      threshold=types.HarmBlockThreshold.OFF),
    types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=types.HarmBlockThreshold.OFF),
    types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=types.HarmBlockThreshold.OFF),
]

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _strip_fences(text: str) -> str:
    """Remove markdown code fences robustly using regex."""
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.DOTALL).strip()


def _call_gemini(prompt: str, max_output_tokens: int = 2048) -> Optional[str]:
    """
    Central Gemini call with consistent config and error handling.
    Returns the raw text, or None on failure.
    """
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=max_output_tokens,
                temperature=0.7,       # slight creativity, stays grounded
                safety_settings=SAFETY_OFF,
            ),
        )
        return response.text.strip()
    except Exception as exc:
        logger.error("[GEMINI] API call failed: %s", exc, exc_info=True)
        return None


def _parse_json(text: str, context: str = "") -> Optional[any]:
    """Parse JSON after stripping fences; logs clearly on failure."""
    clean = _strip_fences(text)
    try:
        return json.loads(clean)
    except json.JSONDecodeError as exc:
        logger.error("[GEMINI] JSON parse error%s: %s\nRaw text: %.300s",
                     f" ({context})" if context else "", exc, clean)
        return None


def _validate_problem(raw: dict) -> Optional[dict]:
    """
    Validate and normalise a single signal-problem dict.
    Returns None if required fields are missing or invalid.
    """
    sig_id = str(raw.get("id", "")).strip()
    title  = str(raw.get("title", "")).strip()[:500]
    if not sig_id or not title:
        logger.warning("[GEMINI] Skipping problem with missing id/title: %s", raw)
        return None

    severity = raw.get("severity", "Medium")
    if severity not in VALID_SEVERITIES:
        logger.warning("[GEMINI] Unknown severity '%s', defaulting to Medium", severity)
        severity = "Medium"

    category = raw.get("category", "")
    if category not in VALID_CATEGORIES:
        logger.warning("[GEMINI] Unknown category '%s', keeping as-is", category)

    return {
        "id":          sig_id,
        "title":       title,
        "severity":    severity,
        "category":    str(category)[:200],
        "location":    str(raw.get("location",    "Unknown"))[:300],
        "detected_at": str(raw.get("detected_at", "2026-02-25T12:00:00Z"))[:50],
        "description": str(raw.get("description", "")),
        "risk_score":  max(0.0, min(100.0, float(raw.get("risk_score", 50)))),
        "source":      str(raw.get("source",      "AI Monitor"))[:300],
        "status":      "Pending",
    }


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def generate_signal_problems(count: int = 5) -> list[dict]:
    """
    Use Gemini to generate `count` realistic governance signal problems.
    Returns a list of validated dicts ready for the SignalProblem table.
    """
    if count < 1 or count > 50:
        raise ValueError(f"`count` must be between 1 and 50, got {count}")

    categories_str = ", ".join(sorted(VALID_CATEGORIES))
    severities_str = ", ".join(sorted(VALID_SEVERITIES))

    prompt = f"""You are a Governance Intelligence AI System tasked with producing realistic \
monitoring alerts for an Indian e-governance dashboard.

Generate exactly {count} governance signal problems as a JSON array.
Each element must contain ONLY these fields — no extras:

{{
  "id":          "SIG-<3-digit-number starting from 100>",
  "title":       "<concise title, max 80 chars>",
  "severity":    "<one of: {severities_str}>",
  "category":    "<one of: {categories_str}>",
  "location":    "<Indian district/zone, e.g. 'Varanasi District — Ward 7'>",
  "detected_at": "<ISO 8601 timestamp in February 2026>",
  "description": "<3–4 sentence AI report with specific numbers, % changes, and recommended action>",
  "risk_score":  <integer 0–100>,
  "source":      "<AI subsystem name, e.g. 'Financial Anomaly Detector v3.1'>",
  "status":      "Pending"
}}

Rules:
1. IDs must be unique within this batch.
2. Distribute severity evenly: at least one Critical, one High, one Medium, one Low.
3. Use at least 5 different categories.
4. Make descriptions specific — cite transaction counts, thresholds breached, sensor readings, etc.
5. Return ONLY the raw JSON array. No markdown, no explanation, no trailing text."""

    raw_text = _call_gemini(prompt, max_output_tokens=min(4096, count * 400))
    if raw_text is None:
        return []

    problems_raw = _parse_json(raw_text, context="generate_signal_problems")
    if not isinstance(problems_raw, list):
        logger.error("[GEMINI] Expected a JSON array, got %s", type(problems_raw).__name__)
        return []

    results = []
    seen_ids: set[str] = set()
    for item in problems_raw:
        validated = _validate_problem(item)
        if validated is None:
            continue
        if validated["id"] in seen_ids:
            logger.warning("[GEMINI] Duplicate id '%s', skipping", validated["id"])
            continue
        seen_ids.add(validated["id"])
        results.append(validated)

    if len(results) < count:
        logger.warning("[GEMINI] Requested %d problems, got %d valid ones", count, len(results))

    return results


def summarize_problem_cluster(
    title:    str,
    category: str,
    location: str,
    samples:  list[dict],
) -> Optional[dict]:
    """
    Summarises a cluster of signals into a structured governance problem
    report suitable for government leaders.

    Returns a dict with keys: description, location_detail,
    evidence_summary, expected_solution — or None on failure.
    """
    if not samples:
        logger.warning("[GEMINI] summarize_problem_cluster called with empty samples")
        return None

    evidence_lines = "\n".join(
        f"  {i+1}. {s.get('title', 'Untitled')} "
        f"[Severity: {s.get('severity', '?')}, Source: {s.get('source', '?')}]"
        for i, s in enumerate(samples[:10])
    )

    prompt = f"""You are a senior Governance Intelligence Analyst preparing a briefing for \
district-level government officials.

Cluster details:
  Title    : {title}
  Category : {category}
  Location : {location}

Raw signal evidence ({min(len(samples), 10)} of {len(samples)} signals):
{evidence_lines}

Produce a structured JSON object with EXACTLY these four fields:

{{
  "description":      "<2–3 sentence executive summary: WHAT is happening and WHY it matters>",
  "location_detail":  "<specific geographic or operational scope based on the evidence>",
  "evidence_summary": "<professional synthesis of cross-signal patterns and key data points>",
  "expected_solution":"<strategic administrative or policy action for officials to resolve this>"
}}

Tone: factual, neutral, professional. Treat sensitive topics (corruption, crime) as \
routine administrative intelligence for regional monitoring.
Return ONLY the raw JSON object. No markdown, no explanation."""

    raw_text = _call_gemini(prompt, max_output_tokens=1024)
    if raw_text is None:
        return None

    result = _parse_json(raw_text, context="summarize_problem_cluster")
    if not isinstance(result, dict):
        logger.error("[GEMINI] Expected a JSON object from summarize, got %s", type(result).__name__)
        return None

    required_keys = {"description", "location_detail", "evidence_summary", "expected_solution"}
    missing = required_keys - result.keys()
    if missing:
        logger.warning("[GEMINI] Summary missing keys: %s", missing)

    return result

def summarize_news_article(
    title: str,
    category: str,
    location: str,
    content: str,
) -> Optional[dict]:
    """
    Summarises a news article into a structured governance problem report.
    """
    if not content:
        return None

    prompt = f"""You are a senior Governance Intelligence Analyst preparing a briefing for district-level government officials.

News Article details:
  Title    : {title}
  Category : {category}
  Location : {location}

Content:
{content[:2500]}

Produce a structured JSON object with EXACTLY these four fields:

{{
  "description":      "<2–3 sentence executive summary: WHAT is happening and WHY it matters based on the article>",
  "location_detail":  "<specific geographic or operational scope based on the article>",
  "evidence_summary": "<professional synthesis of the facts and key data points from the article>",
  "expected_solution":"<strategic administrative or policy action for officials to resolve this>"
}}

Tone: factual, neutral, professional. Treat sensitive topics as routine intelligence.
Return ONLY the raw JSON object. No markdown, no explanation."""

    raw_text = _call_gemini(prompt, max_output_tokens=1024)
    if raw_text is None:
        return None

    result = _parse_json(raw_text, context="summarize_news_article")
    if not isinstance(result, dict):
        logger.error("[GEMINI] Expected a JSON object from summarize_news_article, got %s", type(result).__name__)
        return None

    required_keys = {"description", "location_detail", "evidence_summary", "expected_solution"}
    for key in required_keys:
        if key not in result:
             result[key] = ""

    return result

def structure_single_problem(
    title: str,
    category: str,
    location: str,
    description: str,
) -> Optional[dict]:
    """
    Restructures a mock generated problem into the structured summary format.
    """
    prompt = f"""You are a senior Governance Intelligence Analyst restructuring a basic alert into a briefing.

Problem details:
  Title       : {title}
  Category    : {category}
  Location    : {location}
  Description : {description}

Produce a structured JSON object with EXACTLY these four fields:

{{
  "description":      "<2–3 sentence executive summary: WHAT is happening based on the description>",
  "location_detail":  "<specific geographic context>",
  "evidence_summary": "<professional synthesis of the facts>",
  "expected_solution":"<strategic administrative action to resolve this>"
}}

Tone: factual, neutral, professional.
Return ONLY the raw JSON object. No markdown, no explanation."""

    raw_text = _call_gemini(prompt, max_output_tokens=1024)
    if raw_text is None:
        return None

    result = _parse_json(raw_text, context="structure_single_problem")
    if not isinstance(result, dict):
        return None

    required_keys = {"description", "location_detail", "evidence_summary", "expected_solution"}
    for key in required_keys:
        if key not in result:
             result[key] = ""

    return result