import os
from dotenv import load_dotenv
load_dotenv()
from google.genai import types

# Test the enum values
try:
    print("Hate speech cat:", types.HarmCategory.HARM_CATEGORY_HATE_SPEECH)
except AttributeError:
    print("HARM_CATEGORY_HATE_SPEECH not found")
    # List all attributes of types.HarmCategory
    import enum
    print("Available categories:", [m.name for m in types.HarmCategory])
