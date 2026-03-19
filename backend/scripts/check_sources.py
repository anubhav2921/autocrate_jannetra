from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
mongo_db_name = os.getenv("MONGO_DB_NAME", "governance_db")
client = MongoClient(mongo_url)
db = client[mongo_db_name]
sources_coll = db["sources"]

print("--- Sources ---")
complaint_sources = sources_coll.find({"source_type": "COMPLAINT"})
for s in complaint_sources:
    print(f"Source ID: {s.get('id')}, Name: {s.get('name')}")

client.close()
