"""
Location API — Hierarchical location filter endpoints
══════════════════════════════════════════════════════
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

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from ..database import get_db
from ..models import NewsArticle, SignalProblem

router = APIRouter(prefix="/api/location", tags=["Location"])

# ─────────────────────────────────────────────────────────────────────────────
# Static hierarchical India location tree
# (State → Districts → Cities → Wards)
# ─────────────────────────────────────────────────────────────────────────────
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
            "Central Delhi": {
                "cities": {
                    "Delhi": ["Ward 1 - Connaught Place", "Ward 2 - Paharganj", "Ward 3 - Karol Bagh"],
                },
                "lat": 28.6469, "lng": 77.2094,
            },
            "South Delhi": {
                "cities": {
                    "Delhi": ["Ward 1 - Saket", "Ward 2 - Malviya Nagar", "Ward 3 - Hauz Khas"],
                },
                "lat": 28.5355, "lng": 77.2459,
            },
            "North Delhi": {
                "cities": {
                    "Delhi": ["Ward 1 - Civil Lines", "Ward 2 - Model Town", "Ward 3 - Rohini"],
                },
                "lat": 28.7041, "lng": 77.1025,
            },
            "East Delhi": {
                "cities": {
                    "Delhi": ["Ward 1 - Preet Vihar", "Ward 2 - Laxmi Nagar", "Ward 3 - Mayur Vihar"],
                },
                "lat": 28.6217, "lng": 77.2921,
            },
        },
        "lat": 28.6139, "lng": 77.209,
    },
    "West Bengal": {
        "districts": {
            "Kolkata": {
                "cities": {
                    "Kolkata": ["Ward 1 - Park Street", "Ward 2 - Salt Lake", "Ward 3 - Howrah", "Ward 4 - Jadavpur"],
                },
                "lat": 22.5726, "lng": 88.3639,
            },
            "Howrah": {
                "cities": {
                    "Howrah": ["Ward 1 - Shibpur", "Ward 2 - Liluah"],
                },
                "lat": 22.5958, "lng": 88.2636,
            },
        },
        "lat": 22.5726, "lng": 88.3639,
    },
    "Tamil Nadu": {
        "districts": {
            "Chennai": {
                "cities": {
                    "Chennai": ["Ward 1 - Anna Nagar", "Ward 2 - T. Nagar", "Ward 3 - Adyar", "Ward 4 - Velachery"],
                },
                "lat": 13.0827, "lng": 80.2707,
            },
            "Coimbatore": {
                "cities": {
                    "Coimbatore": ["Ward 1 - RS Puram", "Ward 2 - Ganapathy", "Ward 3 - Peelamedu"],
                },
                "lat": 11.0168, "lng": 76.9558,
            },
            "Madurai": {
                "cities": {
                    "Madurai": ["Ward 1 - Meenakshi Amman Kovil", "Ward 2 - KK Nagar"],
                },
                "lat": 9.9252, "lng": 78.1198,
            },
        },
        "lat": 13.0827, "lng": 80.2707,
    },
    "Telangana": {
        "districts": {
            "Hyderabad": {
                "cities": {
                    "Hyderabad": ["Ward 1 - Banjara Hills", "Ward 2 - Jubilee Hills", "Ward 3 - HITEC City", "Ward 4 - Secunderabad"],
                    "Cyberabad": ["Ward 1", "Ward 2"],
                },
                "lat": 17.385, "lng": 78.4867,
            },
            "Rangareddy": {
                "cities": {
                    "Shamshabad": ["Ward 1", "Ward 2"],
                    "LB Nagar": ["Ward 1", "Ward 2"],
                },
                "lat": 17.3617, "lng": 78.3867,
            },
        },
        "lat": 17.385, "lng": 78.4867,
    },
    "Gujarat": {
        "districts": {
            "Ahmedabad": {
                "cities": {
                    "Ahmedabad": ["Ward 1 - Maninagar", "Ward 2 - Satellite", "Ward 3 - Navrangpura"],
                },
                "lat": 23.0225, "lng": 72.5714,
            },
            "Surat": {
                "cities": {
                    "Surat": ["Ward 1 - Adajan", "Ward 2 - Athwa", "Ward 3 - Varachha"],
                },
                "lat": 21.1702, "lng": 72.8311,
            },
        },
        "lat": 23.0225, "lng": 72.5714,
    },
    "Rajasthan": {
        "districts": {
            "Jaipur": {
                "cities": {
                    "Jaipur": ["Ward 1 - Civil Lines", "Ward 2 - Vaishali Nagar", "Ward 3 - Mansarovar"],
                },
                "lat": 26.9124, "lng": 75.7873,
            },
            "Jodhpur": {
                "cities": {
                    "Jodhpur": ["Ward 1 - Ratanada", "Ward 2 - Sardarpura"],
                },
                "lat": 26.2389, "lng": 73.0243,
            },
        },
        "lat": 26.9124, "lng": 75.7873,
    },
    "Madhya Pradesh": {
        "districts": {
            "Bhopal": {
                "cities": {
                    "Bhopal": ["Ward 1 - New Market", "Ward 2 - BHEL", "Ward 3 - Kolar"],
                },
                "lat": 23.2599, "lng": 77.4126,
            },
            "Indore": {
                "cities": {
                    "Indore": ["Ward 1 - Rajwada", "Ward 2 - Vijay Nagar", "Ward 3 - Palasia"],
                },
                "lat": 22.7196, "lng": 75.8577,
            },
        },
        "lat": 23.2599, "lng": 77.4126,
    },
    "Bihar": {
        "districts": {
            "Patna": {
                "cities": {
                    "Patna": ["Ward 1 - Patna Sahib", "Ward 2 - Boring Road", "Ward 3 - Kankarbagh"],
                },
                "lat": 25.6093, "lng": 85.1376,
            },
            "Gaya": {
                "cities": {
                    "Gaya": ["Ward 1 - Bodh Gaya", "Ward 2 - Civil Lines"],
                },
                "lat": 24.7914, "lng": 85.0002,
            },
        },
        "lat": 25.6093, "lng": 85.1376,
    },
    "Punjab": {
        "districts": {
            "Chandigarh": {
                "cities": {
                    "Chandigarh": ["Sector 17", "Sector 22", "Sector 35", "Sector 43"],
                },
                "lat": 30.7333, "lng": 76.7794,
            },
            "Amritsar": {
                "cities": {
                    "Amritsar": ["Ward 1 - Golden Temple Area", "Ward 2 - Lawrence Road"],
                },
                "lat": 31.634, "lng": 74.8723,
            },
            "Ludhiana": {
                "cities": {
                    "Ludhiana": ["Ward 1 - Sarabha Nagar", "Ward 2 - Civil Lines"],
                },
                "lat": 30.9009, "lng": 75.8573,
            },
        },
        "lat": 30.7333, "lng": 76.7794,
    },
    "Kerala": {
        "districts": {
            "Ernakulam": {
                "cities": {
                    "Kochi": ["Ward 1 - Fort Kochi", "Ward 2 - Edapally", "Ward 3 - Kakkanad"],
                },
                "lat": 9.9312, "lng": 76.2673,
            },
            "Thiruvananthapuram": {
                "cities": {
                    "Thiruvananthapuram": ["Ward 1 - Kowdiar", "Ward 2 - Pattom", "Ward 3 - Kesavadasapuram"],
                },
                "lat": 8.5241, "lng": 76.9366,
            },
        },
        "lat": 9.9312, "lng": 76.2673,
    },
}


def _build_location_filter(
    q,
    model,
    state: Optional[str],
    district: Optional[str],
    city: Optional[str],
    ward: Optional[str],
):
    """Apply location filters to a SQLAlchemy query."""
    if state:
        q = q.filter(func.lower(model.state) == func.lower(state))
    if district:
        q = q.filter(func.lower(model.district) == func.lower(district))
    if city:
        q = q.filter(func.lower(model.city) == func.lower(city))
    if ward:
        q = q.filter(func.lower(model.ward) == func.lower(ward))
    return q


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/states")
def get_states():
    """Return all available states."""
    return {"states": sorted(INDIA_LOCATION_TREE.keys())}


@router.get("/districts")
def get_districts(state: str = Query(..., description="State name")):
    """Return all districts for a given state."""
    state_data = INDIA_LOCATION_TREE.get(state, {})
    districts = sorted(state_data.get("districts", {}).keys())
    return {"state": state, "districts": districts}


@router.get("/cities")
def get_cities(
    state: str = Query(...),
    district: str = Query(...),
):
    """Return all cities for a given state + district."""
    state_data = INDIA_LOCATION_TREE.get(state, {})
    district_data = state_data.get("districts", {}).get(district, {})
    cities = sorted(district_data.get("cities", {}).keys())
    return {"state": state, "district": district, "cities": cities}


@router.get("/wards")
def get_wards(
    state: str = Query(...),
    district: str = Query(...),
    city: str = Query(...),
):
    """Return all wards for a given state + district + city."""
    state_data = INDIA_LOCATION_TREE.get(state, {})
    district_data = state_data.get("districts", {}).get(district, {})
    wards = district_data.get("cities", {}).get(city, [])
    return {"state": state, "district": district, "city": city, "wards": wards}


@router.get("/dashboard")
def get_location_dashboard(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Return dashboard stats filtered by the given location parameters.
    Falls back to all data if no location is specified.
    """
    q_base = db.query(NewsArticle)
    q_base = _build_location_filter(q_base, NewsArticle, state, district, city, ward)

    total = q_base.count()
    avg_risk = db.query(func.avg(NewsArticle.risk_score))
    avg_anger = db.query(func.avg(NewsArticle.anger_rating))
    q_risk = _build_location_filter(db.query(func.avg(NewsArticle.risk_score)), NewsArticle, state, district, city, ward)
    q_anger = _build_location_filter(db.query(func.avg(NewsArticle.anger_rating)), NewsArticle, state, district, city, ward)
    q_fake = _build_location_filter(
        db.query(func.count(NewsArticle.id)).filter(NewsArticle.fake_news_label == "FAKE"),
        NewsArticle, state, district, city, ward
    )
    q_high = _build_location_filter(
        db.query(func.count(NewsArticle.id)).filter(NewsArticle.risk_level.in_(["HIGH", "MODERATE"])),
        NewsArticle, state, district, city, ward
    )

    # Sentiment dist
    q_sent = db.query(NewsArticle.sentiment_label, func.count(NewsArticle.id))
    q_sent = _build_location_filter(q_sent, NewsArticle, state, district, city, ward)
    q_sent = q_sent.group_by(NewsArticle.sentiment_label)

    # Category risk
    q_cat = db.query(
        NewsArticle.category,
        func.avg(NewsArticle.risk_score).label("avg_gri"),
        func.count(NewsArticle.id).label("count"),
    )
    q_cat = _build_location_filter(q_cat, NewsArticle, state, district, city, ward)
    q_cat = q_cat.group_by(NewsArticle.category).order_by(func.avg(NewsArticle.risk_score).desc())

    # Top risks
    q_top = db.query(NewsArticle)
    q_top = _build_location_filter(q_top, NewsArticle, state, district, city, ward)
    q_top = q_top.order_by(NewsArticle.risk_score.desc()).limit(10)

    avg_risk_val = q_risk.scalar() or 0
    avg_anger_val = q_anger.scalar() or 0
    fake_count = q_fake.scalar() or 0
    active_alerts = q_high.scalar() or 0
    fake_pct = round((fake_count / max(total, 1)) * 100, 1)

    sentiments = q_sent.all()
    categories = q_cat.all()
    top_articles = q_top.all()

    return {
        "location_context": {
            "state": state,
            "district": district,
            "city": city,
            "ward": ward,
            "label": _location_label(state, district, city, ward),
        },
        "overall_gri": round(avg_risk_val, 1),
        "total_articles": total,
        "fake_news_percentage": fake_pct,
        "average_anger": round(avg_anger_val, 2),
        "active_alerts": active_alerts,
        "sentiment_distribution": {label: count for label, count in sentiments if label},
        "category_risk": [
            {"category": c or "General", "avg_gri": round(g or 0, 1), "count": n}
            for c, g, n in categories
        ],
        "location_risk": [],
        "top_risks": [
            {
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "location": _article_location_str(a),
                "state": a.state,
                "district": a.district,
                "city": a.city,
                "ward": a.ward,
                "gri_score": round(a.risk_score or 0, 1),
                "risk_level": a.risk_level,
                "label": a.fake_news_label,
                "confidence": round(a.fake_news_confidence or 0, 2),
                "anger_rating": round(a.anger_rating or 0, 1),
            }
            for a in top_articles
        ],
        "critical_alerts": [],
    }


