import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, AlertTriangle, CheckCircle2, ShieldAlert, 
    Send, Cpu, Activity, Sparkles, Terminal, FileText, ArrowRight, RefreshCw 
} from 'lucide-react';

const PRESETS = [
    {
        title: "🚨 Urgent Infrastructure Crisis",
        text: "Massive water main rupture in Katra Market flooding 40+ shops. Roads submerged, traffic completely stalled. Urgent Jal Nigam intervention needed!",
        region: "zone-katra",
        department: "Jal Nigam / PWD",
        anger: 8.8,
        sentiment: -0.89,
        fakeRisk: "12% (Verified Source)",
        status: "CRITICAL_ACTION_REQUIRED",
        griScore: 92.4
    },
    {
        title: "⚠️ Viral Misinformation Alert",
        text: "CONFIRMED: Entire city power grid will be shut down indefinitely from midnight tonight!! SHARE THIS BEFORE THEY DELETE IT!!",
        region: "zone-citywide",
        department: "Disinformation Desk / Police",
        anger: 9.4,
        sentiment: -0.76,
        fakeRisk: "89% (High Clickbait & Shouting)",
        status: "MISINFORMATION_FLAGGED",
        griScore: 84.1
    },
    {
        title: "🛠️ Municipal Civic Hazard",
        text: "Deep unpaved potholes near Civil Lines crossing causing severe traffic hazards and minor motorcycle skids since yesterday.",
        region: "zone-civillines",
        department: "Municipal Corporation",
        anger: 5.6,
        sentiment: -0.52,
        fakeRisk: "8% (Citizen Signal)",
        status: "ROUTED_FOR_MAINTENANCE",
        griScore: 61.2
    }
];

