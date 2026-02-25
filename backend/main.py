"""
Predictive Governance Intelligence & Decision Support System
─────────────────────────────────────────────────────────────
FastAPI entry point with startup data seeding and full NLP processing pipeline.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal, Base
from app.models import (
    Source, Article, DetectionResult, GovernanceRiskScore, Alert, SentimentRecord,
    SignalProblem, SystemMetric,
)
from app.services.mock_data import get_seed_data
from app.services.nlp_service import run_nlp_pipeline
from app.services.fake_news_detector import detect_fake_news
from app.services.gri_service import compute_gri
from app.services.alert_service import generate_alert

from app.routes import dashboard, articles, alerts, analytics, sources, auth, resolutions, map_route, account, leaderboard, chatbot, reports, scanner, signal_problems, system_monitoring

app = FastAPI(
    title="Governance Intelligence System",
    description="Predictive Governance Intelligence & Decision Support System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(dashboard.router)
app.include_router(articles.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(sources.router)
app.include_router(auth.router)
app.include_router(resolutions.router)
app.include_router(map_route.router)
app.include_router(account.router)
app.include_router(leaderboard.router)
app.include_router(chatbot.router)
app.include_router(reports.router)
app.include_router(scanner.router)
app.include_router(signal_problems.router)
app.include_router(system_monitoring.router)


@app.on_event("startup")
def seed_database():
    """Create tables and seed with mock data, then run full processing pipeline."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ── Seed Signal Problems ─────────────────────────────────────
        if db.query(SignalProblem).count() == 0:
            _seed_signal_problems(db)

        if db.query(SystemMetric).count() == 0:
            _seed_system_metrics(db)

        # Skip article seeding if already seeded
        if db.query(Article).count() > 0:
            print("[SEED] Database already seeded — skipping.")
            return

        print("[SEED] Seeding database with mock governance data...")
        sources_data, articles_data = get_seed_data()

        # ── Create Sources ──────────────────────────────────────────────
        source_map = {}  # name → Source instance
        for s in sources_data:
            if s["name"] not in source_map:
                source = Source(
                    name=s["name"],
                    source_type=s["source_type"],
                    domain=s["domain"],
                    credibility_tier=s["credibility_tier"],
                    historical_accuracy=s["historical_accuracy"],
                )
                db.add(source)
                db.flush()
                source_map[s["name"]] = source

        # ── Create Articles & Run Pipeline ──────────────────────────────
        for art_data in articles_data:
            source = source_map[art_data["source_name"]]

            article = Article(
                source_id=source.id,
                title=art_data["title"],
                raw_text=art_data["raw_text"],
                category=art_data["category"],
                location=art_data["location"],
                content_hash=art_data["content_hash"],
                ingested_at=art_data["ingested_at"],
            )
            db.add(article)
            db.flush()

            # ── Step 1: NLP Analysis ────────────────────────────────────
            nlp_result = run_nlp_pipeline(art_data["raw_text"])

            sentiment = SentimentRecord(
                article_id=article.id,
                polarity=nlp_result["polarity"],
                subjectivity=nlp_result["subjectivity"],
                anger_rating=nlp_result["anger_rating"],
                sentiment_label=nlp_result["sentiment_label"],
            )
            db.add(sentiment)

            # ── Step 2: Fake News Detection ─────────────────────────────
            detection = detect_fake_news(
                text=art_data["raw_text"],
                source_credibility=source.historical_accuracy,
                source_tier=source.credibility_tier,
                polarity=nlp_result["polarity"],
                subjectivity=nlp_result["subjectivity"],
            )

            det_result = DetectionResult(
                article_id=article.id,
                confidence_score=detection["confidence_score"],
                label=detection["label"],
                features_json=detection["features"],
            )
            db.add(det_result)

            # ── Step 3: GRI Computation ─────────────────────────────────
            gri_result = compute_gri(
                source_credibility=source.historical_accuracy,
                linguistic_manipulation_index=detection["features"]["linguistic_manipulation_index"],
                claims=nlp_result.get("claims", []),
                detection_label=detection["label"],
                ingested_at=art_data["ingested_at"],
                source_type=source.source_type,
                word_count=nlp_result["word_count"],
            )

            gri_record = GovernanceRiskScore(
                article_id=article.id,
                gri_score=gri_result["gri_score"],
                component_scores=gri_result["component_scores"],
                risk_level=gri_result["risk_level"],
            )
            db.add(gri_record)

            # ── Step 4: Alert Generation ────────────────────────────────
            alert_data = generate_alert(
                category=art_data["category"],
                location=art_data["location"],
                gri_score=gri_result["gri_score"],
                anger_rating=nlp_result["anger_rating"],
                is_fake=(detection["label"] == "FAKE"),
            )

            if alert_data:
                alert = Alert(
                    article_id=article.id,
                    severity=alert_data["severity"],
                    department=alert_data["department"],
                    recommendation=alert_data["recommendation"],
                    urgency=alert_data["urgency"],
                    response_strategy=alert_data["response_strategy"],
                )
                db.add(alert)

        db.commit()
        total = db.query(Article).count()
        alerts_count = db.query(Alert).count()
        fake_count = db.query(DetectionResult).filter(
            DetectionResult.label == "FAKE"
        ).count()
        print(f"[SEED] Done! {total} articles, {alerts_count} alerts, {fake_count} flagged as FAKE.")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {e}")
        raise
    finally:
        db.close()


