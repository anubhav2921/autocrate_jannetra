import re
from fastapi import APIRouter
from pydantic import BaseModel
from ..mongodb import (
    news_articles_collection, alerts_collection, resolutions_collection, signal_problems_collection
)
from ..services.ai_service import query_chatbot_with_context

router = APIRouter(prefix="/api", tags=["Chatbot"])


class ChatMessage(BaseModel):
    message: str


async def _get_system_context() -> str:
    """Gathers real-time context from various collections."""
    # 1. Top Risks
    top_risks = await news_articles_collection.find().sort("risk_score", -1).limit(5).to_list(5)
    risk_lines = []
    for r in top_risks:
        risk_lines.append(f"- {r.get('title')} (GRI: {round(r.get('risk_score',0))}, Region: {r.get('city') or r.get('state')})")
    
    # 2. Active Alerts
    active_alerts = await alerts_collection.find({"is_active": True}).limit(3).to_list(3)
    alert_lines = [f"- {a.get('title')} ({a.get('severity')})" for a in active_alerts]
    
    # 3. Recent Resolutions
    recent_res = await signal_problems_collection.find({"status": "Problem Resolved"}).sort("resolved_at", -1).limit(3).to_list(3)
    res_lines = [f"- {r.get('title')} (Resolved by: {r.get('department')})" for r in recent_res]

    context = "--- SYSTEM DATA ---\n"
    context += "TOP RISKS:\n" + ("\n".join(risk_lines) if risk_lines else "None") + "\n\n"
    context += "ACTIVE ALERTS:\n" + ("\n".join(alert_lines) if alert_lines else "None") + "\n\n"
    context += "RECENT RESOLUTIONS:\n" + ("\n".join(res_lines) if res_lines else "None")
    return context

@router.post("/chatbot")
async def chat(msg: ChatMessage):
    # Determine if it's a simple greeting or needs AI
    q = msg.message.lower()
    if q in ["hi", "hello", "hey"]:
        return {"response": "👋 Hello! I'm your JanNetra Governance Assistant. How can I help you with system data or risks today?"}
    
    context = await _get_system_context()
    response = await query_chatbot_with_context(msg.message, context)
    return {"response": response}
