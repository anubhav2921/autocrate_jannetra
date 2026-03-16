from fastapi import APIRouter, Query
from datetime import datetime
from ..mongodb import alerts_collection, news_articles_collection

router = APIRouter(prefix="/api", tags=["Alerts"])

DEPT_MAP = {
    "Corruption": "Anti-Corruption Bureau",
    "Infrastructure": "Public Works Department",
    "Healthcare": "Ministry of Health",
    "Education": "Ministry of Education",
    "Agriculture": "Ministry of Agriculture",
    "Environment": "Ministry of Environment",
    "Economy": "Ministry of Finance",
    "Law & Order": "Ministry of Home Affairs",
    "Water": "Jal Shakti Ministry",
    "Transport": "Ministry of Transport",
    "Energy": "Ministry of Power",
    "General": "District Administration",
    "Politics": "Election Commission",
    "Security": "Ministry of Defence",
    "Social": "Ministry of Social Justice",
}


@router.get("/alerts")
async def list_alerts(
    severity: str = Query(None),
    active_only: bool = Query(True),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    alert_count = await alerts_collection.count_documents({})

    if alert_count > 0:
        match_filter = {}
        if active_only:
            match_filter["is_active"] = True
        if severity:
            match_filter["severity"] = severity

        total = await alerts_collection.count_documents(match_filter)
        cursor = alerts_collection.find(match_filter).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
        alert_docs = await cursor.to_list(None)

        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        alert_docs.sort(key=lambda x: severity_order.get(x.get("severity", "LOW"), 4))

        result = []
        for alert in alert_docs:
            art = await news_articles_collection.find_one({"id": alert.get("article_id")}) or {}
            result.append({
                "id": alert["id"],
                "severity": alert.get("severity"),
                "department": alert.get("department"),
                "recommendation": alert.get("recommendation"),
                "urgency": alert.get("urgency"),
                "response_strategy": alert.get("response_strategy"),
                "is_active": alert.get("is_active"),
                "created_at": alert["created_at"].isoformat() if isinstance(alert.get("created_at"), datetime) else alert.get("created_at"),
                "article": {
                    "id": art.get("id"),
                    "title": art.get("title"),
                    "category": art.get("category"),
                    "location": None,
                },
            })

        return {"total": total, "page": page, "alerts": result}

    # Fallback: synthesize alerts from high-risk NewsArticle entries
    match = {"risk_level": {"$in": ["HIGH", "MODERATE"]}}
    if severity:
        sev_map = {"CRITICAL": "HIGH", "HIGH": "HIGH", "MEDIUM": "MODERATE", "LOW": "LOW"}
        match["risk_level"] = sev_map.get(severity, severity)

    total = await news_articles_collection.count_documents(match)
    cursor = news_articles_collection.find(match).sort("risk_score", -1).skip((page - 1) * limit).limit(limit)
    articles = await cursor.to_list(None)

    synthesized = []
    for i, a in enumerate(articles):
        score = a.get("risk_score", 0) or 0
        sev = "CRITICAL" if score >= 80 else "HIGH" if score >= 70 else "MEDIUM"
        dept = DEPT_MAP.get(a.get("category") or "General", "District Administration")
        scraped_at = a.get("scraped_at")
        synthesized.append({
            "id": f"alert-{a['id'][:8]}",
            "severity": sev,
            "department": dept,
            "recommendation": f"Immediate review required: {(a.get('title') or '')[:120]}",
            "urgency": "Immediate" if sev == "CRITICAL" else "Within 24h",
            "response_strategy": (
                f"Deploy {dept} field team to investigate. "
                f"Risk score: {round(score, 1)}/100. "
                f"Fake news confidence: {round((a.get('fake_news_confidence') or 0) * 100, 0):.0f}%."
            ),
            "is_active": True,
            "created_at": scraped_at.isoformat() if isinstance(scraped_at, datetime) else scraped_at,
            "article": {"id": a["id"], "title": a.get("title"), "category": a.get("category"), "location": None},
        })

    return {"total": total, "page": page, "alerts": synthesized}


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    alert = await alerts_collection.find_one({"id": alert_id})
    if not alert:
        return {"status": "acknowledged", "alert_id": alert_id}

    await alerts_collection.update_one({"id": alert_id}, {"$set": {"is_active": False}})
    return {"status": "acknowledged", "alert_id": alert_id}
