
import requests
import base64
import os

def test_nvidia_api():
    api_key = "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"
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    
    # Simple 1x1 pixel red dot base64
    small_img_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    payload = {
        "model": "meta/llama-3.2-90b-vision-instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{small_img_b64}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 50
    }
    
    print("Testing NVIDIA API Key...")
    try:
        response = requests.post(invoke_url, headers=headers, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response Content:")
            print(response.json()["choices"][0]["message"]["content"])
        else:
            print("Error Response:")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_nvidia_api()
