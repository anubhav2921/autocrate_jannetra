import os
import logging
import json
import requests
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("jannetra.ai_service")

# ───────────────────────────────────────────────────────────────────────────
# NVIDIA Config
# ───────────────────────────────────────────────────────────────────────────
NV_API_KEY = os.getenv("NVIDIA_API_KEY")
NV_MODEL = "meta/llama-3.1-70b-instruct"
NV_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

VALID_SEVERITIES = {"Critical", "High", "Medium", "Low"}
VALID_CATEGORIES = {
    "Civil Infrastructure", "Road & Traffic", "Accidents & Emergencies",
    "Crime", "Social & Human Rights", "Public Health & Safety",
    "Environmental", "Animal Related", "Governance & Corruption",
    "Digital/Cyber", "Suspicious Activities", "Public Grievance", "Infrastructure"
}

def _nv_chat_v1(prompt: str, system_msg: Optional[str] = None) -> Optional[dict]:
    """Helper for NVIDIA Chat API."""
    if not NV_API_KEY:
        logger.warning("NVIDIA_API_KEY missing in .env")
        return None
    
    headers = {
        "Authorization": f"Bearer {NV_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "model": NV_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_msg or (
                    "You are 'JanNetra AI', a high-level governance intelligence assistant. "
                    "Your job is to analyze civic problems and provide clear, humanized, and professional descriptions "
                    "accompanied by actionable recommended solutions for government leaders. "
                    "Output strictly in valid JSON format."
                )
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "top_p": 0.7,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(NV_URL, headers=headers, json=payload, timeout=60)
        
        if response.status_code != 200:
            logger.error(f"NVIDIA API HTTP Error: {response.status_code} - {response.text}")
            return None
            
        res_data = response.json()
        raw_text = res_data["choices"][0]["message"]["content"].strip()
        
        # Robust JSON detection (especially if model wraps in ```json ... ```)
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].strip()
            
        return json.loads(raw_text)
    except Exception as e:
        logger.error(f"NVIDIA API Processing Error: {e}")
        return None

def generate_signal_problems(count: int = 5) -> list[dict]:
    """Generates realistic signal problems for initial populate."""
    results = []
    # Simplified mock for generation to avoid massive token usage on loop
    for i in range(count):
        results.append({
            "id": f"SIG-AUTO-{uuid.uuid4().hex[:4].upper()}",
            "title": f"Civic Issue #{i+1} - Needs Investigation",
            "severity": "Low",
            "category": "Infrastructure",
            "location": "India",
            "detected_at": datetime.utcnow(),
            "description": "Auto-generated problem signal from data pipeline scraper.",
            "risk_score": 10,
            "status": "Pending",
        })
    return results

def summarize_problem_cluster(
    title: str,
    category: str,
    location: str,
    samples: list[dict],
) -> Optional[dict]:
    """Generate high-quality summary for a group of signals."""
    sample_text = "\n".join([f"- {s.get('title')} ({s.get('source')})" for s in samples[:10]])
    
    prompt = f"""
    Analyze this cluster of civic signals and provide a definitive governance description and solution.
    
    [CONTEXT]
    Main Title: {title}
    Category: {category}
    Primary Location: {location}
    
    [SAMPLES/SIGNALS]
    {sample_text}
    
    [STRICT OUTPUT FORMAT]
    Return exactly this JSON structure:
    {{
      "description": "A 2-3 sentence humanized description explaining what is happening, where, and the impact.",
      "location_detail": "Specific areas mentioned in the signals.",
      "evidence_summary": "High-level summary of what sources/signals are reporting.",
      "expected_solution": "Clear, step-by-step recommendation for the authorities."
    }}
    """
    
    result = _nv_chat_v1(prompt)
    if result:
        return result
    
    # Fallback if AI fails
    return {
        "description": f"Verified issue regarding {title} in {location}. Signals indicate a persistent {category} concern affecting various local neighborhoods.",
        "location_detail": location,
        "evidence_summary": f"Detected across several sources including news and social reports.",
        "expected_solution": f"Immediate field inspection by the {category} department and restoration of services/infrastructure."
    }

def summarize_news_article(
    title: str,
    category: str,
    location: str,
    content: str,
) -> Optional[dict]:
    """Generate high-quality summary for a single news article signal."""
    prompt = f"""
    Analyze this news report about a governance oversight/issue and provide a structured brief.
    
    [ARTICLE]
    Title: {title}
    Category: {category}
    Location: {location}
    Content Snippet: {content[:2000]}
    
    [STRICT OUTPUT FORMAT]
    Return exactly this JSON structure:
    {{
      "description": "A professional, humanized summary (2-3 sentences) centered on the core problem and its impact on citizens.",
      "location_detail": "Specific streets, wards, or landmarks mentioned in the article.",
      "evidence_summary": "Identify key facts, dates, and sources cited in the report.",
      "expected_solution": "Actionable steps the government should take based on the report's findings."
    }}
    """
    
    result = _nv_chat_v1(prompt)
    if result:
        return result
        
    return {
        "description": f"News report titled '{title}' highlights a {category} problem in {location}.",
        "location_detail": location,
        "evidence_summary": "Reported via external news signal.",
        "expected_solution": "Evaluation of report veracity and department dispatch."
    }

def structure_single_problem(
    title: str,
    category: str,
    location: str,
    description: str,
) -> Optional[dict]:
    """Clean up and professionalize a single reported problem into governance format."""
    prompt = f"""
    Professionalize this civic report for a government dashboard.
    
    [DATA]
    Subject: {title}
    Category: {category}
    Location: {location}
    Original Report: {description}
    
    [STRICT OUTPUT FORMAT]
    Return JSON:
    {{
      "description": "A formal and cleaned-up version of the report.",
      "location_detail": "Address or site summary.",
      "evidence_summary": "Key details from the report.",
      "expected_solution": "Policy-compliant recommendation."
    }}
    """
    
    result = _nv_chat_v1(prompt)
    if result:
        return result
        
    return {
        "description": description or f"Report regarding {title}.",
        "location_detail": location,
        "evidence_summary": "Single verified citizen or automated signal.",
        "expected_solution": "Standard operative procedure for infrastructure anomalies."
    }

async def query_chatbot_with_context(question: str, context: str) -> str:
    """Generative chatbot query using NVIDIA NIM with system context."""
    if not NV_API_KEY:
        return "❌ NVIDIA_API_KEY is not configured in the backend."

    system_msg = (
        "You are 'JanNetra AI', an advanced Governance Intelligence Assistant for India. "
        "Your goal is to help government leaders and citizens understand regional risks and issues. "
        "Use the provided [SYSTEM CONTEXT] to answer questions accurately and professionally. "
        "If the data isn't in the context, use your general knowledge but mention it's general info. "
        "Keep responses concise, helpful, and use markdown for formatting."
    )

    prompt = f"[SYSTEM CONTEXT]\n{context}\n\n[USER QUESTION]\n{question}"

    headers = {
        "Authorization": f"Bearer {NV_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": NV_MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.5,
        "top_p": 0.8,
        "max_tokens": 1024
    }

    try:
        response = requests.post(NV_URL, headers=headers, json=payload, timeout=40)
        if response.status_code != 200:
            return f"Error from AI Service: {response.status_code}"
        
        res_data = response.json()
        return res_data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"Chatbot query error: {e}")
        return "Sorry, I'm having trouble processing your request right now."
