import asyncio
import sys
import os
import httpx
from app.main import app

async def run_auth_tests():
    print("========================================")
    print("Testing JanNetra JWT & Optional Firebase Auth (In-Process)")
    print("========================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health check
        res = await client.get("/")
        print(f"[1] Health check: {res.status_code} -> {res.json().get('status')}")
        assert res.status_code == 200

        # 2. Auth Status
        res = await client.get("/api/auth/status")
        status_data = res.json()
        print(f"[2] Auth status: {res.status_code} -> {status_data}")
        assert res.status_code == 200
        assert status_data.get("jwt_auth") is True

        # 3. Direct JWT Registration
        test_email = f"test_jwt_{int(asyncio.get_event_loop().time() * 1000)}@example.com"
        reg_payload = {
            "name": "JWT Test User",
            "email": test_email,
            "password": "Password123!",
            "role": "LEADER",
            "department": "municipal"
        }
        res = await client.post("/api/auth/register", json=reg_payload)
        reg_data = res.json()
        print(f"[3] Direct Registration: {res.status_code} -> Success: {reg_data.get('success')}, Token exists: {bool(reg_data.get('token'))}")
        assert res.status_code == 200
        assert reg_data.get("success") is True
        token = reg_data.get("token")
        assert token is not None

        # 4. Email/Password Login
        login_payload = {
            "email": test_email,
            "password": "Password123!"
        }
        res = await client.post("/api/auth/login", json=login_payload)
        login_data = res.json()
        print(f"[4] Login: {res.status_code} -> Success: {login_data.get('success')}, User: {login_data.get('user', {}).get('email')}")
        assert res.status_code == 200
        assert login_data.get("success") is True
        login_token = login_data.get("token")

        # 5. Access /api/auth/me with JWT Token
        headers = {"Authorization": f"Bearer {login_token}"}
        res = await client.get("/api/auth/me", headers=headers)
        me_data = res.json()
        print(f"[5] GET /api/auth/me: {res.status_code} -> User: {me_data.get('user', {}).get('name')}, Role: {me_data.get('user', {}).get('role')}")
        assert res.status_code == 200
        assert me_data.get("success") is True

        # 6. Refresh Token
        res = await client.post("/api/auth/refresh", headers=headers)
        refresh_data = res.json()
        print(f"[6] POST /api/auth/refresh: {res.status_code} -> New token exists: {bool(refresh_data.get('token'))}")
        assert res.status_code == 200
        assert refresh_data.get("success") is True

        # 7. Native Phone OTP Send & Verify
        test_phone = f"+91{int(asyncio.get_event_loop().time() * 100) % 10000000000:010d}"
        res = await client.post("/api/auth/send-phone-otp", json={"phone_number": test_phone, "name": "Phone Tester"})
        phone_otp_data = res.json()
        demo_otp = phone_otp_data.get("demo_otp")
        print(f"[7a] Send Phone OTP: {res.status_code} -> Success: {phone_otp_data.get('success')}, Demo OTP: {demo_otp}")
        assert res.status_code == 200

        res = await client.post("/api/auth/register-phone", json={
            "phone_number": test_phone,
            "otp": demo_otp,
            "name": "Phone Tester",
            "department": "transport"
        })
        phone_verify_data = res.json()
        print(f"[7b] Register Phone OTP: {res.status_code} -> Success: {phone_verify_data.get('success')}, Token exists: {bool(phone_verify_data.get('token'))}")
        assert res.status_code == 200
        assert phone_verify_data.get("success") is True

        print("========================================")
        print("[SUCCESS] ALL JWT & OPTIONAL FIREBASE AUTH TESTS PASSED!")
        print("========================================")
        return True


if __name__ == "__main__":
    asyncio.run(run_auth_tests())