def _seed_signal_problems(db):
    """Insert the 8 default signal problems into the database."""
    problems = [
        {
            "id": "SIG-001",
            "title": "Anomalous Budget Allocation in Sector 7",
            "severity": "Critical",
            "category": "Financial Integrity",
            "location": "District Alpha \u2014 Sector 7",
            "detected_at": "2026-02-25T08:12:00Z",
            "description": "Automated scanners detected a \u20b94.2 Cr budget reallocation to an unregistered sub-contractor entity in Sector 7. The transaction bypassed standard multi-tier approval workflows. Pattern analysis indicates similarity to 3 prior flagged incidents in adjacent sectors. Immediate audit trail verification and fund-freeze protocol recommended.",
            "risk_score": 92,
            "source": "Financial Anomaly Detector v3.1",
        },
        {
            "id": "SIG-002",
            "title": "Sentiment Spike \u2014 Public Infrastructure Protest",
            "severity": "High",
            "category": "Public Sentiment",
            "location": "Metro Zone B \u2014 Quadrant 12",
            "detected_at": "2026-02-25T09:47:00Z",
            "description": "NLP sentiment monitors captured a 340% surge in negative discourse across social channels regarding delayed flyover construction in Quadrant 12. Anger index reached 0.87. Community mobilization signals detected \u2014 potential for organized protest within 48 hours. Recommend preemptive stakeholder communication and progress transparency bulletin.",
            "risk_score": 78,
            "source": "Sentiment Pulse Network",
        },
        {
            "id": "SIG-003",
            "title": "Fake News Propagation \u2014 Water Supply Contamination",
            "severity": "Critical",
            "category": "Misinformation",
            "location": "Rural Grid Delta-9",
            "detected_at": "2026-02-25T06:30:00Z",
            "description": "Fake news detection algorithms flagged a viral claim (confidence: 94.2%) alleging toxic contamination of the municipal water supply in Grid Delta-9. Source tracing reveals origin from a low-credibility blog with prior misinformation flags. Water quality sensor data shows all parameters within safe thresholds. Recommend immediate public clarification and source suppression request.",
            "risk_score": 88,
            "source": "Misinformation Shield AI",
        },
        {
            "id": "SIG-004",
            "title": "Unauthorized Personnel Access \u2014 Data Center",
            "severity": "High",
            "category": "Security Breach",
            "location": "Central Command \u2014 Vault C",
            "detected_at": "2026-02-25T11:05:00Z",
            "description": "Biometric access logs show 3 unauthorized entry attempts at Data Vault C within the last 6 hours. One attempt used a cloned credential that matched a decommissioned employee badge. Security perimeter integrity is intact but vulnerability window exists. Recommend immediate credential audit and physical security escalation.",
            "risk_score": 85,
            "source": "Perimeter Integrity Scanner",
        },
        {
            "id": "SIG-005",
            "title": "Healthcare Supply Chain Disruption Signal",
            "severity": "Medium",
            "category": "Supply Chain",
            "location": "District Gamma \u2014 Medical Hub 3",
            "detected_at": "2026-02-25T07:22:00Z",
            "description": "Predictive logistics models forecast a 60% probability of essential medicine stock-out at Medical Hub 3 within 10 days. Contributing factors include delayed vendor shipments and a 25% demand increase from adjacent districts. Auto-requisition protocols are queued pending approval. Recommend expedited procurement authorization.",
            "risk_score": 64,
            "source": "Supply Chain Oracle",
        },
        {
            "id": "SIG-006",
            "title": "Environmental Compliance Violation \u2014 Industrial Zone",
            "severity": "Medium",
            "category": "Environmental",
            "location": "Industrial Corridor Epsilon",
            "detected_at": "2026-02-25T10:15:00Z",
            "description": "Air quality monitoring drones detected particulate matter levels 2.3x above permissible limits near Factory Unit E-17 in Industrial Corridor Epsilon. Satellite thermal imaging confirms unfiltered emissions from an unregistered exhaust vent. Compliance history shows 2 prior warnings. Recommend enforcement action and mandatory remediation timeline.",
            "risk_score": 58,
            "source": "EnviroWatch Drone Grid",
        },
        {
            "id": "SIG-007",
            "title": "Election Data Integrity Alert",
            "severity": "Critical",
            "category": "Electoral Oversight",
            "location": "Central Election Commission Node",
            "detected_at": "2026-02-25T05:00:00Z",
            "description": "Blockchain validation layer detected a hash mismatch in voter roll update batch #4782. The discrepancy affects 12,400 records across 3 constituencies. Root cause analysis suggests a synchronization fault in the replication pipeline rather than malicious tampering. However, the integrity protocol mandates full forensic audit before the next scheduled update window.",
            "risk_score": 95,
            "source": "Electoral Integrity Validator",
        },
        {
            "id": "SIG-008",
            "title": "Traffic Grid Congestion Prediction \u2014 Festival Week",
            "severity": "Low",
            "category": "Urban Planning",
            "location": "Metro Zone A \u2014 Central Corridor",
            "detected_at": "2026-02-25T12:00:00Z",
            "description": "Predictive traffic models project a 180% increase in vehicular density along the Central Corridor during the upcoming festival week (Feb 28 \u2013 Mar 2). Historical pattern matching and live GPS fleet data confirm convergence at 4 major bottleneck intersections. Recommend activation of dynamic rerouting protocols and deployment of auxiliary traffic management units.",
            "risk_score": 42,
            "source": "Urban Flow Predictor",
        },
    ]
    for p in problems:
        db.add(SignalProblem(**p))
    db.commit()
    print(f"[SEED] Seeded {len(problems)} signal problems.")


