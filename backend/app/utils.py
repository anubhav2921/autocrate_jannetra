"""
Utility helpers for MongoDB document serialization and common helpers.
"""

import uuid
from bson import ObjectId
from datetime import datetime
from typing import Any


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
