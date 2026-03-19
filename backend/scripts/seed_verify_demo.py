from pymongo import MongoClient
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
mongo_db_name = os.getenv("MONGO_DB_NAME", "governance_db")
client = MongoClient(mongo_url)
db = client[mongo_db_name]

# Collections
sources_coll = db["sources"]
articles_coll = db["articles"]
det_coll = db["detection_results"]

def seed_demo_data():
    print("[DEMO SEED] Starting...")
    
    # 1. Create a Complaint Source
    source_id = "src-demo-reddit"
    sources_coll.update_one(
        {"id": source_id},
        {"$set": {
            "id": source_id,
            "name": "Social Intelligence (Reddit)",
            "source_type": "COMPLAINT",
            "url": "https://reddit.com/r/india"
        }},
        upsert=True
    )
    print(f"[DEMO SEED] Source '{source_id}' created.")

    # 2. Add some articles with low confidence
    demo_complaints = [
        {
            "id": "demo-comp-1",
            "title": "Severe Water Logging in Sector 15",
            "location": "Prayagraj, Sector 15",
            "category": "Water",
            "source_id": source_id,
            "ingested_at": datetime.utcnow(),
            "confidence": 0.62  # Low
        },
        {
            "id": "demo-comp-2",
            "title": "Hazardous Open Transformer near School",
            "location": "Prayagraj, Katra Market",
            "category": "Infrastructure",
            "source_id": source_id,
            "ingested_at": datetime.utcnow(),
            "confidence": 0.58  # Low
        }
    ]

    for comp in demo_complaints:
        # Article
        articles_coll.update_one(
            {"id": comp["id"]},
            {"$set": {
                "id": comp["id"],
                "title": comp["title"],
                "location": comp["location"],
                "category": comp["category"],
                "source_id": comp["source_id"],
                "ingested_at": comp["ingested_at"],
                "status": "pending"
            }},
            upsert=True
        )
        
        # Detection Result
        det_coll.update_one(
            {"article_id": comp["id"]},
            {"$set": {
                "article_id": comp["id"],
                "confidence_score": comp["confidence"],
                "label": "PENDING"
            }},
            upsert=True
        )
        print(f"[DEMO SEED] Added complaint: {comp['title']}")

    print("[DEMO SEED] Complete.")

if __name__ == "__main__":
    seed_demo_data()
    client.close()
