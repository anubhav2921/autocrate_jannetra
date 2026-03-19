"""
Location API — Hierarchical location filter endpoints

Provides:
  GET /api/location/hierarchy      → Full State→District→City→Ward tree
  GET /api/location/states         → List of all states
  GET /api/location/districts      → Districts for a given state
  GET /api/location/cities         → Cities for a given state+district
  GET /api/location/wards          → Wards for a given state+district+city
  GET /api/location/dashboard      → Dashboard stats filtered by location params
  GET /api/location/issues         → Issues filtered by location params
  GET /api/location/map-markers    → Map markers filtered by location params
"""

from fastapi import APIRouter, Query
from typing import Optional

from ..mongodb import news_articles_collection, signal_problems_collection

router = APIRouter(prefix="/api/location", tags=["Location"])

# Static hierarchical India location tree (unchanged)
INDIA_LOCATION_TREE: dict = {
    "Uttar Pradesh": {
        "districts": {
            "Prayagraj": {
                "cities": {
                    "Prayagraj": ["Ward 1 - Civil Lines", "Ward 2 - George Town", "Ward 3 - Kareli", "Ward 4 - Colonelganj"],
                    "Naini": ["Ward 1", "Ward 2"],
                    "Phaphamau": ["Ward 1", "Ward 2"],
                },
                "lat": 25.4358, "lng": 81.8463,
            },
            "Lucknow": {
                "cities": {
                    "Lucknow": ["Ward 1 - Hazratganj", "Ward 2 - Gomti Nagar", "Ward 3 - Alambagh", "Ward 4 - Aliganj"],
                    "Chinhat": ["Ward 1", "Ward 2"],
                },
                "lat": 26.8467, "lng": 80.9462,
            },
            "Varanasi": {
                "cities": {
                    "Varanasi": ["Ward 1 - Godowlia", "Ward 2 - Lanka", "Ward 3 - Sigra", "Ward 4 - Assi"],
                },
                "lat": 25.3176, "lng": 82.9739,
            },
            "Agra": {
                "cities": {
                    "Agra": ["Ward 1 - Tajganj", "Ward 2 - Sikandra", "Ward 3 - Balkeshwar"],
                },
                "lat": 27.1767, "lng": 78.0081,
            },
            "Kanpur": {
                "cities": {
                    "Kanpur": ["Ward 1 - Armapur", "Ward 2 - Kalyanpur", "Ward 3 - Kidwai Nagar"],
                },
                "lat": 26.4499, "lng": 80.3319,
            },
        },
        "lat": 26.8467, "lng": 80.9462,
    },
    "Maharashtra": {
        "districts": {
            "Mumbai City": {
                "cities": {
                    "Mumbai": ["Ward A - Colaba", "Ward B - Dadar", "Ward C - Bandra", "Ward D - Andheri"],
                    "Kurla": ["Ward 1", "Ward 2"],
                },
                "lat": 19.076, "lng": 72.8777,
            },
            "Pune": {
                "cities": {
                    "Pune": ["Ward 1 - Shivajinagar", "Ward 2 - Kothrud", "Ward 3 - Hadapsar", "Ward 4 - Pimpri"],
                    "Pimpri-Chinchwad": ["Ward 1", "Ward 2"],
                },
                "lat": 18.5204, "lng": 73.8567,
            },
            "Nagpur": {
                "cities": {
                    "Nagpur": ["Ward 1 - Dharampeth", "Ward 2 - Sadar", "Ward 3 - Itwari"],
                },
                "lat": 21.1458, "lng": 79.0882,
            },
            "Nashik": {
                "cities": {
                    "Nashik": ["Ward 1 - Nashik Road", "Ward 2 - Panchavati"],
                },
                "lat": 19.9975, "lng": 73.7898,
            },
        },
        "lat": 19.076, "lng": 72.8777,
    },
    "Karnataka": {
        "districts": {
            "Bangalore Urban": {
                "cities": {
                    "Bangalore": ["Ward 1 - Rajajinagar", "Ward 2 - Koramangala", "Ward 3 - Whitefield", "Ward 4 - Jayanagar"],
                    "Yelahanka": ["Ward 1", "Ward 2"],
                },
                "lat": 12.9716, "lng": 77.5946,
            },
            "Mysuru": {
                "cities": {
                    "Mysuru": ["Ward 1 - Nazarbad", "Ward 2 - Chamundi Hills", "Ward 3 - Saraswathipuram"],
                },
                "lat": 12.2958, "lng": 76.6394,
            },
            "Mangaluru": {
                "cities": {
                    "Mangaluru": ["Ward 1 - Hampankatta", "Ward 2 - Bejai"],
                },
                "lat": 12.9141, "lng": 74.856,
            },
        },
        "lat": 12.9716, "lng": 77.5946,
    },
    "Delhi": {
        "districts": {
            "Central Delhi": {"cities": {"Delhi": ["Ward 1 - Connaught Place", "Ward 2 - Paharganj", "Ward 3 - Karol Bagh"]}, "lat": 28.6469, "lng": 77.2094},
            "South Delhi": {"cities": {"Delhi": ["Ward 1 - Saket", "Ward 2 - Malviya Nagar", "Ward 3 - Hauz Khas"]}, "lat": 28.5355, "lng": 77.2459},
            "North Delhi": {"cities": {"Delhi": ["Ward 1 - Civil Lines", "Ward 2 - Model Town", "Ward 3 - Rohini"]}, "lat": 28.7041, "lng": 77.1025},
            "East Delhi": {"cities": {"Delhi": ["Ward 1 - Preet Vihar", "Ward 2 - Laxmi Nagar", "Ward 3 - Mayur Vihar"]}, "lat": 28.6217, "lng": 77.2921},
        },
        "lat": 28.6139, "lng": 77.209,
    },
    "West Bengal": {
        "districts": {
            "Kolkata": {"cities": {"Kolkata": ["Ward 1 - Park Street", "Ward 2 - Salt Lake", "Ward 3 - Howrah", "Ward 4 - Jadavpur"]}, "lat": 22.5726, "lng": 88.3639},
            "Howrah": {"cities": {"Howrah": ["Ward 1 - Shibpur", "Ward 2 - Liluah"]}, "lat": 22.5958, "lng": 88.2636},
        },
        "lat": 22.5726, "lng": 88.3639,
    },
    "Tamil Nadu": {
        "districts": {
            "Chennai": {"cities": {"Chennai": ["Ward 1 - Anna Nagar", "Ward 2 - T. Nagar", "Ward 3 - Adyar", "Ward 4 - Velachery"]}, "lat": 13.0827, "lng": 80.2707},
            "Coimbatore": {"cities": {"Coimbatore": ["Ward 1 - RS Puram", "Ward 2 - Ganapathy", "Ward 3 - Peelamedu"]}, "lat": 11.0168, "lng": 76.9558},
            "Madurai": {"cities": {"Madurai": ["Ward 1 - Meenakshi Amman Kovil", "Ward 2 - KK Nagar"]}, "lat": 9.9252, "lng": 78.1198},
        },
        "lat": 13.0827, "lng": 80.2707,
    },
    "Telangana": {
        "districts": {
            "Hyderabad": {"cities": {"Hyderabad": ["Ward 1 - Banjara Hills", "Ward 2 - Jubilee Hills", "Ward 3 - HITEC City", "Ward 4 - Secunderabad"], "Cyberabad": ["Ward 1", "Ward 2"]}, "lat": 17.385, "lng": 78.4867},
            "Rangareddy": {"cities": {"Shamshabad": ["Ward 1", "Ward 2"], "LB Nagar": ["Ward 1", "Ward 2"]}, "lat": 17.3617, "lng": 78.3867},
        },
        "lat": 17.385, "lng": 78.4867,
    },
    "Gujarat": {
        "districts": {
            "Ahmedabad": {"cities": {"Ahmedabad": ["Ward 1 - Maninagar", "Ward 2 - Satellite", "Ward 3 - Navrangpura"]}, "lat": 23.0225, "lng": 72.5714},
            "Surat": {"cities": {"Surat": ["Ward 1 - Adajan", "Ward 2 - Athwa", "Ward 3 - Varachha"]}, "lat": 21.1702, "lng": 72.8311},
        },
        "lat": 23.0225, "lng": 72.5714,
    },
    "Rajasthan": {
        "districts": {
            "Jaipur": {"cities": {"Jaipur": ["Ward 1 - Civil Lines", "Ward 2 - Vaishali Nagar", "Ward 3 - Mansarovar"]}, "lat": 26.9124, "lng": 75.7873},
            "Jodhpur": {"cities": {"Jodhpur": ["Ward 1 - Ratanada", "Ward 2 - Sardarpura"]}, "lat": 26.2389, "lng": 73.0243},
        },
        "lat": 26.9124, "lng": 75.7873,
    },
    "Madhya Pradesh": {
        "districts": {
            "Bhopal": {"cities": {"Bhopal": ["Ward 1 - New Market", "Ward 2 - BHEL", "Ward 3 - Kolar"]}, "lat": 23.2599, "lng": 77.4126},
            "Indore": {"cities": {"Indore": ["Ward 1 - Rajwada", "Ward 2 - Vijay Nagar", "Ward 3 - Palasia"]}, "lat": 22.7196, "lng": 75.8577},
        },
        "lat": 23.2599, "lng": 77.4126,
    },
    "Bihar": {
        "districts": {
            "Patna": {"cities": {"Patna": ["Ward 1 - Patna Sahib", "Ward 2 - Boring Road", "Ward 3 - Kankarbagh"]}, "lat": 25.6093, "lng": 85.1376},
            "Gaya": {"cities": {"Gaya": ["Ward 1 - Bodh Gaya", "Ward 2 - Civil Lines"]}, "lat": 24.7914, "lng": 85.0002},
        },
        "lat": 25.6093, "lng": 85.1376,
    },
    "Punjab": {
        "districts": {
            "Chandigarh": {"cities": {"Chandigarh": ["Sector 17", "Sector 22", "Sector 35", "Sector 43"]}, "lat": 30.7333, "lng": 76.7794},
            "Amritsar": {"cities": {"Amritsar": ["Ward 1 - Golden Temple Area", "Ward 2 - Lawrence Road"]}, "lat": 31.634, "lng": 74.8723},
            "Ludhiana": {"cities": {"Ludhiana": ["Ward 1 - Sarabha Nagar", "Ward 2 - Civil Lines"]}, "lat": 30.9009, "lng": 75.8573},
        },
        "lat": 30.7333, "lng": 76.7794,
    },
    "Kerala": {
        "districts": {
            "Ernakulam": {"cities": {"Kochi": ["Ward 1 - Fort Kochi", "Ward 2 - Edapally", "Ward 3 - Kakkanad"]}, "lat": 9.9312, "lng": 76.2673},
            "Thiruvananthapuram": {"cities": {"Thiruvananthapuram": ["Ward 1 - Kowdiar", "Ward 2 - Pattom", "Ward 3 - Kesavadasapuram"]}, "lat": 8.5241, "lng": 76.9366},
        },
        "lat": 9.9312, "lng": 76.2673,
    },
}


