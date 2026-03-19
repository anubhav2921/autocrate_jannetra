import requests
import os

def check_leaderboard():
    # We can hit the backend directly since it's running
    try:
        r = requests.get("http://localhost:8000/api/leaderboard")
        print(r.json())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_leaderboard()
