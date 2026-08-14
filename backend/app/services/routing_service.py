import logging
from typing import Optional, Dict, Any, List
from ..mongodb import (
    routing_rules_collection,
    organizations_collection,
    jurisdictions_collection,
    users_collection
)

logger = logging.getLogger("jannetra.routing")

def resolve_hierarchical_location(latitude: Optional[float], longitude: Optional[float], address: Optional[str] = None) -> Dict[str, Any]:
    """
    Geocodes latitude/longitude or address into administrative hierarchy:
    state, district, block, municipality, panchayat, ward, village.
    
    This is designed as a clean service interface that can be easily replaced by
    a real GIS provider (e.g., Google Geocoding, ArcGIS, or Nominatim) later.
    """
    # Default hierarchy output
    hierarchy = {
        "state": "Uttar Pradesh",
        "district": "Prayagraj",
        "block": "Demo Block",
        "municipality": None,
        "panchayat": "ABC Panchayat",
        "ward": "Ward 1 - Civil Lines",
        "village": "Demo Village"
    }

    if not latitude or not longitude:
        if address:
            # Simple text parsing fallback if address string is provided
            addr_lower = address.lower()
            if "lucknow" in addr_lower:
                hierarchy["district"] = "Lucknow"
                hierarchy["block"] = "Lucknow Block"
                hierarchy["panchayat"] = None
                hierarchy["ward"] = "Ward 1 - Hazratganj"
                hierarchy["village"] = None
            elif "mumbai" in addr_lower:
                hierarchy["state"] = "Maharashtra"
                hierarchy["district"] = "Mumbai City"
                hierarchy["block"] = None
                hierarchy["municipality"] = "Mumbai Municipality"
                hierarchy["panchayat"] = None
                hierarchy["ward"] = "Ward A - Colaba"
                hierarchy["village"] = None
        return hierarchy

    # If coordinates are close to Mumbai City (lat ~19, lng ~72.8)
    if abs(latitude - 19.076) < 1.0 and abs(longitude - 72.877) < 1.0:
        hierarchy["state"] = "Maharashtra"
        hierarchy["district"] = "Mumbai City"
        hierarchy["block"] = None
        hierarchy["municipality"] = "Mumbai Municipality"
        hierarchy["panchayat"] = None
        hierarchy["ward"] = "Ward A - Colaba"
        hierarchy["village"] = None
    # If coordinates are close to Lucknow (lat ~26.8, lng ~80.9)
    elif abs(latitude - 26.846) < 1.0 and abs(longitude - 80.946) < 1.0:
        hierarchy["state"] = "Uttar Pradesh"
        hierarchy["district"] = "Lucknow"
        hierarchy["block"] = "Lucknow Block"
        hierarchy["municipality"] = None
        hierarchy["panchayat"] = None
        hierarchy["ward"] = "Ward 1 - Hazratganj"
        hierarchy["village"] = None
    
    # Defaults to Prayagraj (lat ~25.4, lng ~81.8) otherwise
    return hierarchy


async def get_routing_recommendation(
    category: str,
    subcategory: Optional[str],
    location: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Routing Engine: Recommends department, organization, jurisdiction, and eligible officers.
    Factors in category, location hierarchy levels, and active official databases.
    """
    # 1. Resolve geographic hierarchy from location dictionary
    lat = location.get("latitude")
    lng = location.get("longitude")
    address = location.get("address")
    
    geo_hierarchy = resolve_hierarchical_location(lat, lng, address)
    
    # Update location details with geocoded ones if missing
    for key, val in geo_hierarchy.items():
        if not location.get(key) and val:
            location[key] = val

    # 2. Determine recommended department based on category
    # Try finding database-configured routing rules first
    rule = await routing_rules_collection.find_one({
        "category": category,
        **(({"subcategory": subcategory} if subcategory else {}))
    })
    
    recommended_dept = "municipal"
    if rule:
        recommended_dept = rule.get("department_id", "municipal")
    else:
        # Fallback dictionary mapping
        category_lower = category.lower()
        if "water" in category_lower:
            recommended_dept = "water"
        elif "electricity" in category_lower or "power" in category_lower or "light" in category_lower:
            recommended_dept = "electricity"
        elif "health" in category_lower or "medical" in category_lower:
            recommended_dept = "health"
        elif "police" in category_lower or "crime" in category_lower or "safety" in category_lower:
            recommended_dept = "police"
        elif "education" in category_lower or "school" in category_lower:
            recommended_dept = "education"
        elif "transport" in category_lower or "road" in category_lower or "traffic" in category_lower:
            recommended_dept = "transport"
        else:
            recommended_dept = "municipal"

    # 3. Recommend organization and jurisdiction
    # Look for a jurisdiction in our db that matches the lowest non-null geo tier
    recommended_jurisdiction = None
    recommended_org = None
    
    search_tiers = [
        ("village", "VILLAGE"),
        ("ward", "WARD"),
        ("panchayat", "PANCHAYAT"),
        ("municipality", "MUNICIPALITY"),
        ("block", "BLOCK"),
        ("district", "DISTRICT"),
        ("state", "STATE")
    ]
    
    for field_name, level_name in search_tiers:
        val = location.get(field_name)
        if val:
            db_j = await jurisdictions_collection.find_one({
                "name": val,
                "level": level_name,
                "is_active": True
            })
            if db_j:
                recommended_jurisdiction = db_j
                break
                
    # Recommend organization matching the department and jurisdiction level
    if recommended_jurisdiction:
        # Find organization matching this jurisdiction
        recommended_org = await organizations_collection.find_one({
            "jurisdiction_id": recommended_jurisdiction["id"],
            "is_active": True
        })
        
    # Fallback to general district/state level organizations if specific one not found
    if not recommended_org:
        recommended_org = await organizations_collection.find_one({
            "name": {"$regex": recommended_dept, "$options": "i"},
            "is_active": True
        }) or await organizations_collection.find_one({"is_active": True})

    # 4. Recommend eligible officers (users) belonging to organization and department
    eligible_users = []
    if recommended_org:
        user_query = {
            "organization_id": recommended_org["id"],
            "is_active": True
        }
        # If user department matches, filter by it too
        if recommended_dept:
            user_query["department"] = recommended_dept
            
        cursor = users_collection.find(user_query).limit(5)
        async for u in cursor:
            eligible_users.append({
                "id": u["id"],
                "name": u["name"],
                "username": u.get("username"),
                "phone": u.get("phone") or u.get("phone_number"),
                "role": u["role"],
                "is_active": u["is_active"]
            })

    # Fallback search if no specific org-matched user is found
    if not eligible_users:
        fallback_query = {"role": {"$ne": "CITIZEN"}, "is_active": True}
        if recommended_dept:
            fallback_query["department"] = recommended_dept
        async for u in users_collection.find(fallback_query).limit(3):
            eligible_users.append({
                "id": u["id"],
                "name": u["name"],
                "username": u.get("username"),
                "phone": u.get("phone") or u.get("phone_number"),
                "role": u["role"],
                "is_active": u["is_active"]
            })

    # 5. Compute routing recommendation confidence score
    confidence = 0.50
    if rule:
        confidence += 0.25
    if recommended_jurisdiction:
        confidence += 0.15
    if recommended_org:
        confidence += 0.05
    if eligible_users:
        confidence += 0.05
        
    return {
        "department_id": recommended_dept,
        "organization": recommended_org,
        "jurisdiction": recommended_jurisdiction,
        "users": eligible_users,
        "confidence": min(1.0, confidence)
    }
