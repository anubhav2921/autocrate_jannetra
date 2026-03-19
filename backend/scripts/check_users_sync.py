import os
from pymongo import MongoClient

def check_users():
    mongo_url = os.getenv("MONGO_URL") or "mongodb://localhost:27017"
    client = MongoClient(mongo_url)
    db = client["governance_db"]
    
    users = list(db["users"].find({}))
    for u in users:
        print(f"User ID: {u.get('id')}, Name: {u.get('name')}, Role: {u.get('role')}")
    
    client.close()

if __name__ == "__main__":
    check_users()
