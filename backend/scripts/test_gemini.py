import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("No GEMINI_API_KEY found in .env")
    exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)

try:
    response = client.models.generate_content(
        model="models/gemini-2.0-flash",
        contents="Hello, identify yourself."
    )
    print("Success! Gemini 2.0 Flash response:")
    print(response.text)
except Exception as e:
    print(f"Failed to call Gemini: {e}")
