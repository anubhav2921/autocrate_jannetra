import urllib.request
import urllib.error
try:
    with urllib.request.urlopen("http://localhost:8000/api/signal-problems") as response:
        print("Success! Body:")
        print(response.read().decode()[:400])
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Error:", e)
