import os
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types

key = os.getenv("GEMINI_API_KEY")
print(f"Key exists: {bool(key)}")
# print(f"Key value: {key}") # For debugging but keep it safe if possible

client = genai.Client(api_key=key)

try:
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents='hello'
    )
    print("Response successful:", response.text)
except Exception as e:
    print("Error:", e)
