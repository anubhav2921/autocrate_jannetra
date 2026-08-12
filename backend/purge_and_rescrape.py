import os
import sys
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME") or os.getenv("DB_NAME") or "governance_db"

def purge_all_data():
    print("==================================================")
    print("[1/3] PURGING ALL DASHBOARD & PROBLEM DATA...")
    print("==================================================")

    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB_NAME]

    res1 = db["signal_problems"].delete_many({})
    print(f"  - Deleted {res1.deleted_count} signal problems")

    res2 = db["news_articles"].delete_many({})
    print(f"  - Deleted {res2.deleted_count} news articles")

    res3 = db["articles"].delete_many({})
    print(f"  - Deleted {res3.deleted_count} raw articles / citizen reports")

    res4 = db["alerts"].delete_many({})
    print(f"  - Deleted {res4.deleted_count} alerts")

    res5 = db["governance_risk_scores"].delete_many({})
    print(f"  - Deleted {res5.deleted_count} GRI scores")

    res6 = db["sentiment_records"].delete_many({})
    print(f"  - Deleted {res6.deleted_count} sentiment records")

    res7 = db["resolutions"].delete_many({})
    print(f"  - Deleted {res7.deleted_count} resolutions")

    user_count = db["users"].count_documents({})
    print(f"  - Preserved {user_count} registered users (admin/users intact).")

    client.close()
    print("\nDatabase is now completely fresh and empty of old problems!")


def run_fresh_scraping():
    print("\n==================================================")
    print("[2/3] STARTING LIVE SCRAPING & NLP PIPELINE...")
    print("==================================================")
    
    from app.services.data_pipeline import run_pipeline
    start_time = datetime.now()
    stats = run_pipeline()
    duration = (datetime.now() - start_time).total_seconds()
    
    print("\n==================================================")
    print("[3/3] PIPELINE EXECUTION COMPLETED!")
    print(f"Duration: {duration:.2f}s")
    print("==================================================")
    for k, v in stats.items():
        print(f"  * {k:<25}: {v}")


def verify_dashboard_data():
    print("\n==================================================")
    print("[VERIFY] FRESH DASHBOARD DATA IN DATABASE")
    print("==================================================")
    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB_NAME]

    problems_count = db["signal_problems"].count_documents({})
    news_count = db["news_articles"].count_documents({})
    
    print(f"  * Fresh Signal Problems Created: {problems_count}")
    print(f"  * Fresh News Articles Stored   : {news_count}")

    print("\nTop 5 Freshly Scraped & Clustered Governance Problems:")
    cursor = db["signal_problems"].find({}).sort("priority_score", -1).limit(5)
    for p in cursor:
        title = (p.get('title') or '').encode('ascii', 'replace').decode('ascii')[:60]
        cat = (p.get('category') or '').encode('ascii', 'replace').decode('ascii')
        loc = str(p.get('location') or 'National')
        score = p.get('priority_score', 0)
        print(f"  - [{cat}] {title}... (Location: {loc}, Score: {score})")


    client.close()
    print("==================================================")


if __name__ == "__main__":
    purge_all_data()
    run_fresh_scraping()
    verify_dashboard_data()
