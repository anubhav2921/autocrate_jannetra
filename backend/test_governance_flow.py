import asyncio
import sys
import os
from datetime import datetime, timedelta
import httpx
from app.main import app
from app.mongodb import (
    governance_problems_collection,
    problem_history_collection,
    users_collection,
    jurisdictions_collection
)
from app.services.sla_service import check_for_sla_breaches
from app.services.seed_governance_data import seed_governance_data

async def run_governance_tests():
    print("========================================")
    print("Testing JanNetra Governance Problems flow (In-Process)")
    print("========================================")

    # 1. Reset / Seed DB data to ensure pristine state
    await seed_governance_data()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        
        # Helper: Get JWT token for a user
        async def get_token(email, password):
            res = await client.post("/api/auth/login", json={"email": email, "password": password})
            data = res.json()
            assert data.get("success") is True, f"Login failed for {email}"
            return data["token"], data["user"]["id"]

        # Log in different users
        citizen_token, citizen_id = await get_token("citizen@email.com", "citizen")
        panchayat_token, panchayat_id = await get_token("panchayat@email.com", "officer")
        supervisor_token, supervisor_id = await get_token("supervisor@email.com", "supervisor")
        municipal_token, municipal_id = await get_token("municipal@email.com", "municipal")
        district_token, district_id = await get_token("district@email.com", "district")

        # -------------------------------------------------------------
        # TEST 1: Citizen creates a new direct problem
        # -------------------------------------------------------------
        prob_payload = {
            "title": "Broken street gutter in Demo Village",
            "description": "The sewer grating is broken and people are tripping.",
            "category": "Civil Infrastructure",
            "priority": "LOW",
            "latitude": 25.4358,
            "longitude": 81.8463,
            "address": "Market Lane, Demo Village"
        }
        headers = {"Authorization": f"Bearer {citizen_token}"}
        res = await client.post("/api/problems", json=prob_payload, headers=headers)
        prob_data = res.json()
        print(f"[1] Citizen Direct Problem Creation: {res.status_code} -> Status: {prob_data.get('status')}, ID: {prob_data.get('problem_id')}")
        assert res.status_code == 200
        assert prob_data.get("status") == "VERIFIED" # Pre-verified since it has coordinates
        created_prob_id = prob_data["problem_id"]

        # -------------------------------------------------------------
        # TEST 2: Citizen lists their own problems
        # -------------------------------------------------------------
        res = await client.get("/api/problems", headers=headers)
        c_list = res.json()
        print(f"[2] Citizen Lists Problems: {res.status_code} -> Count: {len(c_list)}")
        assert res.status_code == 200
        assert any(p["problem_id"] == created_prob_id for p in c_list)

        # -------------------------------------------------------------
        # TEST 3: Access control - Panchayat officer can view problem in their jurisdiction (ABC Panchayat)
        # -------------------------------------------------------------
        p_headers = {"Authorization": f"Bearer {panchayat_token}"}
        res = await client.get(f"/api/problems/{created_prob_id}", headers=p_headers)
        print(f"[3a] Panchayat Officer fetches problem detail: {res.status_code} -> {res.json().get('title')}")
        assert res.status_code == 200

        # Panchayat officer attempts to fetch GP-006 (Ward 1, outside their Panchayat) -> Expect 403 Forbidden!
        res = await client.get("/api/problems/GP-006", headers=p_headers)
        print(f"[3b] Panchayat Officer fetches out-of-jurisdiction problem: {res.status_code} -> {res.json().get('detail')}")
        assert res.status_code == 403

        # -------------------------------------------------------------
        # TEST 4: Municipal Officer assigns problem to Panchayat Officer (Rahul Kumar)
        # -------------------------------------------------------------
        m_headers = {"Authorization": f"Bearer {municipal_token}"}
        assign_payload = {
            "assigned_to_user_id": panchayat_id,
            "assigned_to_organization_id": "ORG-ABC-PCT",
            "assigned_to_jurisdiction_id": "JUR-PCT",
            "reason": "Assigning to local panchayat officer for immediate fix.",
            "priority": "MEDIUM",
            "due_days": 2
        }
        res = await client.post(f"/api/problems/{created_prob_id}/assign", json=assign_payload, headers=m_headers)
        assign_data = res.json()
        print(f"[4] Municipal Officer Assigns: {res.status_code} -> Success: {assign_data.get('success')}, Status: {assign_data.get('problem', {}).get('status')}")
        assert res.status_code == 200
        assert assign_data.get("success") is True
        assert assign_data["problem"]["status"] == "ASSIGNED"

        # -------------------------------------------------------------
        # TEST 5: Unauthorized assignment rejected
        # -------------------------------------------------------------
        res = await client.post(f"/api/problems/{created_prob_id}/assign", json=assign_payload, headers=headers)
        print(f"[5] Citizen attempts to assign problem: {res.status_code} -> {res.json().get('detail')}")
        assert res.status_code == 403

        # -------------------------------------------------------------
        # TEST 6: Panchayat Officer accepts the problem task
        # -------------------------------------------------------------
        res = await client.post(f"/api/problems/{created_prob_id}/accept", headers=p_headers)
        accept_data = res.json()
        print(f"[6] Officer Accepts: {res.status_code} -> Status: {accept_data.get('status')}")
        assert res.status_code == 200
        assert accept_data.get("status") == "ACCEPTED"

        # -------------------------------------------------------------
        # TEST 7: Panchayat Officer starts work
        # -------------------------------------------------------------
        res = await client.post(f"/api/problems/{created_prob_id}/start", headers=p_headers)
        start_data = res.json()
        print(f"[7] Officer Starts Work: {res.status_code} -> Status: {start_data.get('status')}")
        assert res.status_code == 200
        assert start_data.get("status") == "IN_PROGRESS"

        # -------------------------------------------------------------
        # TEST 8: Invalid transition - cannot resolve directly without submitting first, or jumping status
        # -------------------------------------------------------------
        res = await client.post(f"/api/problems/{created_prob_id}/verify-resolution", json={"approved": True}, headers=p_headers)
        print(f"[8] Invalid Transition Check (verify before resolve): {res.status_code} -> {res.json().get('detail')}")
        assert res.status_code == 400 or res.status_code == 403

        # -------------------------------------------------------------
        # TEST 9: Officer submits work resolution
        # -------------------------------------------------------------
        res_payload = {
            "resolution_summary": "Sewer grating replaced with new reinforced concrete slab.",
            "evidence_url": "https://example.com/resolved_drain.jpg"
        }
        res = await client.post(f"/api/problems/{created_prob_id}/resolve", json=res_payload, headers=p_headers)
        resolve_data = res.json()
        print(f"[9] Submit Resolution: {res.status_code} -> Status: {resolve_data.get('status')}")
        assert res.status_code == 200
        assert resolve_data.get("status") == "RESOLUTION_SUBMITTED"

        # -------------------------------------------------------------
        # TEST 10: Independent supervisor verifies the resolution and closes it
        # -------------------------------------------------------------
        s_headers = {"Authorization": f"Bearer {supervisor_token}"}
        res = await client.post(f"/api/problems/{created_prob_id}/verify-resolution", json={"approved": True, "remarks": "Looks perfect!"}, headers=s_headers)
        verify_data = res.json()
        print(f"[10] Supervisor Verifies: {res.status_code} -> Status: {verify_data.get('status')}")
        assert res.status_code == 200
        assert verify_data.get("status") == "RESOLVED"

        # -------------------------------------------------------------
        # TEST 11: Auto escalation check on SLA breach
        # -------------------------------------------------------------
        # GP-004 was seeded in IN_PROGRESS status and due_at is set to the past.
        # Running the check_for_sla_breaches() service function.
        escalated_count = await check_for_sla_breaches()
        print(f"[11a] SLA Background Scan Job: Escalated {escalated_count} overdue problems.")
        assert escalated_count >= 1

        # Retrieve GP-004 and check status is now ESCALATED
        res = await client.get("/api/problems/GP-004", headers=s_headers)
        gp004 = res.json()
        print(f"[11b] Verifying Escalated Problem Status: GP-004 Status is {gp004.get('status')}, Priority is {gp004.get('priority')}, Owner is {gp004.get('current_owner_user_id')}")
        assert gp004.get("status") == "ESCALATED"
        # Check that owner is escalated to Block Supervisor (Amit Sharma USR-SUPERVISOR)
        assert gp004.get("current_owner_user_id") == "USR-SUPERVISOR"

        # -------------------------------------------------------------
        # TEST 12: Manual Escalation
        # -------------------------------------------------------------
        # Let's manually escalate GP-003
        res = await client.post("/api/problems/GP-003/escalate", json={"reason": "Need backup tools from district head."}, headers=p_headers)
        esc_data = res.json()
        print(f"[12] Manual Escalation: {res.status_code} -> Status: {esc_data.get('status')}, Owner: {esc_data.get('current_owner_user_id')}")
        assert res.status_code == 200
        assert esc_data.get("status") == "ESCALATED"
        assert esc_data.get("current_owner_user_id") == "USR-SUPERVISOR" # Panchayat officer escalated to Block Supervisor

        # -------------------------------------------------------------
        # TEST 13: Search eligible assignees restricted to supervisor's jurisdiction
        # -------------------------------------------------------------
        res = await client.get("/api/problems/GP-003/eligible-assignees?search=rahul", headers=s_headers)
        assignees = res.json()
        print(f"[13] Eligible Assignees Search: {res.status_code} -> Results: {[a['name'] for a in assignees]}")
        assert res.status_code == 200
        assert len(assignees) > 0
        assert any(a["id"] == panchayat_id for a in assignees)

        print("========================================")
        print("[SUCCESS] ALL GOVERNANCE PROBLEMS FLOW TESTS PASSED!")
        print("========================================")
        return True


if __name__ == "__main__":
    asyncio.run(run_governance_tests())
