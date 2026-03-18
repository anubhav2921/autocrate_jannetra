import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from datetime import datetime

async def seed_sources():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "governance_db")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # 1. Clear existing (optional, but good for refresh)
    # await db.sources.delete_many({})
    
    # 2. Define sources
    sources = [
        {
            "id": str(uuid.uuid4()), # We should use stable IDs later
            "name": "NDTV India",
            "source_type": "RSS/NEWS",
            "domain": "ndtv.com",
            "credibility_tier": "VERIFIED",
            "historical_accuracy": 0.88,
            "last_audited_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "The Hindu",
            "source_type": "RSS/NEWS",
            "domain": "thehindu.com",
            "credibility_tier": "VERIFIED",
            "historical_accuracy": 0.92,
            "last_audited_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Times of India",
            "source_type": "RSS/NEWS",
            "domain": "indiatimes.com",
            "credibility_tier": "VERIFIED",
            "historical_accuracy": 0.85,
            "last_audited_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "PIB India",
            "source_type": "GOV_PORTAL",
            "domain": "pib.gov.in",
            "credibility_tier": "VERIFIED",
            "historical_accuracy": 0.98,
            "last_audited_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Reddit India",
            "source_type": "SOCIAL/REDDIT",
            "domain": "reddit.com",
            "credibility_tier": "UNKNOWN",
            "historical_accuracy": 0.65,
            "last_audited_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "LiveMint",
            "source_type": "RSS/NEWS",
            "domain": "livemint.com",
            "credibility_tier": "VERIFIED",
            "historical_accuracy": 0.89,
            "last_audited_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Indian Express",
            "source_type": "RSS/NEWS",
            "domain": "indianexpress.com",
            "credibility_tier": "VERIFIED",
            "historical_accuracy": 0.87,
            "last_audited_at": datetime.utcnow()
        }
    ]
    
    # Check if they already exist by domain to avoid duplication
    for s in sources:
        exists = await db.sources.find_one({"domain": s["domain"]})
        if not exists:
            await db.sources.insert_one(s)
            print(f"Added source: {s['name']}")
        else:
            print(f"Source already exists: {s['name']}")

if __name__ == "__main__":
    asyncio.run(seed_sources())
