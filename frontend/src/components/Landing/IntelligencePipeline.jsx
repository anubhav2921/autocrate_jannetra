import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Cpu, Brain, GitBranch, CheckCircle2, ShieldCheck, Activity, ArrowRight, Zap, Eye, Share2 } from 'lucide-react';

const PIPELINE_STEPS = [
    {
        id: "step-1",
        stepNumber: "01",
        name: "Intake",
        tag: "Sentinel Ingestion",
        title: "Step 1 // Continuous Multi-Source Intake",
        summary: "Autonomous scrapers ingest unstructured intelligence from 150+ news portals, GDELT event stream, citizen threads, and official bulletins every 30 minutes.",
        metrics: [
            { label: "Sources Scanned", value: "150+ Outlets" },
            { label: "Cycle Frequency", value: "Every 30 Mins" },
            { label: "Data Integrity", value: "SHA-256 Hashed" }
        ],
        codeSnippet: `[SENTINEL] :: INGESTING :: REDDIT/MUMBAI-COMMUNITY -> 15 SIGNALS\n[SENTINEL] :: INGESTING :: PIB-GOV-FEEDS -> 24 BULLETINS\n[INTEGRITY] :: HASH CHECK PASSED -> 0 DUPES`
    },
    {
        id: "step-2",
        stepNumber: "02",
        name: "Analysis",
        tag: "Neural Engine",
        title: "Step 2 // DistilBERT & Anger Dynamics",
        summary: "Raw text undergoes GPU-accelerated NLP processing: sentiment polarity scoring, heuristic Anger Intensity (0-10), and multi-layer fake news anomaly filtering.",
        metrics: [
            { label: "NLP Model", value: "DistilBERT GPU" },
            { label: "Anger Index", value: "0.0 - 10.0 Scale" },
            { label: "Inference Time", value: "< 42ms / batch" }
        ],
        codeSnippet: `[NEURAL]   :: SENTIMENT :: CLUSTER-8A2F -> { SCORE: -0.84 }\n[HEURISTIC]:: ANGER DYNAMICS -> { RATING: 8.6/10 HIGH }\n[ARMOR]    :: FAKE CHECK -> { CLICKBAIT: 0.04, RELIABLE: YES }`
    },
    {
        id: "step-3",
        stepNumber: "03",
        name: "Synthesis",
        tag: "Cluster & Scoring",
        title: "Step 3 // Semantic Clustering & Risk Scoring",
        summary: "Individual reports are grouped into unified Issue Clusters using cosine embeddings. A weighted Governance Risk Score (0-100%) ranks issues by priority.",
        metrics: [
            { label: "Clustering", value: "Cosine Similarity" },
            { label: "Priority Threshold", value: "> 80% = Critical" },
            { label: "Deduplication", value: "Zero Redundancy" }
        ],
        codeSnippet: `[SYNTHESIS]:: CLUSTER -> ISSUE-44C [WATER PIPELINE RUPTURE]\n[PRIORITY] :: GRI SCORE: 92.5 [CRITICAL ESCALATION]\n[GEO]      :: MAPPED -> ZONE-4 (KATRA COMMERCIAL)`
    },
    {
        id: "step-4",
        stepNumber: "04",
        name: "Action",
        tag: "Resolution Dispatch",
        title: "Step 4 // Automated Escalation & Proof-of-Work",
        summary: "Critical clusters automatically dispatch high-priority compliance directives to responsible departments (PWD, Jal Nigam, Police) with public resolution tracking.",
        metrics: [
            { label: "Auto-Dispatch", value: "Instant Routing" },
            { label: "Auditing", value: "Proof of Work" },
            { label: "Public Portal", value: "Transparent Feed" }
        ],
        codeSnippet: `[COMMAND]  :: ALERT DISPATCHED -> DEPT: JAL NIGAM\n[DISPATCH] :: COMPLIANCE PDF GENERATED #JN-98124\n[STATUS]   :: ESCALATED -> PENDING PROOF OF WORK VERIFICATION`
    }
];

const IntelligencePipeline = () => {
    const [activeStep, setActiveStep] = useState(0);
    const current = PIPELINE_STEPS[activeStep];

    return (
        <section className="pipeline-section" id="pipeline">
            <div className="pipeline-inner">
                {/* Editorial Section Header */}
                <div className="pipeline-header">
                    <div className="mn-tag-row">
                        <span className="mn-badge">INTELLIGENCE // PIPELINE</span>
                        <span className="mn-badge-secondary">[ 4 CONTINUOUS STAGES ]</span>
                    </div>
                    <h2 className="pipeline-title">
                        The Autonomous <span>Intelligence Cycle</span>
                    </h2>
                    <p className="pipeline-subtitle">
                        From unstructured citizen signals to verified governance action in seconds.
                    </p>
                </div>

                {/* Step Selector Pills */}
                <div className="pipeline-stepper-nav">
                    {PIPELINE_STEPS.map((step, idx) => (
                        <button
                            key={step.id}
                            type="button"
                            className={`pipeline-nav-btn ${activeStep === idx ? 'active' : ''}`}
                            onClick={() => setActiveStep(idx)}
                        >
                            <span className="step-num">{step.stepNumber} //</span>
                            <span className="step-text">{step.name}</span>
                            {activeStep === idx && (
                                <motion.div 
                                    className="nav-active-pill" 
                                    layoutId="pipelineActiveIndicator" 
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Active Step Showcase Card */}
                <div className="pipeline-showcase-grid">
                    {/* Left: Step Explainer */}
                    <div className="pipeline-left-card">
                        <div className="step-tag-row">
                            <span className="step-tag-pill">{current.tag}</span>
                            <span className="mn-step-indicator">STAGE {current.stepNumber} OF 04</span>
                        </div>

                        <h3 className="step-main-title">{current.title}</h3>
                        <p className="step-main-desc">{current.summary}</p>

                        <div className="step-stats-grid">
                            {current.metrics.map((m, i) => (
                                <div key={i} className="step-stat-item">
                                    <span className="stat-label">{m.label}</span>
                                    <span className="stat-value">{m.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pipeline-nav-actions">
                            <button 
                                className="pipe-ctrl-btn" 
                                disabled={activeStep === 0}
                                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                            >
                                Previous Stage
                            </button>
                            <button 
                                className="pipe-ctrl-btn next-btn"
                                onClick={() => setActiveStep(prev => (prev + 1) % PIPELINE_STEPS.length)}
                            >
                                {activeStep === 3 ? "Restart Cycle" : "Next Stage"} <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Live Simulated Console Telemetry */}
                    <div className="pipeline-right-terminal">
                        <div className="terminal-topbar">
                            <div className="term-dots">
                                <span className="dot dot-red" />
                                <span className="dot dot-yellow" />
                                <span className="dot dot-green" />
                            </div>
                            <span className="term-title">AI_PIPELINE_TELEMETRY // {current.name.toUpperCase()}</span>
                            <span className="term-status-live"><span className="blink-dot" /> LIVE</span>
                        </div>

                        <div className="terminal-body">
                            <pre className="terminal-code-block">
                                <code>{current.codeSnippet}</code>
                            </pre>

                            <div className="terminal-live-monitor">
                                <div className="monitor-row">
                                    <span>Latency: <strong className="text-accent">14ms</strong></span>
                                    <span>Throughput: <strong className="text-green">240 sig/s</strong></span>
                                    <span>Reliability: <strong className="text-blue">99.98%</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default IntelligencePipeline;
