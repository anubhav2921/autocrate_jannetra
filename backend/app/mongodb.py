"""
MongoDB Connection Layer — JanNetra Backend

Uses Motor (async MongoDB driver) for all database operations.
Collections are imported directly into route handlers.
"""

import os
import logging
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("jannetra.mongodb")

# Environment Variables Audit
MONGO_URL = os.getenv("MONGO_URL") or os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME") or os.getenv("DB_NAME") or "governance_db"

if not MONGO_URL:
    logger.error("❌ MONGO_URL or MONGO_URI environment variable is missing!")
    if os.getenv("ENVIRONMENT") == "production":
        logger.critical("Shutting down due to missing database configuration.")
        sys.exit(1)
    else:
        logger.warning("Falling back to localhost for development.")
        MONGO_URL = "mongodb://localhost:27017"

try:
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[MONGO_DB_NAME]
    logger.info(f"✅ Connected to MongoDB: {MONGO_DB_NAME}")
except Exception as e:
    logger.error(f"❌ Failed to connect to MongoDB: {e}")

# Collections
users_collection          = db["users"]
articles_collection       = db["articles"]
news_articles_collection  = db["news_articles"]
sources_collection        = db["sources"]
alerts_collection         = db["alerts"]
detection_results_collection = db["detection_results"]
gri_scores_collection     = db["governance_risk_scores"]
sentiment_records_collection = db["sentiment_records"]
resolutions_collection    = db["resolutions"]
signal_problems_collection = db["signal_problems"]
system_metrics_collection = db["system_metrics"]
community_reviews_collection = db["community_reviews"]
activity_logs_collection  = db["activity_logs"]