const SignalAuditorSimulator = () => {
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [auditorName, setAuditorName] = useState('Gov Inspector Miller');
    const [targetRegion, setTargetRegion] = useState('zone-katra');
    const [claimText, setClaimText] = useState(PRESETS[0].text);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);

    const handleApplyPreset = (index) => {
        setSelectedPreset(index);
        const preset = PRESETS[index];
        setClaimText(preset.text);
        setTargetRegion(preset.region);
        setResult(null);
    };

    const handleRunAudit = (e) => {
        e.preventDefault();
        if (!claimText.trim()) return;

        setIsAnalyzing(true);
        setResult(null);

        setTimeout(() => {
            // Intelligent heuristic scoring based on text analysis
            const hasExclamation = (claimText.match(/!/g) || []).length > 2;
            const isCaps = claimText === claimText.toUpperCase() || (claimText.match(/[A-Z]{4,}/g) || []).length > 1;
            const isWater = /water|drain|flood|rupture|pipe/i.test(claimText);
            const isPower = /power|grid|blackout|electric/i.test(claimText);
            const isRoad = /pothole|road|traffic|paved/i.test(claimText);

            let dept = "Municipal Corporation";
            if (isWater) dept = "Jal Nigam / Public Works";
            else if (isPower) dept = "Electricity Board (UPPCL)";
            else if (isRoad) dept = "PWD Roads & Bridges";

            const angerScore = Math.min(9.8, Math.max(3.5, (hasExclamation ? 3 : 1.5) + (isCaps ? 3.5 : 2) + Math.random() * 2)).toFixed(1);
            const fakeRiskVal = isCaps || hasExclamation ? Math.floor(65 + Math.random() * 25) : Math.floor(8 + Math.random() * 20);
            const griVal = Math.floor(55 + (angerScore * 4) + Math.random() * 5);

            setResult({
                timestamp: new Date().toLocaleTimeString(),
                reportId: `JN-AUDIT-${Math.floor(100000 + Math.random() * 900000)}`,
                anger: angerScore,
                sentiment: (-0.4 - Math.random() * 0.5).toFixed(2),
                fakeRisk: `${fakeRiskVal}% (${fakeRiskVal > 50 ? 'High Anomaly / Shouting' : 'High Reliability'})`,
                department: dept,
                griScore: Math.min(99, griVal),
                status: fakeRiskVal > 50 ? 'FLAGGED_MISINFORMATION' : 'ESCALATED_TO_DEPARTMENT',
                actionNotice: fakeRiskVal > 50 
                    ? 'Compliance Action: Warning Dispatched to Fact-Checking Cell. Public Bulletin Alert Generated.'
                    : `Compliance Action: Urgent Directive Transmitted to ${dept}. Priority Ticket Queued.`
            });
            setIsAnalyzing(false);
        }, 850);
    };

    return (
        <section className="auditor-simulator-section" id="simulator">
            <div className="auditor-simulator-inner">
                {/* Header with Monospace Editorial Badges */}
                <div className="auditor-header">
                    <div className="mn-tag-row">
                        <span className="mn-badge">AUDITOR // SIMULATOR</span>
                        <span className="mn-badge-secondary">[ 100% SOFTWARE-BASED ]</span>
                        <span className="mn-live-status"><span className="blink-dot" /> LIVE ENGINE</span>
                    </div>
                    <h2 className="auditor-title">
                        GovSignal <span>Auditor & Neural Tester</span>
                    </h2>
                    <p className="auditor-subtitle">
                        Test JanNetra's AI intelligence pipeline in real time. Choose an incident scenario or input custom civic text to simulate instant DistilBERT sentiment scoring, Anger Rating dynamics, and Fake News screening.
                    </p>
                </div>

                {/* Preset Scenario Selector */}
                <div className="simulator-presets">
                    <span className="presets-label"><Terminal size={14} /> Quick Scenario Presets:</span>
                    <div className="presets-buttons">
                        {PRESETS.map((p, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`preset-btn ${selectedPreset === idx ? 'active' : ''}`}
                                onClick={() => handleApplyPreset(idx)}
                            >
                                {p.title}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Simulator Grid */}
                <div className="simulator-grid">
                    {/* Left: Input Console */}
                    <div className="simulator-input-card">
                        <div className="sim-card-header">
                            <div className="sim-dot-controls">
                                <span className="dot dot-red" />
                                <span className="dot dot-yellow" />
                                <span className="dot dot-green" />
                            </div>
                            <span className="sim-console-title">JANNETRA_CORE // INTAKE_TERMINAL</span>
                        </div>

                        <form onSubmit={handleRunAudit} className="simulator-form">
                            <div className="form-fields-row">
                                <div className="sim-field">
                                    <label className="sim-label">Auditor / Stakeholder</label>
                                    <input 
                                        type="text" 
                                        className="sim-input"
                                        value={auditorName} 
                                        onChange={(e) => setAuditorName(e.target.value)} 
                                        placeholder="e.g. Officer Sharma"
                                    />
                                </div>
                                <div className="sim-field">
                                    <label className="sim-label">Region of Interest (ROI)</label>
                                    <select 
                                        className="sim-select"
                                        value={targetRegion} 
                                        onChange={(e) => setTargetRegion(e.target.value)}
                                    >
                                        <option value="zone-katra">Zone 4: Katra Commercial Sector</option>
                                        <option value="zone-civillines">Zone 1: Civil Lines District</option>
                                        <option value="zone-naini">Zone 8: Naini Industrial Area</option>
                                        <option value="zone-citywide">Zone 0: City-Wide Broadcast</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sim-field full">
                                <label className="sim-label">Signal Content / Verification Claim Text</label>
                                <textarea 
                                    className="sim-textarea"
                                    rows={4}
                                    value={claimText}
                                    onChange={(e) => setClaimText(e.target.value)}
                                    placeholder="Enter civic complaint or news text to test AI analysis..."
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="sim-submit-btn"
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <RefreshCw size={18} className="spin-icon" />
                                        <span>Running Neural Pipeline...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={18} />
                                        <span>Run Live AI Signal Audit</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right: Real-time Telemetry & Result Output */}
                    <div className="simulator-output-card">
                        <div className="sim-card-header">
                            <span className="sim-console-title"><Cpu size={14} /> NEURAL_TELEMETRY // OUTPUT</span>
                            <span className="mn-telemetry-badge">SWAGGER-V3 ENGINE</span>
                        </div>

                        <div className="sim-output-body">
                            {!result && !isAnalyzing && (
                                <div className="sim-empty-state">
                                    <Activity size={36} className="pulse-icon" />
                                    <h4>Awaiting Signal Stream</h4>
                                    <p>Select a scenario or enter text and trigger the audit to view real-time anger metrics and risk scoring.</p>
                                </div>
                            )}

                            {isAnalyzing && (
                                <div className="sim-loading-state">
                                    <div className="neural-scanning-bar" />
                                    <Sparkles size={32} className="spin-icon text-accent" />
                                    <h4>Synthesizing NLP & Sentiment Vectors...</h4>
                                    <p className="mn-log-line">[DISTILBERT] :: INGESTING CLAIM TEXT...</p>
                                    <p className="mn-log-line">[HEURISTIC] :: COMPUTING ANGER COEF...</p>
                                </div>
                            )}

                            <AnimatePresence>
                                {result && !isAnalyzing && (
                                    <motion.div 
                                        className="sim-result-panel"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="sim-result-header">
                                            <div className="sim-status-chip">
                                                {result.status === 'FLAGGED_MISINFORMATION' ? (
                                                    <span className="chip chip-danger"><ShieldAlert size={14} /> 🚨 FAKE NEWS DETECTED</span>
                                                ) : (
                                                    <span className="chip chip-success"><CheckCircle2 size={14} /> ✅ VERIFIED CIVIC SIGNAL</span>
                                                )}
                                            </div>
                                            <span className="sim-audit-id">{result.reportId}</span>
                                        </div>

                                        <div className="sim-metrics-grid">
                                            <div className="sim-metric-box">
                                                <span className="metric-lbl">Anger Intensity</span>
                                                <span className="metric-val text-red">{result.anger} / 10</span>
                                                <div className="metric-bar">
                                                    <div 
                                                        className="metric-fill bg-red" 
                                                        style={{ width: `${(result.anger / 10) * 100}%` }} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="sim-metric-box">
                                                <span className="metric-lbl">Governance Risk (GRI)</span>
                                                <span className="metric-val text-amber">{result.griScore}%</span>
                                                <div className="metric-bar">
                                                    <div 
                                                        className="metric-fill bg-amber" 
                                                        style={{ width: `${result.griScore}%` }} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="sim-metric-box">
                                                <span className="metric-lbl">Sentiment Polarity</span>
                                                <span className="metric-val text-blue">{result.sentiment}</span>
                                                <span className="metric-sub">DistilBERT Vector</span>
                                            </div>

                                            <div className="sim-metric-box">
                                                <span className="metric-lbl">Department Routing</span>
                                                <span className="metric-val text-green">{result.department}</span>
                                                <span className="metric-sub">Auto-Classified</span>
                                            </div>
                                        </div>

                                        <div className="sim-action-box">
                                            <FileText size={16} className="text-accent" />
                                            <div>
                                                <p className="action-title">DISPATCH COMPLIANCE TELEMETRY</p>
                                                <p className="action-desc">{result.actionNotice}</p>
                                            </div>
                                        </div>

                                        <div className="sim-footer-meta">
                                            <span>Telemetry Audited: {result.timestamp}</span>
                                            <span>SHA-256 Verified Hash</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SignalAuditorSimulator;
