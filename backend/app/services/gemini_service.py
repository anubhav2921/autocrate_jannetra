from google import genai
import os

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

def call_gemini(text):
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=text
        )

        if response and response.text:
            return {
                "output": response.text,
                "execution_source": "gemini",
                "confidence_score": 0.9
            }

    except Exception as e:
        print("Gemini Error:", e)

    return None