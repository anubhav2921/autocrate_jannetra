import json
import os
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
mongo_db_name = os.getenv("MONGO_DB_NAME", "governance_db")

def verify():
    client = MongoClient(mongo_url)
    db = client[mongo_db_name]
    collection = db["news_articles"]
    
    total = collection.count_documents({})
    result = {
        "timestamp": datetime.now().isoformat(),
        "total_documents": total,
        "city_distribution": {},
        "missing_coords": collection.count_documents({"latitude": None}),
        "specific_cities": 0
    }
    
    # Check distribution
    pipeline = [
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    city_data = list(collection.aggregate(pipeline))
    for entry in city_data:
        city = entry["_id"] or "Unknown"
        result["city_distribution"][city] = entry["count"]
        if city != "India" and city != "Unknown":
            result["specific_cities"] += entry["count"]
            
    # Calculate coverage
    if total > 0:
        result["city_coverage_pct"] = round((result["specific_cities"] / total) * 100, 2)
    
    # Check for recent ingestion
    latest = collection.find_one(sort=[("scraped_at", -1)])
    if latest:
        result["latest_article"] = {
            "title": latest.get("title"),
            "scraped_at": latest.get("scraped_at").isoformat() if latest.get("scraped_at") else None,
            "city": latest.get("city")
        }

    with open("repair_verification_mongodb.json", "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"--- Verification Complete ---")
    print(f"Total: {total}")
    print(f"City Coverage: {result.get('city_coverage_pct', 0)}%")
    print(f"Specific City Records: {result['specific_cities']}")
    print(f"Results saved to repair_verification_mongodb.json")
    client.close()

if __name__ == "__main__":
    try:
        verify()
    except Exception as e:
        print(f"Verification failed: {e}")
