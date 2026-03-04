import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from ..database import get_db
from ..models import Article, GovernanceRiskScore, Alert, DetectionResult, SentimentRecord, Resolution

router = APIRouter(prefix="/api", tags=["Chatbot"])


class ChatMessage(BaseModel):
    message: str


def _query_data(question: str, db: Session) -> str:
    """Rule-based chatbot that queries real DB data."""
    q = question.lower().strip()

    # Greeting
    if any(w in q for w in ["hello", "hi", "hey", "help"]):
        return (
            "👋 Hello! I'm your Governance Intelligence Assistant. Ask me things like:\n"
            "• \"What are the top risks?\"\n"
            "• \"How many fake news articles?\"\n"
            "• \"Risk in Mumbai\"\n"
            "• \"Show alert summary\"\n"
            "• \"Leaderboard stats\"\n"
            "• \"Category breakdown\""
        )

    # Top risks
    if any(w in q for w in ["top risk", "highest risk", "priority", "dangerous"]):
        top = (
            db.query(Article, GovernanceRiskScore)
            .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
            .order_by(GovernanceRiskScore.gri_score.desc())
            .limit(5)
            .all()
        )
        if not top:
            return "No risk data available yet."
        lines = ["📊 **Top 5 Risk Signals:**\n"]
        for i, (a, g) in enumerate(top, 1):
            lines.append(f"{i}. **{a.title}** — GRI: {g.gri_score:.0f} ({g.risk_level}) | {a.location}")
        return "\n".join(lines)

    # Location-specific risk
    location_match = re.search(
        r"(risk|problem|issue|alert|status)\s*(in|at|for|of)\s+(\w+)", q
    )
    if location_match:
        loc = location_match.group(3).capitalize()
        results = (
            db.query(Article, GovernanceRiskScore)
            .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
            .filter(Article.location == loc)
            .order_by(GovernanceRiskScore.gri_score.desc())
            .limit(3)
            .all()
        )
        if results:
            lines = [f"📍 **Risks in {loc}:**\n"]
            for a, g in results:
                lines.append(f"• **{a.title}** — GRI: {g.gri_score:.0f} | Category: {a.category}")
            avg_gri = sum(g.gri_score for _, g in results) / len(results)
            lines.append(f"\n📈 Average GRI for {loc}: **{avg_gri:.1f}**")
            return "\n".join(lines)
        return f"No data found for location: {loc}"

    # Fake news stats
    if any(w in q for w in ["fake news", "fake", "misinformation", "false"]):
        total = db.query(func.count(DetectionResult.id)).scalar() or 0
        fake = db.query(func.count(DetectionResult.id)).filter(DetectionResult.label == "FAKE").scalar() or 0
        real = db.query(func.count(DetectionResult.id)).filter(DetectionResult.label == "REAL").scalar() or 0
        pct = round(fake / total * 100, 1) if total > 0 else 0
        return (
            f"🔍 **Fake News Analysis:**\n"
            f"• Total signals analyzed: **{total}**\n"
            f"• Fake news detected: **{fake}** ({pct}%)\n"
            f"• Verified real: **{real}**\n"
            f"• Uncertain: **{total - fake - real}**"
        )

    # Alert summary
    if any(w in q for w in ["alert", "warning", "critical", "emergency"]):
        active = db.query(func.count(Alert.id)).filter(Alert.is_active == True).scalar() or 0
        critical = db.query(func.count(Alert.id)).filter(Alert.severity == "CRITICAL", Alert.is_active == True).scalar() or 0
        high = db.query(func.count(Alert.id)).filter(Alert.severity == "HIGH", Alert.is_active == True).scalar() or 0
        return (
            f"🚨 **Alert Summary:**\n"
            f"• Active alerts: **{active}**\n"
            f"• Critical: **{critical}**\n"
            f"• High: **{high}**\n"
            f"• Medium/Low: **{active - critical - high}**"
        )

    # Category breakdown
    if any(w in q for w in ["category", "categories", "breakdown", "sector"]):
        cats = (
            db.query(Article.category, func.count(Article.id), func.avg(GovernanceRiskScore.gri_score))
            .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
            .group_by(Article.category)
            .all()
        )
        lines = ["📋 **Category Risk Breakdown:**\n"]
        for cat, count, avg_gri in sorted(cats, key=lambda x: -(x[2] or 0)):
            risk = "🔴" if (avg_gri or 0) > 60 else "🟡" if (avg_gri or 0) > 30 else "🟢"
            lines.append(f"{risk} **{cat}** — {count} signals, Avg GRI: {avg_gri:.1f}")
        return "\n".join(lines)

    # Sentiment / anger
    if any(w in q for w in ["sentiment", "anger", "mood", "feeling"]):
        avg_anger = db.query(func.avg(SentimentRecord.anger_rating)).scalar() or 0
        avg_pol = db.query(func.avg(SentimentRecord.polarity)).scalar() or 0
        neg = db.query(func.count(SentimentRecord.id)).filter(SentimentRecord.sentiment_label == "NEGATIVE").scalar() or 0
        total = db.query(func.count(SentimentRecord.id)).scalar() or 1
        return (
            f"😊 **Sentiment Analysis:**\n"
            f"• Average polarity: **{avg_pol:.3f}** {'(positive bias)' if avg_pol > 0 else '(negative bias)'}\n"
            f"• Average anger rating: **{avg_anger:.1f}/10**\n"
            f"• Negative signals: **{neg}/{total}** ({round(neg/total*100, 1)}%)"
        )

    # Leaderboard
    if any(w in q for w in ["leaderboard", "leader", "rank", "top performer"]):
        count = db.query(func.count(Resolution.id)).scalar() or 0
        resolved = db.query(func.count(Resolution.id)).filter(Resolution.status == "RESOLVED").scalar() or 0
        return (
            f"🏆 **Resolution Stats:**\n"
            f"• Total resolutions submitted: **{count}**\n"
            f"• Fully resolved: **{resolved}**\n"
            f"• In progress: **{count - resolved}**\n\n"
            f"Visit the Leaderboard page to see rankings!"
        )

    # GRI overview
    if any(w in q for w in ["gri", "governance risk", "overall", "summary", "overview"]):
        avg_gri = db.query(func.avg(GovernanceRiskScore.gri_score)).scalar() or 0
        max_gri = db.query(func.max(GovernanceRiskScore.gri_score)).scalar() or 0
        high_count = db.query(func.count(GovernanceRiskScore.id)).filter(GovernanceRiskScore.gri_score > 60).scalar() or 0
        total = db.query(func.count(GovernanceRiskScore.id)).scalar() or 1
        return (
            f"📊 **Governance Risk Index Overview:**\n"
            f"• Average GRI: **{avg_gri:.1f}**/100\n"
            f"• Highest GRI: **{max_gri:.1f}**\n"
            f"• High-risk signals: **{high_count}/{total}** ({round(high_count/total*100, 1)}%)"
        )

    return (
        "🤔 I didn't quite understand that. Try asking:\n"
        "• \"What are the top risks?\"\n"
        "• \"Risk in Delhi\"\n"
        "• \"Fake news stats\"\n"
        "• \"Alert summary\"\n"
        "• \"Category breakdown\"\n"
        "• \"Sentiment analysis\"\n"
        "• \"GRI overview\""
    )


@router.post("/chatbot")
def chat(msg: ChatMessage, db: Session = Depends(get_db)):
    response = _query_data(msg.message, db)
    return {"response": response}
