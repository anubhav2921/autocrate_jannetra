
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("NVIDIA_API_KEY_3")
model = "meta/llama-3.1-70b-instruct"
url = "https://integrate.api.nvidia.com/v1/chat/completions"

def test():
    print(f"Testing with key: {key[:10]}...")
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "You must output JSON. Context: Title: Hi, Category: General, Location: India. Return {\"description\": \"...\"}"}
        ],
        "temperature": 0.2,
        "top_p": 0.7,
        "max_tokens": 512,
        "response_format": {"type": "json_object"}
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
