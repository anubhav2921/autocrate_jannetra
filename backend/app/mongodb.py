"""
MongoDB Connection Layer — JanNetra Backend

Uses Motor (async MongoDB driver) for all database operations.
Collections are imported directly into route handlers.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "governance_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client[MONGO_DB_NAME]

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


