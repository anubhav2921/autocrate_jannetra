"""
JanNetra Location Service — Centralizes geography & coordinates.
"""

import logging
import random
from typing import Optional, Tuple

logger = logging.getLogger("jannetra.location")

# City → (State, District, lat, lng) lookup
CITY_LOCATION_MAP: dict[str, dict] = {
    "Mumbai":    {"state": "Maharashtra",     "district": "Mumbai City",        "lat": 19.076,  "lng": 72.8777},
    "Delhi":     {"state": "Delhi",           "district": "Central Delhi",       "lat": 28.6139, "lng": 77.209},
    "Bangalore": {"state": "Karnataka",       "district": "Bangalore Urban",     "lat": 12.9716, "lng": 77.5946},
    "Bengaluru": {"state": "Karnataka",       "district": "Bangalore Urban",     "lat": 12.9716, "lng": 77.5946},
    "Hyderabad": {"state": "Telangana",       "district": "Hyderabad",           "lat": 17.385,  "lng": 78.4867},
    "Chennai":   {"state": "Tamil Nadu",      "district": "Chennai",             "lat": 13.0827, "lng": 80.2707},
    "Kolkata":   {"state": "West Bengal",     "district": "Kolkata",             "lat": 22.5726, "lng": 88.3639},
    "Pune":      {"state": "Maharashtra",     "district": "Pune",                "lat": 18.5204, "lng": 73.8567},
    "Jaipur":    {"state": "Rajasthan",       "district": "Jaipur",              "lat": 26.9124, "lng": 75.7873},
    "Lucknow":   {"state": "Uttar Pradesh",   "district": "Lucknow",             "lat": 26.8467, "lng": 80.9462},
    "Ahmedabad": {"state": "Gujarat",         "district": "Ahmedabad",           "lat": 23.0225, "lng": 72.5714},
    "Patna":     {"state": "Bihar",           "district": "Patna",               "lat": 25.6093, "lng": 85.1376},
    "Bhopal":    {"state": "Madhya Pradesh",  "district": "Bhopal",              "lat": 23.2599, "lng": 77.4126},
    "Chandigarh":{"state": "Punjab",          "district": "Chandigarh",          "lat": 30.7333, "lng": 76.7794},
    "Varanasi":  {"state": "Uttar Pradesh",   "district": "Varanasi",            "lat": 25.3176, "lng": 82.9739},
    "Nagpur":    {"state": "Maharashtra",     "district": "Nagpur",              "lat": 21.1458, "lng": 79.0882},
    "Indore":    {"state": "Madhya Pradesh",  "district": "Indore",              "lat": 22.7196, "lng": 75.8577},
    "Surat":     {"state": "Gujarat",         "district": "Surat",               "lat": 21.1702, "lng": 72.8311},
    "Noida":     {"state": "Uttar Pradesh",   "district": "Gautam Buddh Nagar",  "lat": 28.5355, "lng": 77.391},
    "Gurgaon":   {"state": "Haryana",         "district": "Gurugram",            "lat": 28.4595, "lng": 77.0266},
    "Ranchi":    {"state": "Jharkhand",       "district": "Ranchi",              "lat": 23.3441, "lng": 85.3096},
    "Kochi":     {"state": "Kerala",          "district": "Ernakulam",           "lat": 9.9312,  "lng": 76.2673},
    "Prayagraj": {"state": "Uttar Pradesh",   "district": "Prayagraj",           "lat": 25.4358, "lng": 81.8463},
    "Allahabad": {"state": "Uttar Pradesh",   "district": "Prayagraj",           "lat": 25.4358, "lng": 81.8463},
    "Kanpur":    {"state": "Uttar Pradesh",   "district": "Kanpur Nagar",        "lat": 26.4499, "lng": 80.3319},
    "Agra":      {"state": "Uttar Pradesh",   "district": "Agra",                "lat": 27.1767, "lng": 78.0081},
    "Ghaziabad": {"state": "Uttar Pradesh",   "district": "Ghaziabad",           "lat": 28.6692, "lng": 77.4538},
    "Mysuru":    {"state": "Karnataka",       "district": "Mysuru",              "lat": 12.2958, "lng": 76.6394},
    "Amritsar":  {"state": "Punjab",          "district": "Amritsar",            "lat": 31.634,  "lng": 74.8723},
    "Ludhiana":  {"state": "Punjab",          "district": "Ludhiana",            "lat": 30.9009, "lng": 75.8573},
    "Coimbatore":{"state": "Tamil Nadu",      "district": "Coimbatore",          "lat": 11.0168, "lng": 76.9558},
    "Madurai":   {"state": "Tamil Nadu",      "district": "Madurai",             "lat": 9.9252,  "lng": 78.1198},
    "Nashik":    {"state": "Maharashtra",     "district": "Nashik",              "lat": 19.9975, "lng": 73.7898},
    "Thane":     {"state": "Maharashtra",     "district": "Thane",               "lat": 19.2183, "lng": 72.9781},
    "Meerut":    {"state": "Uttar Pradesh",   "district": "Meerut",              "lat": 28.9845, "lng": 77.7064},
    "Faridabad": {"state": "Haryana",         "district": "Faridabad",           "lat": 28.4089, "lng": 77.3178},
    "Rajkot":    {"state": "Gujarat",         "district": "Rajkot",              "lat": 22.3039, "lng": 70.8022},
    "Srinagar":  {"state": "Jammu & Kashmir", "district": "Srinagar",            "lat": 34.0837, "lng": 74.7973},
    "Jabalpur":  {"state": "Madhya Pradesh",  "district": "Jabalpur",            "lat": 23.1815, "lng": 79.9864},
    "India":     {"state": None,              "district": None,                   "lat": 22.5,    "lng": 78.5},
}

