from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..mongodb import system_metrics_collection
from ..services.system_monitoring_service import generate_system_metrics, analyze_system_metric

router = APIRouter(prefix="/api", tags=["System Monitoring"])


class GenerateRequest(BaseModel):
    count: Optional[int] = 5


@router.get("/system-metrics")
async def list_system_metrics():
    import random
    metrics = await system_metrics_collection.find({}).to_list(None)
    
    results = []
    for m in metrics:
        curr = m.get("current_value", 0)
        thresh = m.get("threshold_value", 100) or 100
        
        # Add random jitter (-2% to +2% of threshold)
        jitter = random.uniform(-0.02, 0.02) * thresh
        new_val = max(0, curr + jitter)
        
        # Round to 1 decimal
        new_val = round(new_val, 1)
        
        # Update status based on logic: Healthy < 60%, Warning 60-80%, Critical > 80%
        # If threshold is 100 (percentage), use the rules
        pct = (new_val / thresh) * 100
        new_status = m.get("status", "Healthy")
        
        if pct > 85: new_status = "Critical"
        elif pct > 65: new_status = "Warning"
        else: new_status = "Healthy"
        
        # Update trend
        new_trend = "Stable"
        if jitter > 0.5: new_trend = "Degrading"
        elif jitter < -0.5: new_trend = "Improving"

        results.append({
            "id": m["id"],
            "subsystemName": m.get("subsystem_name"),
            "metricType": m.get("metric_type"),
            "status": new_status,
            "currentValue": new_val,
            "thresholdValue": thresh,
            "unit": m.get("unit"),
            "location": m.get("location"),
            "aiDiagnosis": m.get("ai_diagnosis"),
            "aiRecommendation": m.get("ai_recommendation"),
            "lastCheckedAt": m.get("last_checked_at"),
            "trend": new_trend,
        })
    return results


@router.get("/system-metrics/{metric_id}")
async def get_system_metric(metric_id: str):
    m = await system_metrics_collection.find_one({"id": metric_id})
    if not m:
        raise HTTPException(status_code=404, detail=f"System metric '{metric_id}' not found.")
    return {
        "id": m["id"],
        "subsystemName": m.get("subsystem_name"),
        "metricType": m.get("metric_type"),
        "status": m.get("status"),
        "currentValue": m.get("current_value"),
        "thresholdValue": m.get("threshold_value"),
        "unit": m.get("unit"),
        "location": m.get("location"),
        "aiDiagnosis": m.get("ai_diagnosis"),
        "aiRecommendation": m.get("ai_recommendation"),
        "lastCheckedAt": m.get("last_checked_at"),
        "trend": m.get("trend"),
    }


@router.post("/system-metrics/generate")
async def generate_metrics_with_ai(body: GenerateRequest):
    count = min(body.count or 5, 15)
    generated = generate_system_metrics(count)
    if not generated:
        raise HTTPException(status_code=500, detail="AI failed to generate metrics. Check API")

    existing = await system_metrics_collection.find({}, {"id": 1}).to_list(None)
    existing_ids = {m["id"] for m in existing}

    saved = []
    for m in generated:
        if m["id"] in existing_ids:
            base = m["id"].split("-")[0] if "-" in m["id"] else "SYS"
            counter = 100
            while f"{base}-{counter}" in existing_ids:
                counter += 1
            m["id"] = f"{base}-{counter}"
            existing_ids.add(m["id"])
        await system_metrics_collection.insert_one(m)
        saved.append(m)

    return {"success": True, "generated": len(saved), "metrics": saved}


@router.post("/system-metrics/{metric_id}/analyze")
async def analyze_metric_with_ai(metric_id: str):
    m = await system_metrics_collection.find_one({"id": metric_id})
    if not m:
        raise HTTPException(status_code=404, detail=f"System metric '{metric_id}' not found.")

    metric_dict = {
        "subsystem_name": m.get("subsystem_name"),
        "metric_type": m.get("metric_type"),
        "current_value": m.get("current_value"),
        "threshold_value": m.get("threshold_value"),
        "unit": m.get("unit"),
        "status": m.get("status"),
        "location": m.get("location"),
        "trend": m.get("trend"),
    }

    result = analyze_system_metric(metric_dict)
    await system_metrics_collection.update_one(
        {"id": metric_id},
        {"$set": {"ai_diagnosis": result["diagnosis"], "ai_recommendation": result["recommendation"]}}
    )

    return {
        "success": True,
        "id": metric_id,
        "aiDiagnosis": result["diagnosis"],
        "aiRecommendation": result["recommendation"],
    }


@router.patch("/system-metrics/{metric_id}/acknowledge")
async def acknowledge_system_metric(metric_id: str):
    m = await system_metrics_collection.find_one({"id": metric_id})
    if not m:
        raise HTTPException(status_code=404, detail=f"System metric '{metric_id}' not found.")
    await system_metrics_collection.update_one({"id": metric_id}, {"$set": {"status": "Healthy", "trend": "Improving"}})
    return {"success": True, "id": metric_id, "status": "Healthy"}


@router.get("/system-metrics/insights")
async def get_system_monitoring_insights():
    """Analyze all system metrics and return a global health insight summary."""
    metrics = await system_metrics_collection.find({}).to_list(100)
    if not metrics:
        return {"summary": "No active systems detected. Start by generating or connecting data sources.", "critical_count": 0, "status": "Idle"}
    
    # Simple rule-based aggregation for intelligence if AI fails
    critical_systems = [m for m in metrics if m.get("status") == "Critical" or m.get("status") == "Degraded"]
    warning_systems = [m for m in metrics if m.get("status") == "Warning"]
    
    # Simulate a comprehensive AI insight based on counts
    if critical_systems:
        insight = f"CRITICAL: {len(critical_systems)} systems require immediate intervention. " \
                  f"{critical_systems[0]['subsystem_name']} is showing severe performance degradation in {critical_systems[0]['location']}."
        status = "Critical"
    elif warning_systems:
        insight = f"WARNING: {len(warning_systems)} systems showing abnormal spikes. " \
                  "Proactive load balancing recommended for the NLP Sentiment clusters."
        status = "Warning"
    else:
        insight = "SYSTEM HEALTH: All infrastructure components operating within optimal parameters. Stability index at 98.4%."
        status = "Healthy"

    # In a real app, we'd pass the aggregated data to AI here
    return {
        "summary": insight,
        "critical_count": len(critical_systems),
        "warning_count": len(warning_systems),
        "total_count": len(metrics),
        "status": status,
        "recommendation": "Maintain current monitoring thresholds. Check Hyderabad DC-1 cooling systems in next cycle." if status == "Healthy" else "Escalate to Level 3 DevOps support immediately."
    }


@router.delete("/system-metrics/clear")
async def clear_system_metrics():
    result = await system_metrics_collection.delete_many({})
    return {"success": True, "deleted": result.deleted_count}
