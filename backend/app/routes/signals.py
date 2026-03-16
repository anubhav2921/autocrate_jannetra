from fastapi import APIRouter
from ..mongodb import news_articles_collection

router = APIRouter(prefix="/api", tags=["Signals"])

@router.get("/signals")
async def get_signals():
    """Fallback legacy equivalent route, now loading from news_articles_collection."""
    results = await news_articles_collection.find(
        {"risk_score": {"$exists": True}}
    ).sort("risk_score", -1).limit(100).to_list(100)

    def _article_location_str(a: dict) -> str:
        parts = [x for x in [a.get("city"), a.get("district"), a.get("state")] if x]
        return ", ".join(parts) if parts else (a.get("source_name") or "Unknown")

    return [
        {
            "id": r["id"],
            "title": r.get("title"),
            "category": r.get("category"),
            "location": _article_location_str(r),
            "risk": r.get("risk_score"),
            "status": "ACTIVE"
        }
        for r in results
    ]