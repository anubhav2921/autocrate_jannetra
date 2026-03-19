import os
import pymongo
from pymongo import MongoClient
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "governance_db"

CATEGORY_KEYWORDS = {
    "Water": ["water", "supply", "pipeline", "tanker", "drought", "contaminated", "sewage", "groundwater", "drinking water"],
    "Infrastructure": ["road", "bridge", "building", "construction", "pothole", "highway", "metro", "railway", "smart city", "electricity"],
    "Healthcare": ["hospital", "doctor", "medicine", "health", "disease", "dengue", "vaccine", "covid", "medical", "surgeon"],
    "Education": ["school", "teacher", "student", "education", "exam", "university", "scholarship", "literacy"],
    "Law & Order": ["police", "crime", "theft", "murder", "violence", "mob", "arrest", "safety", "security", "cybercrime"],
    "Corruption": ["corrupt", "bribe", "scam", "fraud", "embezzle", "money laundering", "kickback", "black money"],
    "Environment": ["pollution", "environment", "forest", "waste", "climate", "emissions", "mining", "deforestation"],
    "Sanitation": ["sanitation", "sewer", "drain", "toilet", "clean", "garbage", "waste management"],
    "Transport": ["traffic", "transport", "bus", "metro", "railway", "airport", "commute", "congestion"],
    "Housing": ["housing", "slum", "homeless", "real estate", "rent", "eviction", "demolition"],
}

CATEGORY_TO_DEPARTMENT = {
    "Water": "water",
    "Infrastructure": "municipal",
    "Healthcare": "health",
    "Education": "municipal",
    "Law & Order": "police",
    "Corruption": "police",
    "Environment": "municipal",
    "Sanitation": "municipal",
    "Transport": "municipal",
    "Housing": "municipal",
}

def categorize(text):
    if not text: return "General"
    text_lower = text.lower()
    scores = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in kws if kw in text_lower)
        if score > 0:
            scores[cat] = score
    if scores:
        return max(scores, key=scores.get)
    return "General"

def run():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # 1. Update news_articles
    articles = list(db.news_articles.find({"department": {"$exists": False}}))
    logger.info(f"Found {len(articles)} articles missing department.")
    
    for a in articles:
        text = (a.get("title", "") + " " + a.get("content", "")).strip()
        cat = categorize(text)
        dept = CATEGORY_TO_DEPARTMENT.get(cat, "municipal")
        db.news_articles.update_one({"_id": a["_id"]}, {"$set": {"category": cat, "department": dept}})
    
    # 2. Update signal_problems
    problems = list(db.signal_problems.find({"department": {"$exists": False}}))
    logger.info(f"Found {len(problems)} issues missing department.")
    for p in problems:
        text = (p.get("title", "") + " " + p.get("description", "")).strip()
        cat = categorize(text)
        dept = CATEGORY_TO_DEPARTMENT.get(cat, "municipal")
        db.signal_problems.update_one({"_id": p["_id"]}, {"$set": {"category": cat, "department": dept}})
        
    client.close()
    logger.info("Migration complete!")

if __name__ == "__main__":
    run()