def _build_location_match(state, district, city, ward) -> dict:
    """Build MongoDB match filter for location fields."""
    match = {}
    if state:
        match["$or"] = [
            {"state": {"$regex": f"^\\s*{state}\\s*$", "$options": "i"}},
            {"location": {"$regex": state, "$options": "i"}},
            {"locations": {"$in": [state]}}
        ]
    if district:
        # If state filter already added $or, we need to be careful.
        # But usually we want AND between state and district.
        # So we use nested $and or just add to the match if possible.
        d_match = {"$or": [
            {"district": {"$regex": f"^\\s*{district}\\s*$", "$options": "i"}},
            {"location": {"$regex": district, "$options": "i"}},
            {"locations": {"$in": [district]}}
        ]}
        if "$and" not in match: match["$and"] = []
        match["$and"].append(d_match)

    if city:
        c_match = {"$or": [
            {"city": {"$regex": f"^\\s*{city}\\s*$", "$options": "i"}},
            {"location": {"$regex": city, "$options": "i"}},
            {"locations": {"$in": [city]}}
        ]}
        if "$and" not in match: match["$and"] = []
        match["$and"].append(c_match)

    if ward:
        w_match = {"$or": [
            {"ward": {"$regex": f"^\\s*{ward}\\s*$", "$options": "i"}},
            {"location": {"$regex": ward, "$options": "i"}}
        ]}
        if "$and" not in match: match["$and"] = []
        match["$and"].append(w_match)

    # Simplified if only state exists
    if state and not (district or city or ward):
        return {"$or": [
            {"state": {"$regex": f"^\\s*{state}\\s*$", "$options": "i"}},
            {"location": {"$regex": state, "$options": "i"}},
            {"locations": {"$in": [state]}}
        ]}

    return match


