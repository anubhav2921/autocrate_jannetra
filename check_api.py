import urllib.request
import urllib.error
try:
    with urllib.request.urlopen("http://localhost:8000/api/location/dashboard?city=Amritsar") as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(e.code, e.reason)
    print("Error body:", e.read().decode())
