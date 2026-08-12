import os
import re
import uuid
import hashlib
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Any, Optional, List
from jose import JWTError, jwt
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ==========================================
# JWT CONFIGURATION (Environment Configurable)
# ==========================================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "DEV_SECRET_KEY_FOR_JANNETRA_CHANGE_IN_PROD")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))) # 24 hours default

security = HTTPBearer(auto_error=False)


def gen_uuid() -> str:
    """Generate a new UUID4 string."""
    return str(uuid.uuid4())


# ==========================================
# PASSWORD HASHING & VERIFICATION
# ==========================================
def hash_password(password: str) -> str:
    """Hash password using SHA-256 (consistent with database entries)."""
    if not password:
        return ""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    if not plain_password or not hashed_password:
        return False
    return hash_password(plain_password) == hashed_password


# ==========================================
# MONGODB SERIALIZATION HELPERS
# ==========================================
def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB ObjectId _id to string and serialize datetime fields."""
    if doc is None:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
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


# ==========================================
# JWT TOKEN GENERATION & DECODING
# ==========================================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a standard signed JWT access token.
    Stores user_id, sub, email, role, department, iat, exp.
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    user_id = str(to_encode.get("user_id") or to_encode.get("id") or to_encode.get("sub", ""))
    
    to_encode.update({
        "sub": user_id,
        "user_id": user_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired JWT token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==========================================
# FASTAPI AUTH DEPENDENCIES
# ==========================================
async def get_current_user(auth: Optional[HTTPAuthorizationCredentials] = Security(security)) -> dict:
    """
    Strict FastAPI dependency to get the current authenticated user from JWT Bearer token.
    Raises HTTP 401 if token is missing, invalid, or user is not found.
    """
    from .mongodb import users_collection

    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("user_id") or payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Token payload missing user identification",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired JWT token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await users_collection.find_one({"id": user_id})
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Authenticated user no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=403,
            detail="User account is deactivated",
        )

    return serialize_doc(user)


async def get_current_user_optional(request: Request) -> Optional[dict]:
    """
    Optional dependency: returns user document if a valid JWT token is provided,
    otherwise returns None without raising an exception.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1].strip()
    if not token:
        return None

    from .mongodb import users_collection
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("user_id") or payload.get("sub")
        if not user_id:
            return None
        
        user = await users_collection.find_one({"id": user_id})
        if user and user.get("is_active", True):
            return serialize_doc(user)
        return None
    except Exception:
        return None


def require_roles(allowed_roles: List[str]):
    """Role-based authorization dependency factory."""
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = (current_user.get("role") or "").upper()
        allowed_upper = [r.upper() for r in allowed_roles]
        if user_role not in allowed_upper:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# ==========================================
# STRING & SIMILARITY UTILITIES
# ==========================================
def calculate_similarity(s1: str, s2: str) -> float:
    """Simple token-set similarity ratio (Jaccard)."""
    if not s1 or not s2:
        return 0.0
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
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
