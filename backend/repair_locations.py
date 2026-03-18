"""
JanNetra Maintenance Support — Repair Location Metadata
 
This script scans for news articles with generic or missing location data 
and attempts to re-resolve them using the centralized Location Service.
"""

import os
import logging
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# Use centralized location logic
from app.services.location_service import resolve_location_from_text

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s]: %(message)s"
)
logger = logging.getLogger("jannetra.maintenance.repair")

def connect_to_db():
    """Establish a connection to the MongoDB database."""
    load_dotenv()
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    mongo_db_name = os.getenv("MONGO_DB_NAME", "governance_db")
    client = MongoClient(mongo_url)
    return client, client[mongo_db_name]

def repair_article_locations(db):
    """
    Find articles with missing or generic location data and attempt to fix them.
    """
    collection = db["news_articles"]
    
    # Generic or empty location query
    query = {
        "$or": [
            {"city": {"$in": [None, "India", "india"]}},
            {"latitude": {"$in": [None, 22.5]}}
        ]
    }
    
    articles = list(collection.find(query))
    if not articles:
        logger.info("No articles found in need of repair.")
        return 0

    logger.info(f"Analyzing {len(articles)} candidate articles for location repair...")

    updates = []
    for art in articles:
        title = art.get("title", "")
        content = art.get("content", "")
        
        # Re-resolve using the latest location logic
        loc = resolve_location_from_text(title, content)
        
        # Only prepare update if we found a specific city
        if loc["city"] != "India":
            updates.append(
                UpdateOne(
                    {"_id": art["_id"]},
                    {"$set": {
                        "state": loc["state"],
                        "district": loc["district"],
                        "city": loc["city"],
                        "latitude": loc["latitude"],
                        "longitude": loc["longitude"]
                    }}
                )
            )

    if updates:
        logger.info(f"Applying {len(updates)} specific location updates...")
        result = collection.bulk_write(updates)
        return result.modified_count

    return 0

def main():
    """Main execution point for the repair script."""
    client = None
    try:
        client, db = connect_to_db()
        updated_count = repair_article_locations(db)
        logger.info(f"✅ Success: Updated {updated_count} articles with verified location data.")
    except Exception as e:
        logger.error(f"❌ Repair failed: {e}")
    finally:
        if client:
            client.close()

if __name__ == "__main__":
    main()
