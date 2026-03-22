import requests, json

KEY = "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"
URL = "https://integrate.api.nvidia.com/v1/chat/completions"
TINY = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="

print("=== TEST A: gemma-3-27b-it + image_url content list ===")
r = requests.post(URL,
    headers={"Authorization": f"Bearer {KEY}", "Accept": "application/json"},
    json={"model": "google/gemma-3-27b-it", "messages": [{"role":"user","content":[
        {"type":"text","text":"What color is this image?"},
        {"type":"image_url","image_url":{"url":f"data:image/png;base64,{TINY}"}}
    ]}], "max_tokens":32,"stream":False}, timeout=45)
print(f"Status: {r.status_code}")
print(f"Body: {r.text[:600]}\n")

print("=== TEST B: meta/llama-3.2-11b-vision-instruct + img tag ===")
r2 = requests.post(URL,
    headers={"Authorization": f"Bearer {KEY}", "Accept": "application/json"},
    json={"model": "meta/llama-3.2-11b-vision-instruct", "messages": [{"role":"user","content":
        f'What color? <img src="data:image/png;base64,{TINY}" />'
    }], "max_tokens":32,"stream":False}, timeout=45)
print(f"Status: {r2.status_code}")
print(f"Body: {r2.text[:600]}\n")