def _location_label(state, district, city, ward) -> str:
    parts = [x for x in [ward, city, district, state] if x]
    return ", ".join(parts) if parts else "All India"


def _article_location_str(a: dict) -> str:
    parts = [x for x in [a.get("city"), a.get("district"), a.get("state")] if x]
    return ", ".join(parts) if parts else (a.get("source_name") or "Unknown")


# ─────────────────────────────────────────────
# Static hierarchy endpoints (no DB needed)
# ─────────────────────────────────────────────

@router.get("/states")
def get_states():
    return {"states": sorted(INDIA_LOCATION_TREE.keys())}


@router.get("/districts")
def get_districts(state: str = Query(..., description="State name")):
    state_data = INDIA_LOCATION_TREE.get(state, {})
    districts = sorted(state_data.get("districts", {}).keys())
    return {"state": state, "districts": districts}


@router.get("/cities")
def get_cities(state: str = Query(...), district: str = Query(...)):
    state_data = INDIA_LOCATION_TREE.get(state, {})
    district_data = state_data.get("districts", {}).get(district, {})
    cities = sorted(district_data.get("cities", {}).keys())
    return {"state": state, "district": district, "cities": cities}


@router.get("/wards")
def get_wards(state: str = Query(...), district: str = Query(...), city: str = Query(...)):
    state_data = INDIA_LOCATION_TREE.get(state, {})
    district_data = state_data.get("districts", {}).get(district, {})
    wards = district_data.get("cities", {}).get(city, [])
    return {"state": state, "district": district, "city": city, "wards": wards}


