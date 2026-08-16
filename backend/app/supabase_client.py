import os
import sys
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend", ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
load_dotenv()

logger = logging.getLogger("jannetra.supabase")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("❌ SUPABASE_URL or SUPABASE_KEY missing from environment variables.")
    if os.getenv("ENVIRONMENT") == "production":
        sys.exit(1)
else:
    logger.info(f"Connecting to Supabase — URL: {SUPABASE_URL[:20]}...")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("✅ Connected to Supabase!")
except Exception as e:
    logger.error(f"❌ Failed to initialize Supabase client: {e}")
