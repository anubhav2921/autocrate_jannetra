import io
import base64
import requests
import json
from PIL import Image

API_KEY='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'

# Create dummy image
img = Image.new('RGB', (200, 200), color = 'red')
buf = io.BytesIO()
img.save(buf, format='JPEG', quality=85)
b64_img = base64.b64encode(buf.getvalue()).decode('utf-8')

prompt = """
    STRICT RULES:
    1. ONLY describe what is visible in the image.
    2. DO NOT return any system errors, API errors, debug logs, or technical messages.
    3. DO NOT mention words like "error", "quota", "API", or "resource exhausted".
    4. If the image contains a person:
       - Describe posture, activity, and visible emotions (e.g., sitting, walking, smiling, injured).
    5. If the image contains an issue (road damage, garbage, waterlogging, etc.):
       - Clearly describe the problem.
       - Mention severity (low, medium, high if possible).
       - Mention surroundings (roadside, residential area, public place, etc.).
    6. Keep the description natural, like a real human reporting the issue.
    7. The `ai_description` MUST be a structured, readable format. Write it clearly using point form separated by double newlines (\n\n) like this:
       Problem: <short issue title>
       
       Observation: <specific details of the issue>
       
       Impact: <how it affects the environment or community>
       
       Location Context: <what the surroundings look like>

    OUTPUT FORMAT: You MUST return a pure JSON object. Do not wrap in markdown or anything else.
    {
        "scene_type": "Human/Portrait | Civic Issue | Other",
        "detected_issue": "Garbage Dumping | Water Logging | Road Damage | Street Light issue | Infrastructure Damage | Others | None",
        "ai_description": "<Your structured text description exactly matching the format specified above>",
        "severity": "Low | Medium | High | None",
        "urgency": "Low | Medium | High | None",
        "confidence_score": 90
    }
"""

payload = {
  "model": "meta/llama-3.2-90b-vision-instruct",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": prompt},
        {
          "type": "image_url",
          "image_url": {
             "url": f"data:image/jpeg;base64,{b64_img}"
          }
        }
      ]
    }
  ],
  "max_tokens": 1024,
  "temperature": 0.2,
  "top_p": 0.7
}

nv_headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

print("Calling...")
try:
    response = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=nv_headers, json=payload, timeout=60)
    response.raise_for_status()
    respJSON = response.json()
    raw_text = respJSON["choices"][0]["message"]["content"]
    import re
    if "```json" in raw_text:
        raw_text = raw_text.split("```json")[-1].split("```")[0].strip()
    elif "```" in raw_text:
        raw_text = raw_text.split("```")[1].strip()
    else:
        json_match = re.search(r'\{[\s\S]*\}', raw_text)
        if json_match:
            raw_text = json_match.group(0)

    print("Parsed output trying to load json...")
    ai_data = json.loads(raw_text)
    print("API SUCCESS", ai_data)
except Exception as e:
    print("API FAILED!")
    print(str(e))
    try:
        print(raw_text)
    except:
        pass
