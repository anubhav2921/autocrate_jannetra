from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime
from ..database import alerts_collection, news_articles_collection

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
    severity: Optional[str] = Query(None),
    active_only: bool = Query(True),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    sev_val = severity if isinstance(severity, str) and severity.strip() else None
    limit_val = limit if isinstance(limit, int) else 20
    from .location import _build_location_match
    loc_match = _build_location_match(state, district, city, ward)
    
    alert_count = await alerts_collection.count_documents({})

    if alert_count > 0:
        match_filter = {**loc_match}
        if active_only:
            match_filter["is_active"] = True
        if sev_val:
            match_filter["severity"] = sev_val

        total = await alerts_collection.count_documents(match_filter)
        cursor = alerts_collection.find(match_filter).sort("created_at", -1).skip((page - 1) * limit_val).limit(limit_val)
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

    # Fallback: synthesize alerts from high-risk NewsArticles, Signal Problems, or Citizen Reports
    from ..database import signal_problems_collection, citizen_reports_collection

    sp_count = await signal_problems_collection.count_documents({})
    if sp_count == 0:
        try:
            from .signal_problems import list_signal_problems
            await list_signal_problems()
        except Exception as seed_err:
            print("Alerts auto-seed signal_problems error:", seed_err)

    cr_count = await citizen_reports_collection.count_documents({})
    if cr_count == 0:
        try:
            from .citizen_reports import list_citizen_reports
            await list_citizen_reports()
        except Exception as seed_err:
            print("Alerts auto-seed citizen_reports error:", seed_err)

    match = {"risk_level": {"$in": ["HIGH", "MODERATE", "CRITICAL"]}, **loc_match}
    if sev_val:
        sev_map = {"CRITICAL": "HIGH", "HIGH": "HIGH", "MEDIUM": "MODERATE", "LOW": "LOW"}
        match["risk_level"] = sev_map.get(sev_val, sev_val)

    articles = await news_articles_collection.find(match).sort("risk_score", -1).limit(limit_val).to_list(limit_val)

    synthesized = []
    for a in articles:
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
            "created_at": scraped_at.isoformat() if isinstance(scraped_at, datetime) else str(scraped_at or datetime.utcnow()),
            "article": {"id": a["id"], "title": a.get("title"), "category": a.get("category"), "location": None},
        })

    # If still empty, synthesize from signal_problems_collection and citizen_reports_collection
    if len(synthesized) < limit_val:
        needed = limit_val - len(synthesized)
        sig_match = {"deleted": {"$ne": True}, **loc_match}
        if sev_val:
            sig_match["severity"] = sev_val.upper()

        sig_cursor = await signal_problems_collection.find(sig_match).sort("priority_score", -1).limit(needed).to_list(needed)
        for sp in sig_cursor:
            score = sp.get("priority_score") or sp.get("risk_score") or 75
            sev = (sp.get("severity") or "HIGH").upper()
            dept = DEPT_MAP.get(sp.get("category") or "General", "District Administration")
            created_at = sp.get("detected_at") or sp.get("created_at") or datetime.utcnow()
            synthesized.append({
                "id": f"alert-sig-{sp['id'][:8]}",
                "severity": sev if sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else "HIGH",
                "department": dept,
                "recommendation": f"Urgent governance action: {(sp.get('title') or '')[:120]}",
                "urgency": "Immediate" if sev == "CRITICAL" else "Within 24h",
                "response_strategy": f"Dispatch {dept} team to location '{sp.get('location', 'Municipal District')}'. Priority score: {round(score, 1)}/100.",
                "is_active": True,
                "created_at": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at),
                "article": {"id": sp["id"], "title": sp.get("title"), "category": sp.get("category"), "location": sp.get("location")},
            })

    if len(synthesized) < limit_val:
        needed = limit_val - len(synthesized)
        cr_cursor = await citizen_reports_collection.find({"deleted": {"$ne": True}}).sort("created_at", -1).limit(needed).to_list(needed)
        for cr in cr_cursor:
            score = cr.get("priority_score") or cr.get("riskScore") or 70
            sev = (cr.get("severity") or "HIGH").upper()
            dept = DEPT_MAP.get(cr.get("category") or "General", "District Administration")
            created_at = cr.get("created_at") or datetime.utcnow()
            synthesized.append({
                "id": f"alert-cr-{cr['id'][:8]}",
                "severity": sev if sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else "HIGH",
                "department": dept,
                "recommendation": f"Citizen Grievance Escalation: {(cr.get('title') or '')[:120]}",
                "urgency": "Immediate" if sev == "CRITICAL" else "Within 24h",
                "response_strategy": f"Review direct citizen report filed at '{cr.get('location', 'City Ward')}'. Escalation score: {round(score, 1)}/100.",
                "is_active": True,
                "created_at": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at),
                "article": {"id": cr["id"], "title": cr.get("title"), "category": cr.get("category"), "location": cr.get("location")},
            })

    if len(synthesized) == 0:
        now_str = datetime.utcnow().isoformat()
        synthesized = [
            {
                "id": "alert-seed-01",
                "severity": "CRITICAL",
                "department": "Public Works & Infrastructure",
                "recommendation": "Immediate review required: Hazratganj Pothole & Road Damage Crisis",
                "urgency": "Immediate",
                "response_strategy": "Deploy Public Works & Infrastructure field team to investigate location 'Prayagraj, Urban Sector'. Priority score: 88.5/100.",
                "is_active": True,
                "created_at": now_str,
                "article": {"id": "ISSUE-SEED-01", "title": "Hazratganj Pothole & Road Damage Crisis", "category": "Civil Infrastructure", "location": "Prayagraj"}
            },
            {
                "id": "alert-seed-02",
                "severity": "HIGH",
                "department": "Electricity & Power Distribution",
                "recommendation": "Urgent governance action: Unscheduled High-Voltage Power Fluctuation",
                "urgency": "Within 24h",
                "response_strategy": "Dispatch Electricity & Power Distribution team to location 'Prayagraj, Civil Lines'. Priority score: 92.0/100.",
                "is_active": True,
                "created_at": now_str,
                "article": {"id": "ISSUE-SEED-02", "title": "Unscheduled High-Voltage Power Fluctuation", "category": "Civil Infrastructure", "location": "Prayagraj"}
            },
            {
                "id": "alert-seed-03",
                "severity": "HIGH",
                "department": "Health & Family Welfare",
                "recommendation": "Urgent governance action: Water Pipeline Contamination Report",
                "urgency": "Within 24h",
                "response_strategy": "Dispatch Health & Family Welfare team to location 'Prayagraj, Naini Area'. Priority score: 84.0/100.",
                "is_active": True,
                "created_at": now_str,
                "article": {"id": "ISSUE-SEED-03", "title": "Water Pipeline Contamination Report", "category": "Public Health & Safety", "location": "Prayagraj"}
            },
            {
                "id": "alert-seed-04",
                "severity": "MEDIUM",
                "department": "Traffic Police & Transport",
                "recommendation": "Civic monitoring: Arterial Road Gridlock at Station Square",
                "urgency": "Within 24h",
                "response_strategy": "Dispatch Traffic Police team to location 'Prayagraj, Railway Station Square'. Priority score: 65.0/100.",
                "is_active": True,
                "created_at": now_str,
                "article": {"id": "ISSUE-SEED-04", "title": "Arterial Road Gridlock at Station Square", "category": "Road & Traffic", "location": "Prayagraj"}
            }
        ]

    return {"total": len(synthesized), "page": page, "alerts": synthesized}


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    alert = await alerts_collection.find_one({"id": alert_id})
    if not alert:
        return {"status": "acknowledged", "alert_id": alert_id}

    await alerts_collection.update_one({"id": alert_id}, {"$set": {"is_active": False}})
    return {"status": "acknowledged", "alert_id": alert_id}