# ─────────────────────────────────────────────
# Data endpoints
# ─────────────────────────────────────────────

@router.get("/dashboard")
async def get_location_dashboard(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
):
    match = _build_location_match(state, district, city, ward)

    total = await news_articles_collection.count_documents(match)

    agg = await news_articles_collection.aggregate([
        {"$match": match},
        {"$group": {
            "_id": None,
            "avg_risk": {"$avg": "$risk_score"},
            "avg_anger": {"$avg": "$anger_rating"},
        }}
    ]).to_list(1)
    avg_risk_val = agg[0]["avg_risk"] if agg else 0
    avg_anger_val = agg[0]["avg_anger"] if agg else 0

    fake_match = {**match, "fake_news_label": "FAKE"}
    fake_count = await news_articles_collection.count_documents(fake_match)

    high_match = {**match, "risk_level": {"$in": ["HIGH", "MODERATE"]}}
    active_alerts = await news_articles_collection.count_documents(high_match)

    fake_pct = round((fake_count / max(total, 1)) * 100, 1)

    sent_pipeline = [
        {"$match": match},
        {"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}},
    ]
    sent_res = await news_articles_collection.aggregate(sent_pipeline).to_list(None)

    cat_pipeline = [
        {"$match": match},
        {"$group": {"_id": "$category", "avg_gri": {"$avg": "$risk_score"}, "count": {"$sum": 1}}},
        {"$sort": {"avg_gri": -1}},
    ]
    cat_res = await news_articles_collection.aggregate(cat_pipeline).to_list(None)

    # Location Heatmap Logic: Group by the next hierarchical level
    group_field = "state"
    if state: group_field = "district"
    if district: group_field = "city"
    if city: group_field = "ward"

    loc_pipeline = [
        {"$match": match},
        {"$group": {
            "_id": f"${group_field}",
            "avg_gri": {"$avg": "$risk_score"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"avg_gri": -1}},
        {"$limit": 12}
    ]
    loc_res = await news_articles_collection.aggregate(loc_pipeline).to_list(12)

    # Fetch Trending Problems from aggregated SignalProblems collection
    # These are consolidated clusters rather than raw articles
    top_issues = await signal_problems_collection.find(match).sort("priority_score", -1).limit(10).to_list(10)

    return {
        "location_context": {
            "state": state, "district": district, "city": city, "ward": ward,
            "label": _location_label(state, district, city, ward),
        },
        "overall_gri": round(avg_risk_val, 1),
        "total_articles": total,
        "fake_news_percentage": fake_pct,
        "average_anger": round(avg_anger_val, 2),
        "active_alerts": active_alerts,
        "sentiment_distribution": {r["_id"]: r["count"] for r in sent_res if r["_id"]},
        "category_risk": [
            {"category": r["_id"] or "General", "avg_gri": round(r["avg_gri"] or 0, 1), "count": r["count"]}
            for r in cat_res
        ],
        "location_risk": [
            {"location": r["_id"] or f"General {group_field.capitalize()}", "avg_gri": round(r["avg_gri"] or 0, 1), "count": r["count"]}
            for r in loc_res if r["_id"]
        ],
        "top_risks": [
            {
                "id": a["id"],
                "title": a.get("title"),
                "category": a.get("category"),
                "location": a.get("location") or ", ".join(a.get("locations", [])) or a.get("city") or "India",
                "gri_score": round(a.get("priority_score") or a.get("risk_score") or 0, 1),
                "frequency": a.get("frequency", 1),
                "priority_score": a.get("priority_score", 0.0),
                "risk_level": a.get("severity", "LOW"),
                "label": "VERIFIED" if a.get("frequency", 1) > 2 else "SINGLE_SIGNAL",
                "anger_rating": round(a.get("anger_avg") or 0, 1),
                "status": a.get("status", "Pending")
            }
            for a in top_issues
        ],
        "critical_alerts": [],
    }


@router.get("/issues")
async def get_location_issues(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    match = _build_location_match(state, district, city, ward)
    if category:
        match["category"] = category
    if status:
        match["risk_level"] = status.upper()

    total = await news_articles_collection.count_documents(match)
    issues = await news_articles_collection.find(match).sort("risk_score", -1).skip(offset).limit(limit).to_list(limit)

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "location_context": {
            "state": state, "district": district, "city": city, "ward": ward,
            "label": _location_label(state, district, city, ward),
        },
        "issues": [
            {
                "id": a["id"],
                "title": a.get("title"),
                "description": (a.get("content") or "")[:300],
                "category": a.get("category"),
                "state": a.get("state"),
                "district": a.get("district"),
                "city": a.get("city"),
                "ward": a.get("ward"),
                "latitude": a.get("latitude"),
                "longitude": a.get("longitude"),
                "status": a.get("risk_level"),
                "risk_score": round(a.get("risk_score") or 0, 1),
                "sentiment": a.get("sentiment_label"),
                "anger_rating": round(a.get("anger_rating") or 0, 1),
                "fake_news_label": a.get("fake_news_label"),
                "source": a.get("source_name"),
                "created_at": a["scraped_at"].isoformat() if hasattr(a.get("scraped_at"), "isoformat") else a.get("scraped_at"),
            }
            for a in issues
        ],
    }


@router.get("/map-markers")
async def get_location_map_markers(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
):
    match = _build_location_match(state, district, city, ward)

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": {
                "city": "$city",
                "state": "$state",
                "district": "$district",
                "latitude": "$latitude",
                "longitude": "$longitude",
            },
            "avg_gri": {"$avg": "$risk_score"},
            "max_gri": {"$max": "$risk_score"},
            "count": {"$sum": 1},
            "avg_anger": {"$avg": "$anger_rating"},
        }},
        {"$sort": {"avg_gri": -1}},
    ]
    results = await news_articles_collection.aggregate(pipeline).to_list(None)

    def _get_coords(city_name, state_name, dist_name):
        try:
            state_d = INDIA_LOCATION_TREE.get(state_name, {})
            dist_d = state_d.get("districts", {}).get(dist_name, {})
            return dist_d.get("lat"), dist_d.get("lng")
        except Exception:
            return None, None

    markers = []
    for r in results:
        loc = r["_id"]
        lat = loc.get("latitude")
        lng = loc.get("longitude")
        if not lat or not lng:
            lat, lng = _get_coords(loc.get("city"), loc.get("state"), loc.get("district"))
        if not lat or not lng:
            continue

        avg_gri = r.get("avg_gri") or 0
        risk_level = "HIGH" if avg_gri > 60 else "MODERATE" if avg_gri > 30 else "LOW"
        markers.append({
            "location": loc.get("city") or loc.get("district") or loc.get("state") or "Unknown",
            "state": loc.get("state"),
            "district": loc.get("district"),
            "lat": lat,
            "lng": lng,
            "avg_gri": round(avg_gri, 1),
            "max_gri": round(r.get("max_gri") or 0, 1),
            "signal_count": r["count"],
            "avg_anger": round(r.get("avg_anger") or 0, 1),
            "risk_level": risk_level,
        })

    if state and state in INDIA_LOCATION_TREE:
        center = [INDIA_LOCATION_TREE[state]["lat"], INDIA_LOCATION_TREE[state]["lng"]]
        zoom = 7
    elif district and markers:
        center = [markers[0]["lat"], markers[0]["lng"]]
        zoom = 10
    elif city and markers:
        center = [markers[0]["lat"], markers[0]["lng"]]
        zoom = 12
    else:
        center = [22.5, 78.5]
        zoom = 5

    return {"markers": markers, "center": center, "zoom": zoom}
