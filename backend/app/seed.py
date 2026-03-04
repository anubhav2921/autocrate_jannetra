"""
Database Seeder — Populates governance.db with realistic demo data.
──────────────────────────────────────────────────────────────────────
Run:  cd backend && venv\\Scripts\\python.exe -m app.seed
"""

import random
from datetime import datetime, timedelta

from app.database import engine, SessionLocal
from app.models import (
    Base, Source, Article, DetectionResult, GovernanceRiskScore,
    Alert, SentimentRecord, User, Resolution, SignalProblem, SystemMetric,
)
from app.services.mock_data import get_seed_data
from app.services.fake_news_detector import detect_fake_news
from app.services.nlp_service import run_nlp_pipeline
from app.services.gri_service import compute_gri


def gen_uuid():
    import uuid
    return str(uuid.uuid4())


def seed():
    """Seed the database with demo data."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ── Check if data already exists ─────────────────────────────
    existing_articles = db.query(Article).count()
    if existing_articles > 0:
        print(f"[SEED] Database already has {existing_articles} articles. Skipping seed.")
        print("[SEED] To re-seed, delete governance.db and run again.")
        db.close()
        return

    print("[SEED] Starting database seed...")

    # ── 1. Create Sources ────────────────────────────────────────
    sources_data, articles_data = get_seed_data()
    source_map = {}  # name -> Source object

    for s in sources_data:
        source = Source(
            id=gen_uuid(),
            name=s["name"],
            source_type=s["source_type"],
            domain=s["domain"],
            credibility_tier=s["credibility_tier"],
            historical_accuracy=s["historical_accuracy"],
            last_audited_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
        )
        db.add(source)
        source_map[s["name"]] = source

    db.commit()
    print(f"[SEED] Created {len(source_map)} sources")

    # ── 2. Create Articles + Detection + Sentiment + GRI ─────────
    article_count = 0
    alert_count = 0

    for art_data in articles_data:
        source = source_map[art_data["source_name"]]
        source_info = art_data["source_data"]

        # Create the article
        article = Article(
            id=gen_uuid(),
            source_id=source.id,
            title=art_data["title"],
            raw_text=art_data["raw_text"],
            category=art_data["category"],
            location=art_data["location"],
            content_hash=art_data["content_hash"],
            ingested_at=art_data["ingested_at"],
            language="en",
        )
        db.add(article)
        db.flush()  # Get the article.id

        # Run NLP pipeline
        nlp = run_nlp_pipeline(art_data["raw_text"])

        # Create sentiment record
        sentiment = SentimentRecord(
            id=gen_uuid(),
            article_id=article.id,
            polarity=nlp["polarity"],
            subjectivity=nlp["subjectivity"],
            anger_rating=nlp["anger_rating"],
            sentiment_label=nlp["sentiment_label"],
            analyzed_at=art_data["ingested_at"],
        )
        db.add(sentiment)

        # Run fake news detection
        detection = detect_fake_news(
            text=art_data["raw_text"],
            source_credibility=source_info["historical_accuracy"],
            source_tier=source_info["credibility_tier"],
            polarity=nlp["polarity"],
            subjectivity=nlp["subjectivity"],
        )

        detection_result = DetectionResult(
            id=gen_uuid(),
            article_id=article.id,
            confidence_score=detection["confidence_score"],
            label=detection["label"],
            features_json=detection["features"],
            evaluated_at=art_data["ingested_at"],
        )
        db.add(detection_result)

        # Compute GRI score
        gri = compute_gri(
            source_credibility=source_info["historical_accuracy"],
            linguistic_manipulation_index=detection["features"]["linguistic_manipulation_index"],
            claims=nlp.get("claims", []),
            detection_label=detection["label"],
            ingested_at=art_data["ingested_at"],
            source_type=source_info["source_type"],
            word_count=nlp.get("word_count", 50),
        )

        gri_record = GovernanceRiskScore(
            id=gen_uuid(),
            article_id=article.id,
            gri_score=gri["gri_score"],
            component_scores=gri["component_scores"],
            risk_level=gri["risk_level"],
            computed_at=art_data["ingested_at"],
        )
        db.add(gri_record)

        # ── Generate alerts for HIGH risk articles ───────────────
        if gri["risk_level"] in ("HIGH", "MODERATE") and random.random() > 0.3:
            departments = nlp.get("entities", {}).get("departments", [])
            dept = departments[0] if departments else random.choice([
                "Water Supply Department", "Public Works Department",
                "Health Department", "Education Department",
                "Police Department", "Municipal Corporation",
            ])

            severity_map = {"HIGH": "CRITICAL", "MODERATE": "HIGH"}
            sev = severity_map.get(gri["risk_level"], "MEDIUM")
            if random.random() > 0.5 and sev == "CRITICAL":
                sev = "HIGH"

            alert = Alert(
                id=gen_uuid(),
                article_id=article.id,
                severity=sev,
                department=dept,
                recommendation=f"Investigate signal: {article.title[:100]}. "
                               f"GRI Score: {gri['gri_score']}. Immediate review required.",
                urgency="Immediate" if sev in ("CRITICAL", "HIGH") else "Within 24 hours",
                response_strategy=f"Assign team to verify source claims. "
                                   f"Monitor social media for amplification. "
                                   f"Prepare public response if needed.",
                is_active=True,
                created_at=art_data["ingested_at"],
            )
            db.add(alert)
            alert_count += 1

        article_count += 1

    db.commit()
    print(f"[SEED] Created {article_count} articles with detection results, GRI scores, and sentiments")
    print(f"[SEED] Created {alert_count} alerts")

    # ── 3. Create Demo Users ─────────────────────────────────────
    demo_users = [
        {"name": "Admin User", "email": "admin@jannetra.gov.in", "role": "ADMIN", "department": "IT Department", "password": "admin123"},
        {"name": "Rahul Sharma", "email": "rahul@jannetra.gov.in", "role": "LEADER", "department": "Water Supply Department", "password": "leader123"},
        {"name": "Priya Singh", "email": "priya@jannetra.gov.in", "role": "ANALYST", "department": "Health Department", "password": "analyst123"},
        {"name": "Amit Patel", "email": "amit@jannetra.gov.in", "role": "LEADER", "department": "Public Works Department", "password": "leader123"},
        {"name": "Deepika Kumar", "email": "deepika@jannetra.gov.in", "role": "ANALYST", "department": "Education Department", "password": "analyst123"},
    ]

    import hashlib
    users_created = []
    for u in demo_users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                id=gen_uuid(),
                name=u["name"],
                email=u["email"],
                password_hash=hashlib.sha256(u["password"].encode()).hexdigest(),
                role=u["role"],
                department=u["department"],
                auth_provider="email",
                is_active=True,
            )
            db.add(user)
            users_created.append(user)

    db.commit()
    print(f"[SEED] Created {len(users_created)} demo users")

    # ── 4. Create Resolutions ────────────────────────────────────
    if users_created:
        resolution_titles = [
            ("Fixed water pipeline for Sector 12", "Water", "Mumbai", "RESOLVED"),
            ("Road pothole repair on NH-48", "Infrastructure", "Pune", "RESOLVED"),
            ("Deployed mobile health unit to Village X", "Healthcare", "Jaipur", "RESOLVED"),
            ("Installed 50 new streetlights in Ward 14", "Law & Order", "Delhi", "RESOLVED"),
            ("Anti-corruption hotline follow-up action", "Corruption", "Lucknow", "IN_PROGRESS"),
            ("School building emergency repair", "Education", "Patna", "IN_PROGRESS"),
            ("Sewage drainage cleaning drive", "Water", "Hyderabad", "PARTIALLY_RESOLVED"),
        ]

        for title, cat, loc, status in resolution_titles:
            r = Resolution(
                id=gen_uuid(),
                resolved_by=random.choice(users_created).id,
                title=title,
                category=cat,
                location=loc,
                problem_description=f"Community reported issue regarding {title.lower()}.",
                action_taken=f"Team dispatched and {title.lower()} completed successfully." if status == "RESOLVED" else "Work in progress.",
                resources_used="Government funds, local workforce" if status == "RESOLVED" else "Awaiting budget approval",
                people_benefited=str(random.randint(500, 50000)),
                status=status,
                resolved_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)) if status == "RESOLVED" else None,
                submitted_at=datetime.utcnow() - timedelta(days=random.randint(1, 40)),
            )
            db.add(r)

        db.commit()
        print(f"[SEED] Created {len(resolution_titles)} resolutions")

    # ── 5. Create Signal Problems ────────────────────────────────
    signal_problems = [
        {"id": "SIG-001", "title": "Surge in anti-government sentiment detected on social media", "severity": "Critical", "category": "Public Sentiment", "location": "Delhi NCR — Zone 3", "detected_at": "2026-02-28T14:30:00Z", "description": "NLP Sentiment Engine detected a 340% surge in negative sentiment across 15,000+ social media posts within 6 hours. Pattern analysis suggests coordinated campaign.", "risk_score": 87.5, "source": "Sentiment Pulse Network v2.4", "status": "Pending"},
        {"id": "SIG-002", "title": "Financial misappropriation in road construction project", "severity": "High", "category": "Financial Integrity", "location": "Mumbai — Western Corridor", "detected_at": "2026-02-27T09:15:00Z", "description": "Financial Anomaly Detector flagged Rs 12.8 crore discrepancy between sanctioned vs actual expenditure in NH-48 expansion. Vendor invoices show 47% markup.", "risk_score": 72.3, "source": "Financial Anomaly Detector v3.1", "status": "Pending"},
        {"id": "SIG-003", "title": "Misinformation campaign about vaccine safety", "severity": "Critical", "category": "Misinformation", "location": "Jaipur — District Alpha", "detected_at": "2026-02-26T16:45:00Z", "description": "Fake news detection engine identified 2,300+ identical anti-vaccine messages spread across WhatsApp groups. Source traced to 3 bot accounts.", "risk_score": 91.2, "source": "Misinformation Detection Engine v1.8", "status": "Pending"},
        {"id": "SIG-004", "title": "Water quality deterioration in Zone 7 supply", "severity": "High", "category": "Healthcare", "location": "Chennai — Zone 7", "detected_at": "2026-02-25T11:20:00Z", "description": "IoT sensors in water supply pipeline detected E.coli levels 3x above safe threshold. Affects approximately 45,000 households.", "risk_score": 78.9, "source": "Environmental Monitoring Grid v4.0", "status": "Pending"},
        {"id": "SIG-005", "title": "Unusual procurement pattern in education department", "severity": "Medium", "category": "Corruption", "location": "Lucknow — Central District", "detected_at": "2026-02-24T08:00:00Z", "description": "Procurement Analytics Engine detected 5 vendors with identical GST registrations winning 89% of education equipment tenders. Statistical probability < 0.01%.", "risk_score": 65.4, "source": "Procurement Analytics Engine v2.1", "status": "Pending"},
        {"id": "SIG-006", "title": "Traffic congestion causing emergency response delays", "severity": "Medium", "category": "Infrastructure", "location": "Bangalore — IT Corridor", "detected_at": "2026-02-23T17:30:00Z", "description": "Traffic Analysis System reports ambulance response time increased by 40% in IT corridor area. Average ETA now 22 minutes vs. target of 12 minutes.", "risk_score": 58.7, "source": "Smart Traffic Analytics v5.2", "status": "Pending"},
        {"id": "SIG-007", "title": "Illegal mining activity near protected forest", "severity": "High", "category": "Environmental", "location": "Ranchi — Forest Zone B", "detected_at": "2026-02-22T06:10:00Z", "description": "Satellite imagery analysis detected 3 new quarry sites within 2km of protected forest boundary. Estimated illegal extraction: 15,000 cubic meters.", "risk_score": 74.1, "source": "Satellite Surveillance AI v3.0", "status": "Pending"},
        {"id": "SIG-008", "title": "Spike in cybercrime targeting senior citizens", "severity": "Medium", "category": "Security Breach", "location": "Hyderabad — Cyber Hub", "detected_at": "2026-02-21T13:45:00Z", "description": "Cyber Threat Intelligence detected 150% increase in phishing attacks targeting senior citizens. 230 complaints filed in past week alone.", "risk_score": 62.8, "source": "Cyber Threat Intelligence v2.7", "status": "Pending"},
    ]

    for sp in signal_problems:
        existing = db.query(SignalProblem).filter(SignalProblem.id == sp["id"]).first()
        if not existing:
            db.add(SignalProblem(**sp))

    db.commit()
    print(f"[SEED] Created {len(signal_problems)} signal problems")

    # ── 6. Create System Metrics ─────────────────────────────────
    system_metrics = [
        {"id": "SYS-001", "subsystem_name": "NLP Sentiment Engine", "metric_type": "CPU Usage", "status": "Healthy", "current_value": 45.2, "threshold_value": 80.0, "unit": "%", "location": "Mumbai DC-1 Rack A7", "ai_diagnosis": "CPU utilization within normal parameters. Processing 12,000 sentiment analyses per hour efficiently.", "ai_recommendation": "No action required. Continue monitoring during peak political event periods.", "last_checked_at": "2026-02-28T15:00:00Z", "trend": "Stable"},
        {"id": "SYS-002", "subsystem_name": "Fraud Detection Cluster", "metric_type": "Memory Usage", "status": "Warning", "current_value": 78.5, "threshold_value": 75.0, "unit": "%", "location": "Delhi Central Hub", "ai_diagnosis": "Memory usage exceeding threshold due to increased transaction volume during budget season. Garbage collector running every 30 seconds.", "ai_recommendation": "Scale up memory allocation to 64GB. Consider horizontal scaling. Schedule maintenance window for cache clearing.", "last_checked_at": "2026-02-28T14:45:00Z", "trend": "Degrading"},
        {"id": "SYS-003", "subsystem_name": "Citizen Portal API Gateway", "metric_type": "Latency", "status": "Critical", "current_value": 2450.0, "threshold_value": 500.0, "unit": "ms", "location": "Hyderabad Edge Node 3", "ai_diagnosis": "Response latency 5x above threshold. Root cause: database connection pool exhaustion. 150 pending queries in queue.", "ai_recommendation": "URGENT: Increase connection pool from 20 to 50. Deploy read replicas. Implement query caching for frequently accessed citizen data.", "last_checked_at": "2026-02-28T14:30:00Z", "trend": "Degrading"},
        {"id": "SYS-004", "subsystem_name": "GRI Computation Node", "metric_type": "Throughput", "status": "Healthy", "current_value": 850.0, "threshold_value": 500.0, "unit": "req/s", "location": "Bangalore DC-2 Rack C4", "ai_diagnosis": "Throughput well above minimum threshold. Processing governance risk scores efficiently across all 8 compute nodes.", "ai_recommendation": "System performing optimally. Consider load testing at 2x capacity to validate scaling readiness.", "last_checked_at": "2026-02-28T15:10:00Z", "trend": "Improving"},
        {"id": "SYS-005", "subsystem_name": "Real-time Alert Dispatcher", "metric_type": "Error Rate", "status": "Warning", "current_value": 3.2, "threshold_value": 2.0, "unit": "%", "location": "Chennai Edge Node 1", "ai_diagnosis": "Error rate elevated due to intermittent SMTP timeout when sending alert notifications. 45 failed deliveries in last hour.", "ai_recommendation": "Switch to async notification queue. Add retry logic with exponential backoff. Investigate SMTP provider health.", "last_checked_at": "2026-02-28T14:55:00Z", "trend": "Degrading"},
        {"id": "SYS-006", "subsystem_name": "Data Lake Ingestion Pipeline", "metric_type": "Disk I/O", "status": "Healthy", "current_value": 120.0, "threshold_value": 300.0, "unit": "MB/s", "location": "Mumbai DC-1 Rack B2", "ai_diagnosis": "Disk I/O well within healthy range. Ingesting data from 10 sources at consistent rate. SSD write amplification factor: 1.2.", "ai_recommendation": "Continue monitoring. Schedule SSD health check for next maintenance window.", "last_checked_at": "2026-02-28T15:05:00Z", "trend": "Stable"},
    ]

    for sm in system_metrics:
        existing = db.query(SystemMetric).filter(SystemMetric.id == sm["id"]).first()
        if not existing:
            db.add(SystemMetric(**sm))

    db.commit()
    print(f"[SEED] Created {len(system_metrics)} system metrics")

    db.close()
    print("\n[SEED] ✅ Database seeding complete!")
    print("[SEED] Demo credentials:")
    print("  admin@jannetra.gov.in / admin123")
    print("  rahul@jannetra.gov.in / leader123")
    print("  priya@jannetra.gov.in / analyst123")


if __name__ == "__main__":
    seed()
