import urllib.request
import urllib.error
try:
    with urllib.request.urlopen("http://localhost:8000/api/signal-problems?city=Kanpur") as response:
        print("Success! Body Length:", len(response.read().decode()))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Error:", e)
