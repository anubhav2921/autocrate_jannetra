import os
import subprocess
import time
import urllib.request
import urllib.error

print("Starting server...")
proc = subprocess.Popen([r".\venv\Scripts\python.exe", "-m", "uvicorn", "app.main:app", "--port", "8005"], cwd="c:/Users/vinu/jannetra11/project/backend", stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
time.sleep(4)
print("Sending request...")
try:
    with urllib.request.urlopen("http://localhost:8005/api/location/dashboard?city=Amritsar") as res:
        print("Response:", res.read().decode()[:200])
except urllib.error.HTTPError as e:
    print(e.code, e.reason)
except Exception as e:
    print(e)
print("Stopping server...")
proc.terminate()
print("Output:", proc.stdout.read().decode('utf-8'))
