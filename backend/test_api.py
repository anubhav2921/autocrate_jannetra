import requests, json

api_key = "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"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"

payload = {
  "model": "meta/llama-3.2-11b-vision-instruct",
  "messages": [
    {
      "role": "user",
      "content": f'Describe this image in 2 sentences: <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Pothole_on_NH_58.jpg/320px-Pothole_on_NH_58.jpg" />'
    }
  ],
  "max_tokens": 256,
  "temperature": 0.2
}

r = requests.post(invoke_url, headers=headers, json=payload, timeout=30)
data = r.json()
print("Status:", r.status_code)
print("Reply:", data["choices"][0]["message"]["content"])
