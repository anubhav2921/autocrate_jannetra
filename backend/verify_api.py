
import requests

def verify():
    login_url = 'http://localhost:8000/api/auth/login'
    dashboard_url = 'http://localhost:8000/api/dashboard'
    
    # login
    r = requests.post(login_url, json={'email': 'admin@email.com', 'password': 'admin'})
    if r.status_code != 200:
        print(f"Login Failed: {r.status_code}")
        print(r.text)
        return
        
    data = r.json()
    token = data.get('token')
    print(f"Login Success. Token: {token[:10]}...")
    
    # fetch dashboard
    headers = {'Authorization': f'Bearer {token}'}
    r2 = requests.get(dashboard_url, headers=headers)
    
    if r2.status_code == 200:
        dash_data = r2.json()
        print(f"Dashboard Success (200 OK)")
        print(f"Total Articles: {dash_data.get('total_articles')}")
        print(f"Active Alerts: {dash_data.get('active_alerts')}")
        print(f"Top Risks: {len(dash_data.get('top_risks', []))}")
    else:
        print(f"Dashboard Failed: {r2.status_code}")
        print(r2.text)

if __name__ == "__main__":
    verify()