@router.get("/issues")
def get_location_issues(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    """Return paginated issues list filtered by location and optional category/status."""
    q = db.query(NewsArticle)
    q = _build_location_filter(q, NewsArticle, state, district, city, ward)
    if category:
        q = q.filter(NewsArticle.category == category)
    if status:
        q = q.filter(NewsArticle.risk_level == status.upper())

    total = q.count()
    issues = q.order_by(NewsArticle.risk_score.desc()).offset(offset).limit(limit).all()

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
                "id": a.id,
                "title": a.title,
                "description": a.content[:300],
                "category": a.category,
                "state": a.state,
                "district": a.district,
                "city": a.city,
                "ward": a.ward,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "status": a.risk_level,
                "risk_score": round(a.risk_score or 0, 1),
                "sentiment": a.sentiment_label,
                "anger_rating": round(a.anger_rating or 0, 1),
                "fake_news_label": a.fake_news_label,
                "source": a.source_name,
                "created_at": a.scraped_at.isoformat() if a.scraped_at else None,
            }
            for a in issues
        ],
    }


@router.get("/map-markers")
def get_location_map_markers(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return map markers filtered by location. Groups by city."""
    q = db.query(
        NewsArticle.city,
        NewsArticle.state,
        NewsArticle.district,
        NewsArticle.latitude,
        NewsArticle.longitude,
        func.avg(NewsArticle.risk_score).label("avg_gri"),
        func.max(NewsArticle.risk_score).label("max_gri"),
        func.count(NewsArticle.id).label("count"),
        func.avg(NewsArticle.anger_rating).label("avg_anger"),
    )

    q = _build_location_filter(q, NewsArticle, state, district, city, ward)
    
    q = q.group_by(NewsArticle.city, NewsArticle.state, NewsArticle.district,
                   NewsArticle.latitude, NewsArticle.longitude)
    results = q.order_by(func.avg(NewsArticle.risk_score).desc()).all()

    # Fallback coordinates from our tree
    def _get_coords(city_name, state_name, dist_name):
        try:
            state_d = INDIA_LOCATION_TREE.get(state_name, {})
            dist_d = state_d.get("districts", {}).get(dist_name, {})
            return dist_d.get("lat"), dist_d.get("lng")
        except Exception:
            return None, None

    markers = []
    for r in results:
        lat = r.latitude
        lng = r.longitude
        if not lat or not lng:
            lat, lng = _get_coords(r.city, r.state, r.district)
        if not lat or not lng:
            continue

        risk_level = "HIGH" if (r.avg_gri or 0) > 60 else "MODERATE" if (r.avg_gri or 0) > 30 else "LOW"
        markers.append({
            "location": r.city or r.district or r.state or "Unknown",
            "state": r.state,
            "district": r.district,
            "lat": lat,
            "lng": lng,
            "avg_gri": round(r.avg_gri or 0, 1),
            "max_gri": round(r.max_gri or 0, 1),
            "signal_count": r.count,
            "avg_anger": round(r.avg_anger or 0, 1),
            "risk_level": risk_level,
        })

    # Determine map center
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _location_label(state, district, city, ward) -> str:
    parts = [x for x in [ward, city, district, state] if x]
    return ", ".join(parts) if parts else "All India"


def _article_location_str(a: NewsArticle) -> str:
    parts = [x for x in [a.city, a.district, a.state] if x]
    return ", ".join(parts) if parts else (a.source_name or "Unknown")
