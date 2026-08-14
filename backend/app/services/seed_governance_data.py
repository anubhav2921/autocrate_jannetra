import logging
from datetime import datetime, timedelta
from ..mongodb import (
    jurisdictions_collection,
    organizations_collection,
    users_collection,
    sla_configs_collection,
    governance_problems_collection,
    problem_history_collection,
    signal_problems_collection
)
from ..utils import hash_password, gen_uuid

logger = logging.getLogger("jannetra.seed_governance")

async def seed_governance_data():
    """
    Seeds the database with hierarchical jurisdictions, organizations,
    demo users, SLA rules, and sample problems.
    """
    logger.info("Starting JanNetra Governance Flow seeding...")

    # Clear existing data in these specific collections to avoid duplicates
    await jurisdictions_collection.delete_many({})
    await organizations_collection.delete_many({})
    await users_collection.delete_many({"email": {"$in": [
        "citizen@email.com", "panchayat@email.com", "supervisor@email.com",
        "municipal@email.com", "district@email.com", "state@email.com", "admin@email.com"
    ]}})
    await sla_configs_collection.delete_many({})
    await governance_problems_collection.delete_many({})

    # 1. Seed Jurisdictions
    # Uttar Pradesh (State)
    up_jur = {
        "id": "JUR-UP",
        "name": "Uttar Pradesh",
        "level": "STATE",
        "parent_id": None,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    # Prayagraj (District)
    prayagraj_jur = {
        "id": "JUR-PRY",
        "name": "Prayagraj",
        "level": "DISTRICT",
        "parent_id": "JUR-UP",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    # Demo Block (Block)
    block_jur = {
        "id": "JUR-BLK",
        "name": "Demo Block",
        "level": "BLOCK",
        "parent_id": "JUR-PRY",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    # ABC Panchayat (Panchayat)
    panchayat_jur = {
        "id": "JUR-PCT",
        "name": "ABC Panchayat",
        "level": "PANCHAYAT",
        "parent_id": "JUR-BLK",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    # Demo Village (Village)
    village_jur = {
        "id": "JUR-VLG",
        "name": "Demo Village",
        "level": "VILLAGE",
        "parent_id": "JUR-PCT",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    # Ward 1 - Civil Lines (Ward)
    ward_jur = {
        "id": "JUR-WRD",
        "name": "Ward 1 - Civil Lines",
        "level": "WARD",
        "parent_id": "JUR-PRY",
        "is_active": True,
        "created_at": datetime.utcnow()
    }

    await jurisdictions_collection.insert_many([
        up_jur, prayagraj_jur, block_jur, panchayat_jur, village_jur, ward_jur
    ])
    logger.info("Seeded jurisdictions hierarchy.")

    # 2. Seed Organizations
    state_org = {
        "id": "ORG-UP-GOV",
        "name": "UP State Governance Board",
        "parent_id": None,
        "jurisdiction_id": "JUR-UP",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    district_org = {
        "id": "ORG-PRY-DIST",
        "name": "Prayagraj District Commission",
        "parent_id": "ORG-UP-GOV",
        "jurisdiction_id": "JUR-PRY",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    muni_org = {
        "id": "ORG-PRY-MUNI",
        "name": "Demo Municipality",
        "parent_id": "ORG-PRY-DIST",
        "jurisdiction_id": "JUR-PRY",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    engineering_org = {
        "id": "ORG-MUNI-ENG",
        "name": "Municipal Engineering Department",
        "parent_id": "ORG-PRY-MUNI",
        "jurisdiction_id": "JUR-PRY",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    panchayat_org = {
        "id": "ORG-ABC-PCT",
        "name": "ABC Panchayat Office",
        "parent_id": "ORG-PRY-DIST",
        "jurisdiction_id": "JUR-PCT",
        "is_active": True,
        "created_at": datetime.utcnow()
    }

    await organizations_collection.insert_many([
        state_org, district_org, muni_org, engineering_org, panchayat_org
    ])
    logger.info("Seeded organizations.")

    # 3. Seed Users with passwords hashed, department & jurisdictions mapping
    citizen = {
        "id": "USR-CITIZEN",
        "name": "Demo Citizen",
        "username": "citizen123",
        "email": "citizen@email.com",
        "password_hash": hash_password("citizen"),
        "role": "CITIZEN",
        "phone": "+919999999901",
        "phone_number": "+919999999901",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "auth_provider": "email"
    }
    panchayat_officer = {
        "id": "USR-PANCHAYAT",
        "name": "Rahul Kumar",
        "username": "rahul",
        "email": "panchayat@email.com",
        "password_hash": hash_password("officer"),
        "role": "PANCHAYAT_OFFICER",
        "department": "municipal",
        "organization_id": "ORG-ABC-PCT",
        "jurisdiction_id": "JUR-PCT",
        "phone": "+919999999902",
        "phone_number": "+919999999902",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "auth_provider": "email"
    }
    panchayat_supervisor = {
        "id": "USR-SUPERVISOR",
        "name": "Amit Sharma",
        "username": "amit",
        "email": "supervisor@email.com",
        "password_hash": hash_password("supervisor"),
        "role": "BLOCK_OFFICER",
        "department": "municipal",
        "organization_id": "ORG-PRY-DIST",
        "jurisdiction_id": "JUR-BLK",
        "phone": "+919999999903",
        "phone_number": "+919999999903",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "auth_provider": "email"
    }
    municipal_officer = {
        "id": "USR-MUNICIPAL",
        "name": "Sanjay Verma",
        "username": "sverma",
        "email": "municipal@email.com",
        "password_hash": hash_password("municipal"),
        "role": "MUNICIPAL_OFFICER",
        "department": "municipal",
        "organization_id": "ORG-PRY-MUNI",
        "jurisdiction_id": "JUR-PRY",
        "phone": "+919999999904",
        "phone_number": "+919999999904",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "auth_provider": "email"
    }
    district_officer = {
        "id": "USR-DISTRICT",
        "name": "Prayagraj DM",
        "username": "prayagrajdm",
        "email": "district@email.com",
        "password_hash": hash_password("district"),
        "role": "DISTRICT_OFFICER",
        "department": "municipal",
        "organization_id": "ORG-PRY-DIST",
        "jurisdiction_id": "JUR-PRY",
        "phone": "+919999999905",
        "phone_number": "+919999999905",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "auth_provider": "email"
    }
    state_officer = {
        "id": "USR-STATE",
        "name": "State Governance Chief",
        "username": "chief",
        "email": "state@email.com",
        "password_hash": hash_password("state"),
        "role": "STATE_OFFICER",
        "department": "municipal",
        "organization_id": "ORG-UP-GOV",
        "jurisdiction_id": "JUR-UP",
        "phone": "+919999999906",
        "phone_number": "+919999999906",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "auth_provider": "email"
    }
    admin_user = {
        "id": "USR-ADMIN",
        "name": "Demo Admin",
        "username": "admin",
        "email": "admin@email.com",
        "password_hash": hash_password("admin"),
        "role": "ADMIN",
        "department": "",
        "phone": "+919999999907",
        "phone_number": "+919999999907",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "auth_provider": "email"
    }

    await users_collection.insert_many([
        citizen, panchayat_officer, panchayat_supervisor, municipal_officer,
        district_officer, state_officer, admin_user
    ])
    logger.info("Seeded demo users.")

    # 4. Seed SLA Configurations
    await sla_configs_collection.insert_many([
        {"priority": "LOW", "duration_hours": 72},
        {"priority": "MEDIUM", "duration_hours": 48},
        {"priority": "HIGH", "duration_hours": 24},
        {"priority": "CRITICAL", "duration_hours": 12}
    ])
    logger.info("Seeded SLA configurations.")

    # 5. Seed Governance Problems in various states
    now = datetime.utcnow()
    
    # Detected/Pending Verification Problem
    p1 = {
        "problem_id": "GP-001",
        "source_signal_id": "SIG-101",
        "source_citizen_report_id": None,
        "title": "Streetlight not working in Demo Village",
        "description": "The main streetlights near the village entrance have been non-functional for 3 days.",
        "category": "Civil Infrastructure",
        "priority": "LOW",
        "severity": "LOW",
        "status": "DETECTED",
        "location": {
            "latitude": 25.4358,
            "longitude": 81.8463,
            "address": "Entrance Lane, Demo Village",
            "village": "Demo Village",
            "panchayat": "ABC Panchayat",
            "block": "Demo Block",
            "district": "Prayagraj",
            "state": "Uttar Pradesh"
        },
        "department_id": "electricity",
        "organization_id": "ORG-ABC-PCT",
        "jurisdiction_id": "JUR-VLG",
        "created_by": "USR-CITIZEN",
        "created_at": now,
        "updated_at": now,
        "due_at": now + timedelta(hours=72)
    }

    # Assigned Problem
    p2 = {
        "problem_id": "GP-002",
        "source_signal_id": "SIG-102",
        "source_citizen_report_id": None,
        "title": "Water Logging near Civil Lines Sector 3",
        "description": "Heavy overflow from the sewer line causing standing water on main road.",
        "category": "Civil Infrastructure",
        "priority": "MEDIUM",
        "severity": "MEDIUM",
        "status": "ASSIGNED",
        "location": {
            "latitude": 25.45,
            "longitude": 81.85,
            "address": "Civil Lines Sector 3",
            "ward": "Ward 1 - Civil Lines",
            "district": "Prayagraj",
            "state": "Uttar Pradesh"
        },
        "department_id": "water",
        "organization_id": "ORG-MUNI-ENG",
        "jurisdiction_id": "JUR-WRD",
        "created_by": "USR-CITIZEN",
        "current_owner_user_id": "USR-PANCHAYAT", # Assigned to Rahul
        "current_owner_organization_id": "ORG-ABC-PCT",
        "created_at": now - timedelta(hours=10),
        "updated_at": now - timedelta(hours=10),
        "assigned_at": now - timedelta(hours=10),
        "due_at": now + timedelta(hours=38)
    }

    # In Progress Problem
    p3 = {
        "problem_id": "GP-003",
        "source_signal_id": "SIG-103",
        "source_citizen_report_id": None,
        "title": "Broken Drain cover near Market",
        "description": "Concrete cover broken, hazardous for pedestrians.",
        "category": "Civil Infrastructure",
        "priority": "HIGH",
        "severity": "HIGH",
        "status": "IN_PROGRESS",
        "location": {
            "latitude": 25.435,
            "longitude": 81.84,
            "address": "Market Area, Demo Village",
            "village": "Demo Village",
            "panchayat": "ABC Panchayat",
            "block": "Demo Block",
            "district": "Prayagraj",
            "state": "Uttar Pradesh"
        },
        "department_id": "municipal",
        "organization_id": "ORG-ABC-PCT",
        "jurisdiction_id": "JUR-VLG",
        "created_by": "USR-CITIZEN",
        "current_owner_user_id": "USR-PANCHAYAT",
        "current_owner_organization_id": "ORG-ABC-PCT",
        "created_at": now - timedelta(hours=12),
        "updated_at": now - timedelta(hours=8),
        "assigned_at": now - timedelta(hours=12),
        "accepted_at": now - timedelta(hours=10),
        "started_at": now - timedelta(hours=8),
        "due_at": now + timedelta(hours=12)
    }

    # Overdue/Escalated Problem (due date in the past)
    p4 = {
        "problem_id": "GP-004",
        "source_signal_id": "SIG-104",
        "source_citizen_report_id": None,
        "title": "Hazardous wiring hanging in Ward 1",
        "description": "High voltage lines drooping, touching residential trees.",
        "category": "Civil Infrastructure",
        "priority": "CRITICAL",
        "severity": "CRITICAL",
        "status": "IN_PROGRESS",
        "location": {
            "latitude": 25.44,
            "longitude": 81.84,
            "address": "Main Lane, Civil Lines",
            "ward": "Ward 1 - Civil Lines",
            "district": "Prayagraj",
            "state": "Uttar Pradesh"
        },
        "department_id": "electricity",
        "organization_id": "ORG-MUNI-ENG",
        "jurisdiction_id": "JUR-WRD",
        "created_by": "USR-CITIZEN",
        "current_owner_user_id": "USR-PANCHAYAT",
        "current_owner_organization_id": "ORG-ABC-PCT",
        "created_at": now - timedelta(hours=16),
        "updated_at": now - timedelta(hours=16),
        "assigned_at": now - timedelta(hours=16),
        "accepted_at": now - timedelta(hours=15),
        "started_at": now - timedelta(hours=14),
        # Due in the past (overdue) to trigger SLA test!
        "due_at": now - timedelta(hours=4)
    }

    # Resolution Submitted Problem
    p5 = {
        "problem_id": "GP-005",
        "source_signal_id": "SIG-105",
        "source_citizen_report_id": None,
        "title": "Illegal garbage dump near school",
        "description": "Piles of trash rotting on the road, blocking school gates.",
        "category": "Civil Infrastructure",
        "priority": "MEDIUM",
        "severity": "MEDIUM",
        "status": "RESOLUTION_SUBMITTED",
        "location": {
            "latitude": 25.4358,
            "longitude": 81.8463,
            "address": "School Road, Demo Village",
            "village": "Demo Village",
            "panchayat": "ABC Panchayat",
            "block": "Demo Block",
            "district": "Prayagraj",
            "state": "Uttar Pradesh"
        },
        "department_id": "municipal",
        "organization_id": "ORG-ABC-PCT",
        "jurisdiction_id": "JUR-VLG",
        "created_by": "USR-CITIZEN",
        "current_owner_user_id": "USR-PANCHAYAT",
        "current_owner_organization_id": "ORG-ABC-PCT",
        "created_at": now - timedelta(hours=24),
        "updated_at": now - timedelta(hours=2),
        "assigned_at": now - timedelta(hours=24),
        "accepted_at": now - timedelta(hours=23),
        "started_at": now - timedelta(hours=20),
        "due_at": now + timedelta(hours=24),
        "resolved_at": now - timedelta(hours=2),
        "resolution_summary": "Garbage cleared. Dumpsters deployed. Signboards installed to prevent dumping.",
        "evidence_url": "https://jannetra.firebasestorage.app/demo_evidence.jpg"
    }

    # Resolved Problem
    p6 = {
        "problem_id": "GP-006",
        "source_signal_id": "SIG-106",
        "source_citizen_report_id": None,
        "title": "Water supply line pipe leakage",
        "description": "Main supply pipe leaking drinking water onto the street.",
        "category": "Civil Infrastructure",
        "priority": "MEDIUM",
        "severity": "MEDIUM",
        "status": "RESOLVED",
        "location": {
            "latitude": 25.43,
            "longitude": 81.84,
            "address": "Sub Station Road, Prayagraj",
            "ward": "Ward 1 - Civil Lines",
            "district": "Prayagraj",
            "state": "Uttar Pradesh"
        },
        "department_id": "water",
        "organization_id": "ORG-MUNI-ENG",
        "jurisdiction_id": "JUR-WRD",
        "created_by": "USR-CITIZEN",
        "current_owner_user_id": "USR-PANCHAYAT",
        "current_owner_organization_id": "ORG-ABC-PCT",
        "created_at": now - timedelta(days=2),
        "updated_at": now - timedelta(days=1),
        "assigned_at": now - timedelta(days=2),
        "accepted_at": now - timedelta(days=2),
        "started_at": now - timedelta(days=2),
        "due_at": now + timedelta(days=1),
        "resolved_at": now - timedelta(days=1),
        "verified_at": now - timedelta(days=1),
        "verified_by": "USR-SUPERVISOR",
        "resolution_summary": "Leak sealed and reinforced by plumbing crew.",
        "evidence_url": "https://jannetra.firebasestorage.app/demo_leak_evidence.jpg"
    }

    await governance_problems_collection.insert_many([
        p1, p2, p3, p4, p5, p6
    ])
    logger.info("Seeded demo governance problems.")

    # Write initial history records for demo problems
    history_records = []
    for p in [p1, p2, p3, p4, p5, p6]:
        history_records.append({
            "history_id": f"HST-{gen_uuid()[:8].upper()}",
            "problem_id": p["problem_id"],
            "actor_id": p["created_by"],
            "actor_role": "CITIZEN",
            "action": "Created",
            "old_status": None,
            "new_status": "DETECTED",
            "remarks": "Problem registered.",
            "timestamp": p["created_at"]
        })
        if p["status"] != "DETECTED":
            history_records.append({
                "history_id": f"HST-{gen_uuid()[:8].upper()}",
                "problem_id": p["problem_id"],
                "actor_id": "USR-MUNICIPAL",
                "actor_role": "MUNICIPAL_OFFICER",
                "action": "Verified",
                "old_status": "DETECTED",
                "new_status": "VERIFIED",
                "remarks": "Issue verified as official governance problem.",
                "timestamp": p["created_at"] + timedelta(minutes=10)
            })
        if p.get("assigned_at"):
            history_records.append({
                "history_id": f"HST-{gen_uuid()[:8].upper()}",
                "problem_id": p["problem_id"],
                "actor_id": "USR-MUNICIPAL",
                "actor_role": "MUNICIPAL_OFFICER",
                "action": "Assigned",
                "old_status": "VERIFIED",
                "new_status": "ASSIGNED",
                "remarks": "Assigned to Rahul Kumar (Panchayat Officer) for resolution.",
                "timestamp": p["assigned_at"]
            })
        if p.get("accepted_at"):
            history_records.append({
                "history_id": f"HST-{gen_uuid()[:8].upper()}",
                "problem_id": p["problem_id"],
                "actor_id": p["current_owner_user_id"],
                "actor_role": "PANCHAYAT_OFFICER",
                "action": "Accepted",
                "old_status": "ASSIGNED",
                "new_status": "ACCEPTED",
                "remarks": "Accepted by assignee.",
                "timestamp": p["accepted_at"]
            })
        if p.get("started_at"):
            history_records.append({
                "history_id": f"HST-{gen_uuid()[:8].upper()}",
                "problem_id": p["problem_id"],
                "actor_id": p["current_owner_user_id"],
                "actor_role": "PANCHAYAT_OFFICER",
                "action": "Start Work",
                "old_status": "ACCEPTED",
                "new_status": "IN_PROGRESS",
                "remarks": "Began work on site.",
                "timestamp": p["started_at"]
            })
        if p["status"] == "RESOLUTION_SUBMITTED" or p["status"] == "RESOLVED":
            history_records.append({
                "history_id": f"HST-{gen_uuid()[:8].upper()}",
                "problem_id": p["problem_id"],
                "actor_id": p["current_owner_user_id"],
                "actor_role": "PANCHAYAT_OFFICER",
                "action": "Submit Resolution",
                "old_status": "IN_PROGRESS",
                "new_status": "RESOLUTION_SUBMITTED",
                "remarks": f"Resolution submitted: {p.get('resolution_summary')}",
                "timestamp": p["resolved_at"]
            })
        if p["status"] == "RESOLVED":
            history_records.append({
                "history_id": f"HST-{gen_uuid()[:8].upper()}",
                "problem_id": p["problem_id"],
                "actor_id": p["verified_by"],
                "actor_role": "BLOCK_OFFICER",
                "action": "Verify Resolution",
                "old_status": "RESOLUTION_SUBMITTED",
                "new_status": "RESOLVED",
                "remarks": "Resolution verified and problem closed.",
                "timestamp": p["verified_at"]
            })

    await problem_history_collection.insert_many(history_records)
    logger.info("Seeded history records.")
    
    # 6. Seed a SignalProblem that needs verification
    sig_prob = {
        "id": "SIG-DEMO-99",
        "title": "Streetlight malfunction in Prayagraj Ward 1",
        "severity": "Medium",
        "category": "Civil Infrastructure",
        "location": "Prayagraj",
        "detected_at": datetime.utcnow(),
        "description": "Local citizens report streetlight malfunction in Prayagraj Ward 1",
        "risk_score": 65.0,
        "source": "Reddit",
        "source_type": "social",
        "created_at": datetime.utcnow(),
        "status": "Pending"
    }
    # Clean and insert
    await signal_problems_collection.delete_many({"id": "SIG-DEMO-99"})
    await signal_problems_collection.insert_one(sig_prob)
    
    logger.info("JanNetra Governance Flow seeding complete!")
