"""
Test NVIDIA Vision API - JanNetra Citizen Report Image Analysis
Run: python test_nvidia_api.py
"""

import os
import base64
import json
import re
import requests

# ─── CONFIG ───────────────────────────────────────────────────
API_KEY   = "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"
MODEL     = "meta/llama-3.2-11b-vision-instruct"
API_URL   = "https://integrate.api.nvidia.com/v1/chat/completions"
IMAGE_PATH = "test_image.jpg"   # <-- place your test image here
# ──────────────────────────────────────────────────────────────

PROMPT = """
You are an intelligent image analysis system for JanNetra, a civic health monitoring platform.
Your task is to generate a clear, human-like description of the given image.

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
7. Maximum length for the description is 3-5 sentences.

OUTPUT FORMAT: You MUST return a pure JSON object. Do not wrap in markdown or anything else.
{
    "scene_type": "Human/Portrait | Civic Issue | Other",
    "detected_issue": "Garbage Dumping | Water Logging | Road Damage | Street Light issue | Infrastructure Damage | Others | None",
    "ai_description": "<Your 3-5 sentence description>",
    "severity": "Low | Medium | High | None",
    "urgency": "Low | Medium | High | None",
    "confidence_score": <0-100 integer>
}
"""


def compress_image(image_path: str, max_size: int = 1024, quality: int = 75) -> tuple[bytes, str]:
    """Compress image to fit within NVIDIA API payload limits."""
    try:
        from PIL import Image
        import io
        img = Image.open(image_path).convert("RGB")
        # Resize: maintain aspect ratio, max dimension = max_size
        img.thumbnail((max_size, max_size), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        return buf.getvalue(), "image/jpeg"
    except ImportError:
        # Pillow not installed — read raw bytes
        with open(image_path, "rb") as f:
            raw = f.read()
        ext  = image_path.rsplit(".", 1)[-1].lower()
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")
        return raw, mime


def test_nvidia_vision(image_path: str):
    print(f"\n{'='*60}")
    print(f"  JanNetra - NVIDIA Vision API Test")
    print(f"{'='*60}")

    # 1. Load, compress & encode image
    if not os.path.exists(image_path):
        print(f"[ERROR] Image not found: {image_path}")
        print("  → Place a test image named 'test_image.jpg' in the project root.")
        return

    img_bytes, mime_type = compress_image(image_path, max_size=1024, quality=75)
    b64_img   = base64.b64encode(img_bytes).decode("utf-8")
    print(f"[✓] Image ready: {image_path}  ({len(img_bytes) / 1024:.1f} KB compressed)  mime={mime_type}")

    # 2. Build payload
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept":        "application/json",
        "Content-Type":  "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{b64_img}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 1024,
        "temperature": 0.2,
        "top_p": 0.7,
    }

    # 3. Call API
    print(f"[→] Calling NVIDIA API  (model: {MODEL}) ...")
    try:
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] HTTP {resp.status_code}: {resp.text}")
        return
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")
        return

    # 4. Parse response
    raw_text = resp.json()["choices"][0]["message"]["content"]
    print(f"\n[RAW RESPONSE]\n{raw_text}\n")

    # Extract JSON block
    if "```json" in raw_text:
        raw_text = raw_text.split("```json")[-1].split("```")[0].strip()
    elif "```" in raw_text:
        raw_text = raw_text.split("```")[1].strip()
    else:
        m = re.search(r'\{[\s\S]*\}', raw_text)
        if m:
            raw_text = m.group(0)

    try:
        ai_data = json.loads(raw_text)
        with open("desc.txt", "w") as f:
            f.write(ai_data.get("ai_description", "N/A"))
        print("\nAI description written to desc.txt")
        
        print(f"{'='*60}")
        print("  ✅  PARSED RESULT")
        print(f"{'='*60}")
        for k, v in ai_data.items():
            label = k.replace("_", " ").title()
            print(f"  {label:<18}: {v}")
        print(f"{'='*60}\n")
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON parse failed: {e}")
        print(f"  Raw text was: {raw_text}")


if __name__ == "__main__":
    test_nvidia_vision(IMAGE_PATH)