CITY_LOCATION_MAP_LOWER = {k.lower(): v for k, v in CITY_LOCATION_MAP.items()}

def resolve_location_from_text(title: str, content: str, current_location: str = "India") -> dict:
    """
    Resolve location details from title and content.
    If location is generic ('India') or None, scans text for city names.
    """
    title_lower = title.lower()
    content_snippet = content.lower()[:500]
    
    # Step 1: Check for city mentions in TITLE first (highest priority)
    for city in CITY_LOCATION_MAP_LOWER.keys():
        if city != "india" and city in title_lower:
            city_candidate = city
            break
            
    # Step 2: Check for city mentions in CONTENT if title was inconclusive
    if not city_candidate:
        for city in CITY_LOCATION_MAP_LOWER.keys():
            if city != "india" and city in content_snippet:
                city_candidate = city
                break
    
    # Step 3: Fallback to metadata only if text scan found nothing
    if not city_candidate:
        if current_location and current_location.lower() != "india":
            city_candidate = current_location.split(",")[0].strip().lower()
        else:
            city_candidate = "india"

    # Get geo data
    geo = CITY_LOCATION_MAP_LOWER.get(city_candidate, CITY_LOCATION_MAP_LOWER["india"])
    
    lat = geo["lat"]
    lng = geo["lng"]
    
    # Add minor jitter to prevent marker overlapping in UI
    if lat is not None and lng is not None and city_candidate != "india":
        lat += random.uniform(-0.015, 0.015)
        lng += random.uniform(-0.015, 0.015)

    # Recover original case and normalization
    display_city = "India"
    if city_candidate and city_candidate != "india":
        for k in CITY_LOCATION_MAP.keys():
            if k.lower() == city_candidate:
                display_city = k
                break
    
    # Normalizing nomenclature
    if display_city in ["Allahabad", "allahabad"]:
        display_city = "Prayagraj"

    return {
        "state": geo["state"],
        "district": geo["district"],
        "city": display_city,
        "latitude": lat,
        "longitude": lng,
    }
