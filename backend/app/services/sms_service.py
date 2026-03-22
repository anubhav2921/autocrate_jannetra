"""
SMS Service — Sends OTP messages via Twilio (or console fallback in dev).

Configuration (add to backend/.env):
  TWILIO_ACCOUNT_SID=your-account-sid
  TWILIO_AUTH_TOKEN=your-auth-token
  TWILIO_PHONE_NUMBER=+1234567890
  SMS_ENABLED=true

If SMS_ENABLED is false or Twilio keys are missing, OTP is printed to console.
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
SMS_ENABLED = os.getenv("SMS_ENABLED", "false").lower() == "true"


def _get_twilio_client():
    """Lazy-load Twilio client to avoid import errors when not installed."""
    try:
        from twilio.rest import Client
        return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except ImportError:
        logger.warning("[SMS] twilio package not installed. Run: pip install twilio")
        return None
    except Exception as e:
        logger.error("[SMS] Failed to create Twilio client: %s", e)
        return None


def send_otp_sms(phone_number: str, otp: str) -> bool:
    """
    Send an OTP via SMS.
    Returns True if sent (or printed to console in dev mode).
    """
    message_body = f"[JanNetra] Your verification code is: {otp}. Valid for 5 minutes. Do not share this code."

    # Production: send via Twilio
    if SMS_ENABLED and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        client = _get_twilio_client()
        if client:
            try:
                msg = client.messages.create(
                    body=message_body,
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone_number,
                )
                logger.info("[SMS] OTP sent to %s (SID: %s)", phone_number, msg.sid)
                return True
            except Exception as e:
                logger.error("[SMS] Twilio send failed for %s: %s", phone_number, e)
                # Fall through to console fallback
                print(f"[SMS] Twilio send failed, falling back to console. Error: {e}")

    # Development: print to console
    print(f"[OTP] Phone verification code for {phone_number}: {otp}")
    print(f"[SMS] (SMS_ENABLED={SMS_ENABLED}) — OTP printed to console only.")
    return True


def send_email_otp(email: str, otp: str) -> bool:
    """
    Send an OTP via email (console fallback in dev).
    In production, integrate with SendGrid, AWS SES, etc.
    """
    print(f"[OTP] Verification code for {email}: {otp}")
    return True
