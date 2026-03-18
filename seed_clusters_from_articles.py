import os
import uuid
import time
from datetime import datetime
from pymongo import MongoClient
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "governance_db"

def calculate_similarity(s1, s2):
    from difflib import SequenceMatcher
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

def run():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    articles = list(db.news_articles.find({}))
    logger.info(f"Processing {len(articles)} existing signals for clustering...")
    
    # 0. Clear existing clusters for a fresh start (optional, but cleaner)
    db.signal_problems.delete_many({})
    
    clusters_dict = {} # id -> doc
    now = datetime.utcnow()

    for signal in articles:
        # Simplified clustering for seeding
        matched_id = None
        for cid, cluster in clusters_dict.items():
            sim = calculate_similarity(signal["title"], cluster["title"])
            if sim > 0.65 and signal.get("category") == cluster.get("category"):
                matched_id = cid
                break
        
        if matched_id:
            cluster = clusters_dict[matched_id]
            cluster["frequency"] = cluster.get("frequency", 1) + 1
            cluster["sources"] = list(set(cluster.get("sources", []) + [signal["source_name"]]))
            # Merge locations
            if signal.get("city"):
                cluster.setdefault("locations", [])
                if signal["city"] not in cluster["locations"]:
                    cluster["locations"].append(signal["city"])
        else:
            cid = f"ISSUE-{str(uuid.uuid4())[:8].upper()}"
            new_cluster = {
                "id": cid,
                "title": signal["title"],
                "category": signal.get("category", "General"),
                "department": signal.get("department", "municipal"),
                "frequency": 1,
                "sources": [signal["source_name"]],
                "locations": [signal.get("city")] if signal.get("city") else [],
                "priority_score": signal.get("risk_score", 0.0),
                "severity": signal.get("risk_level", "LOW"),
                "anger_avg": signal.get("anger_rating", 0.0),
                "sample_records": [{
                    "title": signal["title"],
                    "source": signal["source_name"],
                    "risk": signal.get("risk_score", 0.0)
                }],
                "last_updated": now,
                "detected_at": signal.get("published_at", now),
                "status": "Pending",
                "state": signal.get("state"),
                "district": signal.get("district"),
                "city": signal.get("city"),
                "ward": signal.get("ward")
            }
            clusters_dict[cid] = new_cluster

    # Persist
    if clusters_dict:
        db.signal_problems.insert_many(list(clusters_dict.values()))
        logger.info(f"Seeded {len(clusters_dict)} clusters from existing articles.")
    
    client.close()
    logger.info("Seeding complete!")

if __name__ == "__main__":
    run()
