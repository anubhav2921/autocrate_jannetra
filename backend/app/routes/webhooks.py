import os
import hmac
import hashlib
import logging
import json
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Request, Response, BackgroundTasks, HTTPException
from ..database import social_mentions_collection
from ..models import SocialMentionSchema

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
logger = logging.getLogger("jannetra.webhooks")

# Meta webhook configuration from environment
META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN")
META_APP_SECRET = os.getenv("META_APP_SECRET")


@router.get("/meta")
async def verify_webhook(request: Request):
    """
    Handle the initial verification challenge sent by Meta when subscribing to webhooks.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == META_VERIFY_TOKEN:
            logger.info("Meta webhook verified successfully.")
            # Meta expects the challenge value as a plain text response
            return Response(content=challenge, media_type="text/plain")
        else:
            logger.warning(f"Webhook verification failed. Token mismatch: {token}")
            raise HTTPException(status_code=403, detail="Verification failed")
    
    raise HTTPException(status_code=400, detail="Missing hub parameters")


def verify_signature(payload: bytes, signature_header: str) -> bool:
    """
    Validate the incoming payload signature using the app secret.
    Meta sends the signature in the X-Hub-Signature-256 header.
    Format: sha256=...
    """
    if not META_APP_SECRET:
        logger.error("META_APP_SECRET is not configured!")
        return False
        
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected_signature = hmac.new(
        key=META_APP_SECRET.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256
    ).hexdigest()

    actual_signature = signature_header[7:]  # Remove 'sha256='
    
    return hmac.compare_digest(expected_signature, actual_signature)


async def process_meta_webhook(payload: dict):
    """
    Asynchronously process the webhook payload and insert mentions into Supabase.
    """
    object_type = payload.get("object")
    
    if object_type != "instagram":
        # We only care about Instagram object changes for now (mentions)
        return

    entries = payload.get("entry", [])
    
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            field = change.get("field")
            value = change.get("value", {})
            
            # We are specifically looking for the 'mentions' field
            if field == "mentions":
                media_id = value.get("media_id")
                if not media_id:
                    continue
                    
                # Construct the permalink based on media_id
                # (A true permalink might require an extra API call, but this is a decent fallback)
                post_url = f"https://www.instagram.com/p/{media_id}/"
                
                # Extract author username if available (sometimes nested depending on payload type)
                author_username = value.get("from", {}).get("username")
                
                # Extract content
                content = value.get("text") or value.get("comment_text") or ""
                
                mention = SocialMentionSchema(
                    platform="instagram",
                    author_username=author_username,
                    content=content,
                    post_url=post_url,
                    media_id=media_id,
                    raw_payload=value,
                    created_at=datetime.utcnow()
                )
                
                try:
                    await social_mentions_collection.insert_one(mention.model_dump())
                    logger.info(f"Successfully processed mention for media_id: {media_id}")
                except Exception as e:
                    # Ignore duplicate key errors on media_id if they happen
                    if "duplicate key value violates unique constraint" in str(e):
                        logger.info(f"Mention {media_id} already exists, skipping.")
                    else:
                        logger.error(f"Failed to insert mention to database: {e}")


@router.post("/meta")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Receive the actual webhook payload from Meta.
    """
    # 1. Get raw payload for signature verification
    payload_bytes = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256")
    
    # 2. Verify signature
    if not verify_signature(payload_bytes, signature_header):
        logger.warning("Invalid webhook signature received.")
        # If running locally/testing without a real secret, we might bypass this or log a strong warning
        # For production, we should return 403
        if os.getenv("ENVIRONMENT") == "production":
            raise HTTPException(status_code=403, detail="Invalid signature")
        else:
            logger.warning("Bypassing signature check for non-production environment.")
    
    # 3. Parse JSON
    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
        
    # 4. Enqueue background task to process the payload
    # This ensures we return 200 OK immediately to Meta
    background_tasks.add_task(process_meta_webhook, payload)
    
    return {"status": "ok"}
