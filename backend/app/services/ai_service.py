import os
import json
import logging
import requests
from typing import Optional, List, Dict, Any

logger = logging.getLogger("jannetra.ai")

# Get API Key from environment
NVIDIA_API_KEY = os.getenv("SIGNAL_MONITOR_NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY")
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def _call_nvidia_nim(prompt: str, system_prompt: str = "You are a governance expert.") -> Optional[str]:
    if not NVIDIA_API_KEY:
        logger.warning("[AI] NVIDIA_API_KEY missing - using mock response.")
        return None

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Accept": "application/json"
    }
    
    payload = {
        "model": "meta/llama-3.1-405b-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "top_p": 0.7,
        "max_tokens": 1024
    }

    try:
        response = requests.post(NVIDIA_BASE_URL, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        res_json = response.json()
        return res_json["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"[AI] NVIDIA API Error: {e}")
        return None

def summarize_problem_cluster(
    title: str,
    category: str,
    location: str,
    samples: list[dict],
) -> Optional[dict]:
    """Generates a structured summary for a cluster of signals."""
    sample_texts = "\n".join([f"- {s.get('title')}" for s in samples])
    
    prompt = f"""
    Title: {title}
    Category: {category}
    Location: {location}
    Related Signals:
    {sample_texts}

    Analyze this governance issue and provide a structured JSON response with exactly these fields:
    - "Problem Description": A professional 2-3 sentence overview of the issue.
    - "Problem Location Context": Detailed description of the geographical context.
    - "Evidence Category": Classification of evidence found (e.g., Public Complaint, Recurring News, Official Record).
    - "Recommended Solution": A professional recommendation for a government leader.

    STRICT: Return ONLY JSON.
    """
    
    raw = _call_nvidia_nim(prompt, "You are a professional Governance Analyst. Return ONLY JSON.")
    if not raw:
        return None
        
    try:
        # Clean JSON if any markdown is returned
        clean_json = raw.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
        data = json.loads(clean_json)
        # Map to internal keys but keep user labels for reference if needed
        return {
            "description": data.get("Problem Description"),
            "location_detail": data.get("Problem Location Context"),
            "evidence_summary": data.get("Evidence Category"),
            "expected_solution": data.get("Recommended Solution")
        }
    except Exception as e:
        logger.error(f"[AI] JSON Parse error: {e}")
        return None

def summarize_news_article(
    title: str,
    category: str,
    location: str,
    content: str,
) -> Optional[dict]:
    """Generates a structured report for a single news signal."""
    prompt = f"""
    Title: {title}
    Category: {category}
    Location: {location}
    Content Snippet: {content[:1000]}

    Analyze this signal and provide a structured JSON response with exactly these fields:
    - "Problem Description": A professional 2-3 sentence overview.
    - "Problem Location Context": Geographical context details.
    - "Evidence Category": Classification of this signal.
    - "Recommended Solution": Steps to resolve or investigate.

    STRICT: Return ONLY JSON.
    """
    
    raw = _call_nvidia_nim(prompt, "You are a professional Governance Analyst. Return ONLY JSON.")
    if not raw:
        return None
        
    try:
        clean_json = raw.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        data = json.loads(clean_json)
        return {
            "description": data.get("Problem Description"),
            "location_detail": data.get("Problem Location Context"),
            "evidence_summary": data.get("Evidence Category"),
            "expected_solution": data.get("Recommended Solution")
        }
    except Exception as e:
        logger.error(f"[AI] JSON Parse error: {e}")
        return None

def structure_single_problem(
    title: str,
    category: str,
    location: str,
    description: str,
) -> Optional[dict]:
    return summarize_news_article(title, category, location, description)
