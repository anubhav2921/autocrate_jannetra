"""
Centralized Gemini AI configuration.

Loads the API key from environment variables (via .env) and
creates a reusable google.genai Client.

Security rationale:
  • Secrets never live in source code — they come from .env at runtime.
  • A single client object avoids repeated API-key lookups.
  • A missing key raises immediately at import time so the server doesn't
    start in a broken state and silently swallow Gemini errors later.
"""
import os
from dotenv import load_dotenv
from google import genai

# Load .env (idempotent — safe to call more than once)
load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. "
        "Create a .env file in the backend/ directory with:\n"
        "  GEMINI_API_KEY=your-key-here"
    )

# Create a reusable client
gemini_client = genai.Client(api_key=GEMINI_API_KEY)
