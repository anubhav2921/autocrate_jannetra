import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

print("Listing models...")
try:
    models = client.models.list()
    for m in models:
        print(m.name)
except Exception as e:
    print(f"Failed: {e}")
