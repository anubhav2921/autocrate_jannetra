import asyncio
import hashlib
from datetime import datetime
from app.mongodb import users_collection
from app.utils import gen_uuid

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

async def seed_users():
    admin = await users_collection.find_one({"email": "admin@email.com"})
    if not admin:
        admin_doc = {
            "id": gen_uuid(),
            "name": "Administrator",
            "email": "admin@email.com",
            "password_hash": _hash_password("admin"),
            "role": "LEADER",
            "department": "municipal",
            "is_active": True,
            "auth_provider": "email",
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(admin_doc)
        print("[SEED] Created default user: admin@email.com (password: admin)")
    else:
        # Ensure password hash is updated to 'admin'
        await users_collection.update_one(
            {"email": "admin@email.com"},
            {"$set": {"password_hash": _hash_password("admin"), "is_active": True, "auth_provider": "email"}}
        )
        print("[SEED] Updated admin@email.com credentials.")

if __name__ == "__main__":
    asyncio.run(seed_users())