def _seed_system_metrics(db):
    """Insert default system metrics into the database."""
    metrics = [
        {
            "id": "SYS-001",
            "subsystem_name": "NLP Sentiment Analysis Engine",
            "metric_type": "CPU Usage",
            "status": "Warning",
            "current_value": 82.5,
            "threshold_value": 80.0,
            "unit": "%",
            "location": "Mumbai DC-1 \u2014 Rack A7",
            "ai_diagnosis": "CPU utilization has exceeded the 80% threshold due to a surge in real-time sentiment processing requests. Correlation analysis shows 45% increase in social media ingestion from Western India feeds over the past 3 hours.",
            "ai_recommendation": "Scale horizontal pod autoscaler to 3 additional replicas. Consider enabling batch processing mode for non-critical sentiment feeds during peak hours. Review queue depth metrics.",
            "last_checked_at": "2026-02-25T17:00:00Z",
            "trend": "Degrading",
        },
        {
            "id": "SYS-002",
            "subsystem_name": "Fraud Detection Cluster",
            "metric_type": "Memory Usage",
            "status": "Critical",
            "current_value": 94.2,
            "threshold_value": 85.0,
            "unit": "%",
            "location": "Hyderabad DC-2 \u2014 Zone B",
            "ai_diagnosis": "Memory consumption has reached critical levels at 94.2%. Heap analysis reveals a potential memory leak in the transaction graph builder module. GC pauses have increased by 300% in the last hour.",
            "ai_recommendation": "Immediate action required: Trigger emergency garbage collection and restart the graph builder service. Deploy hotfix patch v2.4.1 which addresses the HashMap retention issue. Escalate to L2 support.",
            "last_checked_at": "2026-02-25T17:05:00Z",
            "trend": "Degrading",
        },
        {
            "id": "SYS-003",
            "subsystem_name": "Citizen Portal API Gateway",
            "metric_type": "Latency",
            "status": "Healthy",
            "current_value": 45.0,
            "threshold_value": 200.0,
            "unit": "ms",
            "location": "Delhi Central Hub \u2014 Edge Node 1",
            "ai_diagnosis": "API gateway response times are well within acceptable limits. P95 latency at 45ms with 99.97% success rate. CDN cache hit ratio is at 87%.",
            "ai_recommendation": "System is performing optimally. Continue monitoring. Consider enabling HTTP/3 for further latency improvements on mobile clients.",
            "last_checked_at": "2026-02-25T17:02:00Z",
            "trend": "Stable",
        },
        {
            "id": "SYS-004",
            "subsystem_name": "GRI Computation Node",
            "metric_type": "Throughput",
            "status": "Degraded",
            "current_value": 1250.0,
            "threshold_value": 2000.0,
            "unit": "req/s",
            "location": "Bangalore DC-3 \u2014 Compute Zone",
            "ai_diagnosis": "Throughput has dropped to 62.5% of normal capacity. Root cause traced to a slow downstream database query in the risk score aggregation pipeline. Connection pool saturation detected at 95%.",
            "ai_recommendation": "Optimize the risk_scores JOIN query with proper indexing on article_id and computed_at columns. Increase connection pool size from 20 to 50. Consider implementing query result caching with 30s TTL.",
            "last_checked_at": "2026-02-25T17:08:00Z",
            "trend": "Degrading",
        },
        {
            "id": "SYS-005",
            "subsystem_name": "Threat Intelligence Feed",
            "metric_type": "Error Rate",
            "status": "Warning",
            "current_value": 3.8,
            "threshold_value": 2.0,
            "unit": "%",
            "location": "Chennai DC-4 \u2014 Secure Enclave",
            "ai_diagnosis": "Error rate has elevated to 3.8%, primarily due to timeout errors from 2 external threat intelligence providers. 78% of errors are HTTP 504 Gateway Timeouts from the STIX/TAXII feed endpoints.",
            "ai_recommendation": "Implement circuit breaker pattern for failing external providers with 30s cooldown. Enable fallback to cached threat data. Contact vendor support for STIX feed reliability SLA review.",
            "last_checked_at": "2026-02-25T17:04:00Z",
            "trend": "Stable",
        },
        {
            "id": "SYS-006",
            "subsystem_name": "Data Lake Ingestion Pipeline",
            "metric_type": "Disk I/O",
            "status": "Healthy",
            "current_value": 340.0,
            "threshold_value": 800.0,
            "unit": "MB/s",
            "location": "Pune DC-5 \u2014 Storage Array",
            "ai_diagnosis": "Disk I/O is operating at 42.5% capacity with balanced read/write distribution. RAID-10 array health is nominal across all 24 drives. No predicted failures in SMART data.",
            "ai_recommendation": "System is healthy. Schedule next storage health audit in 7 days. Consider SSD tier migration for hot data partitions to improve read latency by estimated 60%.",
            "last_checked_at": "2026-02-25T17:01:00Z",
            "trend": "Stable",
        },
        {
            "id": "SYS-007",
            "subsystem_name": "Blockchain Validator Node",
            "metric_type": "Network Bandwidth",
            "status": "Critical",
            "current_value": 920.0,
            "threshold_value": 500.0,
            "unit": "Mbps",
            "location": "Kolkata DC-6 \u2014 Consensus Zone",
            "ai_diagnosis": "Network bandwidth usage at 184% of threshold. Consensus protocol is experiencing high replication traffic due to a chain fork recovery event. Block finality latency has increased to 12 seconds from the normal 3 seconds.",
            "ai_recommendation": "Prioritize consensus traffic with QoS rules. Temporarily reduce non-critical replication to secondary nodes. Monitor fork resolution \u2014 if not resolved in 30 minutes, trigger manual chain reconciliation.",
            "last_checked_at": "2026-02-25T17:06:00Z",
            "trend": "Degrading",
        },
        {
            "id": "SYS-008",
            "subsystem_name": "Real-time Alert Dispatcher",
            "metric_type": "Uptime",
            "status": "Healthy",
            "current_value": 99.98,
            "threshold_value": 99.5,
            "unit": "%",
            "location": "Mumbai DC-1 \u2014 HA Cluster",
            "ai_diagnosis": "Alert dispatcher uptime is excellent at 99.98%. Two brief failover events were detected but seamlessly handled by the HA cluster with zero alert delivery loss. Message queue depth is stable at 12 messages.",
            "ai_recommendation": "System is performing above SLA targets. Continue current configuration. Next planned maintenance window: March 5, 2026 02:00-04:00 IST.",
            "last_checked_at": "2026-02-25T17:03:00Z",
            "trend": "Improving",
        },
    ]
    for m in metrics:
        db.add(SystemMetric(**m))
    db.commit()
    print(f"[SEED] Seeded {len(metrics)} system metrics.")


@app.get("/")
def root():
    return {
        "system": "Predictive Governance Intelligence & Decision Support System",
        "version": "1.0.0",
        "endpoints": [
            "/api/dashboard",
            "/api/articles",
            "/api/alerts",
            "/api/analytics/sentiment-trend",
            "/api/analytics/risk-heatmap",
            "/api/analytics/category-breakdown",
            "/api/sources",
            "/api/signal-problems",
            "/api/system-metrics",
            "/docs",
        ],
    }
