"""
System Monitoring API — CRUD + AI analysis + Gemini generation for System Monitoring dashboard.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import SystemMetric
from ..services.system_monitoring_service import generate_system_metrics, analyze_system_metric

router = APIRouter(prefix="/api", tags=["System Monitoring"])


class GenerateRequest(BaseModel):
    count: Optional[int] = 5


@router.get("/system-metrics")
def list_system_metrics(db: Session = Depends(get_db)):
    """Return all system metrics."""
    metrics = db.query(SystemMetric).all()
    return [
        {
            "id": m.id,
            "subsystemName": m.subsystem_name,
            "metricType": m.metric_type,
            "status": m.status,
            "currentValue": m.current_value,
            "thresholdValue": m.threshold_value,
            "unit": m.unit,
            "location": m.location,
            "aiDiagnosis": m.ai_diagnosis,
            "aiRecommendation": m.ai_recommendation,
            "lastCheckedAt": m.last_checked_at,
            "trend": m.trend,
        }
        for m in metrics
    ]


@router.get("/system-metrics/{metric_id}")
def get_system_metric(metric_id: str, db: Session = Depends(get_db)):
    """Return a single system metric by ID."""
    m = db.query(SystemMetric).filter(SystemMetric.id == metric_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"System metric '{metric_id}' not found.")
    return {
        "id": m.id,
        "subsystemName": m.subsystem_name,
        "metricType": m.metric_type,
        "status": m.status,
        "currentValue": m.current_value,
        "thresholdValue": m.threshold_value,
        "unit": m.unit,
        "location": m.location,
        "aiDiagnosis": m.ai_diagnosis,
        "aiRecommendation": m.ai_recommendation,
        "lastCheckedAt": m.last_checked_at,
        "trend": m.trend,
    }


@router.post("/system-metrics/generate")
def generate_metrics_with_ai(body: GenerateRequest, db: Session = Depends(get_db)):
    """Use Gemini AI to generate new system metrics and save to DB."""
    count = min(body.count or 5, 15)

    generated = generate_system_metrics(count)
    if not generated:
        raise HTTPException(status_code=500, detail="Gemini AI failed to generate metrics. Check API key.")

    existing_ids = {m.id for m in db.query(SystemMetric.id).all()}
    saved = []
    for m in generated:
        if m["id"] in existing_ids:
            base = m["id"].split("-")[0] if "-" in m["id"] else "SYS"
            counter = 100
            while f"{base}-{counter}" in existing_ids:
                counter += 1
            m["id"] = f"{base}-{counter}"
            existing_ids.add(m["id"])

        metric = SystemMetric(**m)
        db.add(metric)
        saved.append(m)

    db.commit()
    return {
        "success": True,
        "generated": len(saved),
        "metrics": saved,
    }


@router.post("/system-metrics/{metric_id}/analyze")
def analyze_metric_with_ai(metric_id: str, db: Session = Depends(get_db)):
    """Use Gemini AI to analyze a specific system metric and update its diagnosis."""
    m = db.query(SystemMetric).filter(SystemMetric.id == metric_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"System metric '{metric_id}' not found.")

    metric_dict = {
        "subsystem_name": m.subsystem_name,
        "metric_type": m.metric_type,
        "current_value": m.current_value,
        "threshold_value": m.threshold_value,
        "unit": m.unit,
        "status": m.status,
        "location": m.location,
        "trend": m.trend,
    }

    result = analyze_system_metric(metric_dict)

    m.ai_diagnosis = result["diagnosis"]
    m.ai_recommendation = result["recommendation"]
    db.commit()
    db.refresh(m)

    return {
        "success": True,
        "id": m.id,
        "aiDiagnosis": m.ai_diagnosis,
        "aiRecommendation": m.ai_recommendation,
    }


@router.patch("/system-metrics/{metric_id}/acknowledge")
def acknowledge_system_metric(metric_id: str, db: Session = Depends(get_db)):
    """Mark a system metric issue as acknowledged (set status to Healthy)."""
    m = db.query(SystemMetric).filter(SystemMetric.id == metric_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"System metric '{metric_id}' not found.")
    m.status = "Healthy"
    m.trend = "Improving"
    db.commit()
    db.refresh(m)
    return {"success": True, "id": m.id, "status": m.status}


@router.delete("/system-metrics/clear")
def clear_system_metrics(db: Session = Depends(get_db)):
    """Delete all system metrics (for regeneration)."""
    count = db.query(SystemMetric).delete()
    db.commit()
    return {"success": True, "deleted": count}
