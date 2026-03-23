
import requests

def test_risk_heatmap():
    url = "http://127.0.0.1:8000/api/analytics/risk-heatmap"
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Count: {len(data)}")
        if len(data) > 0:
            print(f"First element: {data[0]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_risk_heatmap()
