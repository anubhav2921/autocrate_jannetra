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
    logger.info(f"Connecting to MongoDB — URL: {MONGO_URL[:20]}... | DB: {MONGO_DB_NAME}")
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

organizations_collection       = db["organizations"]
jurisdictions_collection       = db["jurisdictions"]
governance_problems_collection = db["governance_problems"]
problem_assignments_collection = db["problem_assignments"]
problem_history_collection    = db["problem_history"]
escalations_collection         = db["escalations"]
notifications_collection       = db["notifications"]
sla_configs_collection         = db["sla_configs"]
routing_rules_collection       = db["routing_rules"]


async def ensure_indexes():
    """Create indexes for performance and security queries."""
    try:
        # User indexes
        await users_collection.create_index("id", unique=True)
        await users_collection.create_index("firebase_uid")
        await users_collection.create_index("email")
        await users_collection.create_index("role")
        await users_collection.create_index("jurisdiction_id")
        
        # Governance Problem indexes
        await governance_problems_collection.create_index("problem_id", unique=True)
        await governance_problems_collection.create_index("status")
        await governance_problems_collection.create_index("priority")
        await governance_problems_collection.create_index("department_id")
        await governance_problems_collection.create_index("organization_id")
        await governance_problems_collection.create_index("jurisdiction_id")
        await governance_problems_collection.create_index("current_owner_user_id")
        await governance_problems_collection.create_index("created_at")
        await governance_problems_collection.create_index("due_at")
        
        # History & Assignments
        await problem_assignments_collection.create_index("assignment_id", unique=True)
        await problem_assignments_collection.create_index("problem_id")
        await problem_history_collection.create_index("history_id", unique=True)
        await problem_history_collection.create_index("problem_id")
        
        # Organizations & Jurisdictions
        await organizations_collection.create_index("id", unique=True)
        await jurisdictions_collection.create_index("id", unique=True)
        await jurisdictions_collection.create_index("parent_id")
        
        # Notifications
        await notifications_collection.create_index("user_id")
        await notifications_collection.create_index("is_read")
        
        logger.info("✅ Database indexes verified and created.")
    except Exception as e:
        logger.error(f"❌ Failed to ensure indexes: {e}")



