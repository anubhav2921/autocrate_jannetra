from fastapi import APIRouter, Depends
from ..mongodb import sources_collection, news_articles_collection, detection_results_collection
from ..utils import get_current_user

router = APIRouter(prefix="/api", tags=["Sources"])


@router.get("/sources")
async def list_sources(current_user: dict = Depends(get_current_user)):
    sources = await sources_collection.find({}).to_list(None)
    result = []
    for s in sources:
        domain = s.get("domain")
        article_count = await news_articles_collection.count_documents({"source_domain": domain})
        fake_count = await news_articles_collection.count_documents({
            "source_domain": domain,
            "fake_news_label": "FAKE"
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
