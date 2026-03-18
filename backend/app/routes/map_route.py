from fastapi import APIRouter
from ..mongodb import articles_collection, gri_scores_collection, sentiment_records_collection, detection_results_collection, news_articles_collection

router = APIRouter(prefix="/api", tags=["Map"])

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

CATEGORY_CITY_MAP = {
    "Corruption": "Delhi", "Infrastructure": "Mumbai", "Healthcare": "Chennai",
    "Education": "Bangalore", "Agriculture": "Patna", "Environment": "Kolkata",
    "Economy": "Ahmedabad", "Law & Order": "Lucknow", "Water": "Jaipur",
    "Transport": "Pune", "Energy": "Hyderabad", "General": "Bhopal",
    "Politics": "Delhi", "Security": "Chandigarh", "Social": "Varanasi",
    "Science": "Bangalore", "Technology": "Noida", "Finance": "Mumbai",
    "Health": "Chennai", "Sports": "Kolkata",
}


@router.get("/map/markers")
async def get_map_markers():
    """Get problem location markers with risk data for the map."""
    # Use actual city data from NewsArticle collection
    pipeline = [
        {"$match": {"city": {"$ne": None}, "latitude": {"$ne": None}, "longitude": {"$ne": None}}},
        {"$group": {
            "_id": "$city",
            "avg_gri": {"$avg": "$risk_score"},
            "max_gri": {"$max": "$risk_score"},
            "count": {"$sum": 1},
            "avg_anger": {"$avg": "$anger_rating"},
            "lat": {"$first": "$latitude"},
            "lng": {"$first": "$longitude"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    
    results = await news_articles_collection.aggregate(pipeline).to_list(None)

    markers = []
    for r in results:
        city = r["_id"]
        avg_gri = r.get("avg_gri") or 0
        risk_level = "HIGH" if avg_gri > 60 else "MODERATE" if avg_gri > 30 else "LOW"

        # Find the most relevant article for this city
        top_article = await news_articles_collection.find_one(
            {"city": city},
            sort=[("risk_score", -1)]
        )

        markers.append({
            "location": city,
            "lat": r["lat"],
            "lng": r["lng"],
            "avg_gri": round(avg_gri, 1),
            "max_gri": round(r.get("max_gri") or 0, 1),
            "signal_count": r["count"],
            "avg_anger": round(r.get("avg_anger") or 0, 1),
            "risk_level": risk_level,
            "top_problem": {
                "title": top_article.get("title") if top_article else None,
                "category": top_article.get("category") if top_article else "General",
                "label": top_article.get("fake_news_label") if top_article else "UNCERTAIN",
                "gri": round(top_article.get("risk_score") or 0, 1) if top_article else None,
            } if top_article else None,
        })

    # If no markers found, fall back to a default center
    return {
        "markers": markers, 
        "center": [22.5, 78.5], 
        "zoom": 5,
        "total_active": len(markers)
    }
