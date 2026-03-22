import os
import re
import uuid
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Any, Optional
from jose import JWTError, jwt
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# JWT CONFIGURATION
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "DEV_SECRET_KEY_FOR_JANNETRA_CHANGE_IN_PROD")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

security = HTTPBearer()


def gen_uuid() -> str:
    """Generate a new UUID4 string."""
    return str(uuid.uuid4())


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB ObjectId _id to string and serialize datetime fields."""
    if doc is None:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    # Convert any datetime objects to ISO strings for JSON serialization
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            doc[k] = str(v)
    return doc


def serialize_docs(docs: list) -> list:
    """Serialize a list of MongoDB documents."""
    return [serialize_doc(d) for d in docs]


def safe_float(val: Any, default: float = 0.0) -> float:
    """Safely convert a value to float."""
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def safe_int(val: Any, default: int = 0) -> int:
    """Safely convert a value to int."""
    try:
        return int(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Generate a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    """Dependency to get the current user from JWT token."""
    from .mongodb import users_collection
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await users_collection.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    
    # Return user with serialized fields
    return serialize_doc(user)


async def get_current_user_optional(request: Request):
    """Optional dependency to get user if token exists, else None."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    from .mongodb import users_collection
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if not user_id:
            return None
        
        user = await users_collection.find_one({"id": user_id})
        return serialize_doc(user) if user else None
    except JWTError:
        return None


def calculate_similarity(s1: str, s2: str) -> float:
    """Simple token-set similarity ratio (Jaccard)."""
    if not s1 or not s2:
        return 0.0
    import re
    s1 = re.sub(r'[^\w\s]', '', s1.lower()).strip()
    s2 = re.sub(r'[^\w\s]', '', s2.lower()).strip()
    
    tokens1 = set(s1.split())
    tokens2 = set(s2.split())
    
    if not tokens1 or not tokens2:
        return 0.0
        
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    
    return len(intersection) / len(union)


def clean_text_simple(text: str) -> str:
    """Remove extra whitespace and basic noise."""
    if not text:
        return ""
    import re
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
