const PROBLEMS = [
    {
        id: "SIG-001",
        title: "Anomalous Budget Allocation in Sector 7",
        severity: "Critical",
        category: "Financial Integrity",
        location: "District Alpha — Sector 7",
        detectedAt: "2026-02-25T08:12:00Z",
        description:
            "Automated scanners detected a ₹4.2 Cr budget reallocation to an unregistered sub-contractor entity in Sector 7. The transaction bypassed standard multi-tier approval workflows. Pattern analysis indicates similarity to 3 prior flagged incidents in adjacent sectors. Immediate audit trail verification and fund-freeze protocol recommended.",
        riskScore: 92,
        source: "Financial Anomaly Detector v3.1",
    },
    {
        id: "SIG-002",
        title: "Sentiment Spike — Public Infrastructure Protest",
        severity: "High",
        category: "Public Sentiment",
        location: "Metro Zone B — Quadrant 12",
        detectedAt: "2026-02-25T09:47:00Z",
        description:
            "NLP sentiment monitors captured a 340% surge in negative discourse across social channels regarding delayed flyover construction in Quadrant 12. Anger index reached 0.87. Community mobilization signals detected — potential for organized protest within 48 hours. Recommend preemptive stakeholder communication and progress transparency bulletin.",
        riskScore: 78,
        source: "Sentiment Pulse Network",
    },
    {
        id: "SIG-003",
        title: "Fake News Propagation — Water Supply Contamination",
        severity: "Critical",
        category: "Misinformation",
        location: "Rural Grid Delta-9",
        detectedAt: "2026-02-25T06:30:00Z",
        description:
            "Fake news detection algorithms flagged a viral claim (confidence: 94.2%) alleging toxic contamination of the municipal water supply in Grid Delta-9. Source tracing reveals origin from a low-credibility blog with prior misinformation flags. Water quality sensor data shows all parameters within safe thresholds. Recommend immediate public clarification and source suppression request.",
        riskScore: 88,
        source: "Misinformation Shield AI",
    },
    {
        id: "SIG-004",
        title: "Unauthorized Personnel Access — Data Center",
        severity: "High",
        category: "Security Breach",
        location: "Central Command — Vault C",
        detectedAt: "2026-02-25T11:05:00Z",
        description:
            "Biometric access logs show 3 unauthorized entry attempts at Data Vault C within the last 6 hours. One attempt used a cloned credential that matched a decommissioned employee badge. Security perimeter integrity is intact but vulnerability window exists. Recommend immediate credential audit and physical security escalation.",
        riskScore: 85,
        source: "Perimeter Integrity Scanner",
    },
    {
        id: "SIG-005",
        title: "Healthcare Supply Chain Disruption Signal",
        severity: "Medium",
        category: "Supply Chain",
        location: "District Gamma — Medical Hub 3",
        detectedAt: "2026-02-25T07:22:00Z",
        description:
            "Predictive logistics models forecast a 60% probability of essential medicine stock-out at Medical Hub 3 within 10 days. Contributing factors include delayed vendor shipments and a 25% demand increase from adjacent districts. Auto-requisition protocols are queued pending approval. Recommend expedited procurement authorization.",
        riskScore: 64,
        source: "Supply Chain Oracle",
    },
    {
        id: "SIG-006",
        title: "Environmental Compliance Violation — Industrial Zone",
        severity: "Medium",
        category: "Environmental",
        location: "Industrial Corridor Epsilon",
        detectedAt: "2026-02-25T10:15:00Z",
        description:
            "Air quality monitoring drones detected particulate matter levels 2.3x above permissible limits near Factory Unit E-17 in Industrial Corridor Epsilon. Satellite thermal imaging confirms unfiltered emissions from an unregistered exhaust vent. Compliance history shows 2 prior warnings. Recommend enforcement action and mandatory remediation timeline.",
        riskScore: 58,
        source: "EnviroWatch Drone Grid",
    },
    {
        id: "SIG-007",
        title: "Election Data Integrity Alert",
        severity: "Critical",
        category: "Electoral Oversight",
        location: "Central Election Commission Node",
        detectedAt: "2026-02-25T05:00:00Z",
        description:
            "Blockchain validation layer detected a hash mismatch in voter roll update batch #4782. The discrepancy affects 12,400 records across 3 constituencies. Root cause analysis suggests a synchronization fault in the replication pipeline rather than malicious tampering. However, the integrity protocol mandates full forensic audit before the next scheduled update window.",
        riskScore: 95,
        source: "Electoral Integrity Validator",
    },
    {
        id: "SIG-008",
        title: "Traffic Grid Congestion Prediction — Festival Week",
        severity: "Low",
        category: "Urban Planning",
        location: "Metro Zone A — Central Corridor",
        detectedAt: "2026-02-25T12:00:00Z",
        description:
            "Predictive traffic models project a 180% increase in vehicular density along the Central Corridor during the upcoming festival week (Feb 28 – Mar 2). Historical pattern matching and live GPS fleet data confirm convergence at 4 major bottleneck intersections. Recommend activation of dynamic rerouting protocols and deployment of auxiliary traffic management units.",
        riskScore: 42,
        source: "Urban Flow Predictor",
    },
];

export default PROBLEMS;
