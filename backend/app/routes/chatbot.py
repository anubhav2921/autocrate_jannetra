import re
from fastapi import APIRouter
from pydantic import BaseModel
from ..mongodb import (
    news_articles_collection, alerts_collection, resolutions_collection
)

router = APIRouter(prefix="/api", tags=["Chatbot"])


class ChatMessage(BaseModel):
    message: str


async def _query_data(question: str) -> str:
    """Rule-based chatbot that queries real DB data via MongoDB."""
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
        top = await news_articles_collection.find().sort("risk_score", -1).limit(5).to_list(5)
        if not top:
            return "No risk data available yet."
        lines = ["📊 **Top 5 Risk Signals:**\n"]
        for i, a in enumerate(top, 1):
            city = a.get("city") or a.get("state") or a.get("source_name") or "Unknown"
            lines.append(f"{i}. **{a.get('title')}** — GRI: {round(a.get('risk_score') or 0)} ({a.get('risk_level')}) | {city}")
        return "\n".join(lines)

    # Location-specific risk
    location_match = re.search(
        r"(risk|problem|issue|alert|status)\s*(in|at|for|of)\s+(\w+)", q
    )
    if location_match:
        loc = location_match.group(3).capitalize()
        # Search state, district, or city
        results = await news_articles_collection.find({
            "$or": [
                {"city": {"$regex": f"^{loc}$", "$options": "i"}},
                {"district": {"$regex": f"^{loc}$", "$options": "i"}},
                {"state": {"$regex": f"^{loc}$", "$options": "i"}},
            ]
        }).sort("risk_score", -1).limit(3).to_list(3)
        if results:
            lines = [f"📍 **Risks in {loc}:**\n"]
            total_score = 0
            for a in results:
                score = a.get("risk_score") or 0
                total_score += score
                lines.append(f"• **{a.get('title')}** — GRI: {round(score)} | Category: {a.get('category')}")
            avg_gri = total_score / len(results)
            lines.append(f"\n📈 Average GRI for {loc}: **{avg_gri:.1f}**")
            return "\n".join(lines)
        return f"No data found for location: {loc}"

    # Fake news stats
    if any(w in q for w in ["fake news", "fake", "misinformation", "false"]):
        total = await news_articles_collection.count_documents({})
        fake = await news_articles_collection.count_documents({"fake_news_label": "FAKE"})
        real = await news_articles_collection.count_documents({"fake_news_label": "REAL"})
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
        active = await alerts_collection.count_documents({"is_active": True})
        critical = await alerts_collection.count_documents({"severity": "CRITICAL", "is_active": True})
        high = await alerts_collection.count_documents({"severity": "HIGH", "is_active": True})

        if active == 0:
            active = await news_articles_collection.count_documents({"risk_level": {"$in": ["HIGH", "MODERATE"]}})
            critical = await news_articles_collection.count_documents({"risk_score": {"$gte": 80}})
            high = await news_articles_collection.count_documents({"risk_score": {"$gte": 60, "$lt": 80}})

        return (
            f"🚨 **Alert Summary:**\n"
            f"• Active alerts: **{active}**\n"
            f"• Critical: **{critical}**\n"
            f"• High: **{high}**\n"
            f"• Medium/Low: **{active - critical - high}**"
        )

    # Category breakdown
    if any(w in q for w in ["category", "categories", "breakdown", "sector"]):
        pipeline = [
            {"$group": {
                "_id": "$category",
                "count": {"$sum": 1},
                "avg_gri": {"$avg": "$risk_score"}
            }},
            {"$sort": {"avg_gri": -1}}
        ]
        cats = await news_articles_collection.aggregate(pipeline).to_list(None)
        lines = ["📋 **Category Risk Breakdown:**\n"]
        for cat in cats:
            name = cat["_id"] or "General"
            count = cat["count"]
            avg_gri = cat["avg_gri"] or 0
            risk = "🔴" if avg_gri > 60 else "🟡" if avg_gri > 30 else "🟢"
            lines.append(f"{risk} **{name}** — {count} signals, Avg GRI: {avg_gri:.1f}")
        return "\n".join(lines)

    # Sentiment / anger
    if any(w in q for w in ["sentiment", "anger", "mood", "feeling"]):
        agg = await news_articles_collection.aggregate([
            {"$group": {
                "_id": None,
                "avg_anger": {"$avg": "$anger_rating"},
                "avg_pol": {"$avg": "$sentiment_polarity"}
            }}
        ]).to_list(1)

        total = await news_articles_collection.count_documents({})
        neg = await news_articles_collection.count_documents({"sentiment_label": "NEGATIVE"})

        avg_anger = agg[0]["avg_anger"] if agg else 0
        avg_pol = agg[0]["avg_pol"] if agg else 0

        return (
            f"😊 **Sentiment Analysis:**\n"
            f"• Average polarity: **{avg_pol:.3f}** {'(positive bias)' if avg_pol > 0 else '(negative bias)'}\n"
            f"• Average anger rating: **{avg_anger:.1f}/10**\n"
            f"• Negative signals: **{neg}/{total}** ({round(neg/max(total,1)*100, 1)}%)"
        )

    # Leaderboard
    if any(w in q for w in ["leaderboard", "leader", "rank", "top performer"]):
        count = await resolutions_collection.count_documents({})
        resolved = await resolutions_collection.count_documents({"status": "RESOLVED"})
        return (
            f"🏆 **Resolution Stats:**\n"
            f"• Total resolutions submitted: **{count}**\n"
            f"• Fully resolved: **{resolved}**\n"
            f"• In progress: **{count - resolved}**\n\n"
            f"Visit the Leaderboard page to see rankings!"
        )

    # GRI overview
    if any(w in q for w in ["gri", "governance risk", "overall", "summary", "overview"]):
        agg = await news_articles_collection.aggregate([
            {"$group": {
                "_id": None,
                "avg_gri": {"$avg": "$risk_score"},
                "max_gri": {"$max": "$risk_score"}
            }}
        ]).to_list(1)

        total = await news_articles_collection.count_documents({})
        high_count = await news_articles_collection.count_documents({"risk_score": {"$gt": 60}})

        avg_gri = agg[0]["avg_gri"] if agg else 0
        max_gri = agg[0]["max_gri"] if agg else 0

        return (
            f"📊 **Governance Risk Index Overview:**\n"
            f"• Average GRI: **{avg_gri:.1f}**/100\n"
            f"• Highest GRI: **{max_gri:.1f}**\n"
            f"• High-risk signals: **{high_count}/{total}** ({round(high_count/max(total,1)*100, 1)}%)"
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
async def chat(msg: ChatMessage):
    response = await _query_data(msg.message)
    return {"response": response}
