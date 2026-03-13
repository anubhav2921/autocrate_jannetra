from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Article, GovernanceRiskScore, SentimentRecord, DetectionResult, NewsArticle

router = APIRouter(prefix="/api", tags=["Map"])

# Indian city coordinates
CITY_COORDS = {
    "Mumbai": [19.076, 72.8777], "Delhi": [28.6139, 77.209],
    "Bangalore": [12.9716, 77.5946], "Hyderabad": [17.385, 78.4867],
    "Chennai": [13.0827, 80.2707], "Kolkata": [22.5726, 88.3639],
    "Pune": [18.5204, 73.8567], "Jaipur": [26.9124, 75.7873],
    "Lucknow": [26.8467, 80.9462], "Ahmedabad": [23.0225, 72.5714],
    "Patna": [25.6093, 85.1376], "Bhopal": [23.2599, 77.4126],
    "Chandigarh": [30.7333, 76.7794], "Varanasi": [25.3176, 82.9739],
    "Nagpur": [21.1458, 79.0882], "Indore": [22.7196, 75.8577],
    "Surat": [21.1702, 72.8311], "Noida": [28.5355, 77.391],
    "Gurgaon": [28.4595, 77.0266], "Ranchi": [23.3441, 85.3096],
    "Thane": [19.2183, 72.9781], "Nashik": [19.9975, 73.7898],
}

# Category → representative city mapping (for map display when location is unavailable)
CATEGORY_CITY_MAP = {
    "Corruption": "Delhi",
    "Infrastructure": "Mumbai",
    "Healthcare": "Chennai",
    "Education": "Bangalore",
    "Agriculture": "Patna",
    "Environment": "Kolkata",
    "Economy": "Ahmedabad",
    "Law & Order": "Lucknow",
    "Water": "Jaipur",
    "Transport": "Pune",
    "Energy": "Hyderabad",
    "General": "Bhopal",
    "Politics": "Delhi",
    "Security": "Chandigarh",
    "Social": "Varanasi",
    "Science": "Bangalore",
    "Technology": "Noida",
    "Finance": "Mumbai",
    "Health": "Chennai",
    "Sports": "Kolkata",
}


@router.get("/map/markers")
def get_map_markers(db: Session = Depends(get_db)):
    """Get problem location markers with risk data for the map."""

    # Try legacy Article table first (has real city location data)
    article_count = db.query(func.count(Article.id)).scalar() or 0
    if article_count > 0:
        results = (
            db.query(
                Article.location,
                func.avg(GovernanceRiskScore.gri_score).label("avg_gri"),
                func.max(GovernanceRiskScore.gri_score).label("max_gri"),
                func.count(Article.id).label("count"),
                func.avg(SentimentRecord.anger_rating).label("avg_anger"),
            )
            .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
            .outerjoin(SentimentRecord, SentimentRecord.article_id == Article.id)
            .group_by(Article.location)
            .all()
        )

        markers = []
        for r in results:
            coords = CITY_COORDS.get(r.location)
            if not coords:
                continue

            top_article = (
                db.query(Article, GovernanceRiskScore, DetectionResult)
                .join(GovernanceRiskScore, GovernanceRiskScore.article_id == Article.id)
                .join(DetectionResult, DetectionResult.article_id == Article.id)
                .filter(Article.location == r.location)
                .order_by(GovernanceRiskScore.gri_score.desc())
                .first()
            )

            risk_level = "HIGH" if r.avg_gri > 60 else "MODERATE" if r.avg_gri > 30 else "LOW"

            markers.append({
                "location": r.location,
                "lat": coords[0],
                "lng": coords[1],
                "avg_gri": round(r.avg_gri, 1),
                "max_gri": round(r.max_gri, 1),
                "signal_count": r.count,
                "avg_anger": round(r.avg_anger, 1) if r.avg_anger else 0,
                "risk_level": risk_level,
                "top_problem": {
                    "title": top_article[0].title if top_article else None,
                    "category": top_article[0].category if top_article else None,
                    "label": top_article[2].label if top_article else None,
                    "gri": top_article[1].gri_score if top_article else None,
                } if top_article else None,
            })

        return {"markers": markers, "center": [22.5, 78.5], "zoom": 5}

    # Fallback: NewsArticle grouped by category → mapped to cities
    results = (
        db.query(
            NewsArticle.category,
            func.avg(NewsArticle.risk_score).label("avg_gri"),
            func.max(NewsArticle.risk_score).label("max_gri"),
            func.count(NewsArticle.id).label("count"),
            func.avg(NewsArticle.anger_rating).label("avg_anger"),
        )
        .group_by(NewsArticle.category)
        .order_by(func.avg(NewsArticle.risk_score).desc())
        .all()
    )

    markers = []
    used_cities = set()

    for r in results:
        city = CATEGORY_CITY_MAP.get(r.category or "General", "Delhi")
        # Avoid duplicate map pins for the same city
        if city in used_cities:
            continue
        used_cities.add(city)

        coords = CITY_COORDS.get(city)
        if not coords:
            continue

        # Top article for this category
        top_article = (
            db.query(NewsArticle)
            .filter(NewsArticle.category == r.category)
            .order_by(NewsArticle.risk_score.desc())
            .first()
        )

        risk_level = "HIGH" if (r.avg_gri or 0) > 60 else "MODERATE" if (r.avg_gri or 0) > 30 else "LOW"

        markers.append({
            "location": city,
            "lat": coords[0],
            "lng": coords[1],
            "avg_gri": round(r.avg_gri or 0, 1),
            "max_gri": round(r.max_gri or 0, 1),
            "signal_count": r.count,
            "avg_anger": round(r.avg_anger or 0, 1),
            "risk_level": risk_level,
            "top_problem": {
                "title": top_article.title if top_article else None,
                "category": r.category,
                "label": top_article.fake_news_label if top_article else None,
                "gri": round(top_article.risk_score or 0, 1) if top_article else None,
            } if top_article else None,
        })

    return {"markers": markers, "center": [22.5, 78.5], "zoom": 5}
