from fastapi import APIRouter
from ..mongodb import sources_collection, articles_collection, detection_results_collection

router = APIRouter(prefix="/api", tags=["Sources"])


@router.get("/sources")
async def list_sources():
    sources = await sources_collection.find({}).to_list(None)
    result = []
    for s in sources:
        article_count = await articles_collection.count_documents({"source_id": s["id"]})
        fake_count = await detection_results_collection.count_documents({
            "label": "FAKE",
            "article_id": {"$in": [
                a["id"] async for a in articles_collection.find({"source_id": s["id"]}, {"id": 1})
            ]}
        })
        last_audited = s.get("last_audited_at")
        result.append({
            "id": s["id"],
            "name": s.get("name"),
            "source_type": s.get("source_type"),
            "domain": s.get("domain"),
            "credibility_tier": s.get("credibility_tier"),
            "historical_accuracy": s.get("historical_accuracy"),
            "last_audited_at": last_audited.isoformat() if hasattr(last_audited, "isoformat") else last_audited,
            "article_count": article_count,
            "fake_count": fake_count,
        })
    return {"sources": result}
