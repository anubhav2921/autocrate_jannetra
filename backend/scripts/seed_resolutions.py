import os
import uuid
from datetime import datetime
from pymongo import MongoClient

def seed_resolutions():
    mongo_url = os.getenv("MONGO_URL") or "mongodb://localhost:27017"
    client = MongoClient(mongo_url)
    db = client["governance_db"]
    
    # Target User: Vinu Leader
    user = db["users"].find_one({"name": "Vinu Leader"})
    if not user:
        print("User not found!")
        return
        
    uid = user["id"]
    print(f"Seeding resolutions for user {uid} ({user['name']})")
    
    # 2 Sample Resolutions
    resolutions = [
        {
            "id": str(uuid.uuid4()),
            "article_id": "demo-comp-1",
            "resolved_by": uid,
            "status": "RESOLVED",
            "notes": "Verified pothole repaired at Civil Lines.",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "article_id": "demo-comp-2",
            "resolved_by": uid,
            "status": "RESOLVED",
            "notes": "Transformer enclosure secured at Katra.",
            "created_at": datetime.utcnow()
        }
    ]
    
    db["resolutions"].delete_many({"resolved_by": uid})
    db["resolutions"].insert_many(resolutions)
    print(f"Successfully seeded {len(resolutions)} resolutions.")
    
    client.close()

if __name__ == "__main__":
    seed_resolutions()
