"""
Seed Service — Ensures the database has initial data for the dashboard.
"""
import logging
from datetime import datetime
from ..mongodb import signal_problems_collection, news_articles_collection

logger = logging.getLogger("jannetra.seed")

async def seed_if_empty():
    """Seeds the database with sample issues if it is completely empty."""
    try:
        count = await news_articles_collection.count_documents({})
        if count > 0:
            logger.info("Database not empty. Skipping seed.")
            return

        logger.info("Database is empty. Inserting seed/mock data for production...")
        
        sample_articles = [
            {
                "id": "SEED-001",
                "title": "Severe road damage reported in Lucknow central",
                "content": "Large potholes appearing near Hazratganj due to recent rains. Traffic is severely affected.",
                "source_name": "Citizen Reports",
                "url": "https://jannetra.vercel.app",
                "published_at": datetime.utcnow(),
                "scraped_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "category": "Civil Infrastructure",
                "department": "municipal",
                "city": "Lucknow",
                "risk_score": 75.5,
                "risk_level": "HIGH",
                "sentiment_label": "NEGATIVE",
                "anger_rating": 8.5,
                "fake_news_label": "REAL",
                "content_hash": "seed_hash_1"
            },
            {
                "id": "SEED-002",
                "title": "Water supply outage in suburban Mumbai",
                "content": "Main pipeline burst near Borivali has caused water supply issues for over 50,000 households.",
                "source_name": "NewsAPI",
                "url": "https://jannetra.vercel.app",
                "published_at": datetime.utcnow(),
                "scraped_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "category": "Public Health & Safety",
                "department": "health",
                "city": "Mumbai",
                "risk_score": 88.0,
                "risk_level": "CRITICAL",
                "sentiment_label": "NEGATIVE",
                "anger_rating": 9.2,
                "fake_news_label": "REAL",
                "content_hash": "seed_hash_2"
            }
        ]
        
        await news_articles_collection.insert_many(sample_articles)
        logger.info(f"✅ Inserted {len(sample_articles)} seed articles.")

        sample_clusters = [
            {
                "id": "ISSUE-SEED-01",
                "title": "Hazratganj Pothole Crisis",
                "category": "Civil Infrastructure",
                "department": "municipal",
                "city": "Lucknow",
                "frequency": 12,
                "priority_score": 78.0,
                "severity": "HIGH",
                "status": "Pending",
                "last_updated": datetime.utcnow(),
                "detected_at": datetime.utcnow(),
                "sources": ["Citizen Reports", "Twitter"],
                "locations": ["Lucknow"]
            }
        ]
        await signal_problems_collection.insert_many(sample_clusters)
        logger.info(f"✅ Inserted {len(sample_clusters)} seed clusters.")
        
        # Admin User
        from ..routes.auth import _hash_password
        from ..utils import gen_uuid
        admin_doc = {
            "id": gen_uuid(),
            "name": "System Admin",
            "email": "admin@email.com",
            "password_hash": _hash_password("admin"),
            "role": "ADMIN",
            "department": "",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "auth_provider": "email"
        }
        from ..mongodb import users_collection
        await users_collection.insert_one(admin_doc)
        logger.info("✅ Inserted seed admin user.")
        
    except Exception as e:
        logger.error(f"❌ Seed failed: {e}")
