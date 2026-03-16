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
    metrics = await system_metrics_collection.find({}).to_list(None)
    return [
        {
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
        for m in metrics
    ]


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
        raise HTTPException(status_code=500, detail="Gemini AI failed to generate metrics. Check API key.")

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


@router.delete("/system-metrics/clear")
async def clear_system_metrics():
    result = await system_metrics_collection.delete_many({})
    return {"success": True, "deleted": result.deleted_count}
