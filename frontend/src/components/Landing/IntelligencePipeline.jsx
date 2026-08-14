import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Cpu, Brain, GitBranch, CheckCircle2, ShieldCheck, Activity, ArrowRight, Zap, Eye, Share2, ClipboardCheck, Network } from 'lucide-react';

const PIPELINE_STEPS = [
    {
        id: "step-1",
        stepNumber: "01",
        name: "Collect",
        tag: "Ingestion Core",
        title: "Step 1 // Multi-Source Intake",
        summary: "Scrapes unstructured feeds from 150+ news portals, the GDELT event registry, citizen WhatsApp/Telegram reports, and local channels every 30 minutes.",
        metrics: [
            { label: "Feeds Monitored", value: "150+ Outlets" },
            { label: "Refresh Loop", value: "30-Min Cycle" },
            { label: "Data Hashing", value: "SHA-256 Verified" }
        ],
        codeSnippet: `[SENTINEL] :: INGESTING :: CIVIC-FEEDS -> 15 INCOMING SIGNALS\n[SENTINEL] :: INGESTING :: SOCIAL-TELEGRAM -> 9 CHAT REPORTS\n[SECURITY] :: INTEGRITY CHECK -> HASH AUTHENTICATED`
    },
    {
        id: "step-2",
        stepNumber: "02",
        name: "Detect",
        tag: "AI NLP Engine",
        title: "Step 2 // DistilBERT Sentiment & Anger Analysis",
        summary: "Applies real-time GPU NLP processing to evaluate sentiment polarity, compute calibrated public anger intensity (0-10), and screen fake news clickbait.",
        metrics: [
            { label: "Model Architecture", value: "DistilBERT GPU" },
            { label: "Anger Calibrator", value: "0.0 - 10.0 Rating" },
            { label: "Classification Speed", value: "< 42ms / batch" }
        ],
        codeSnippet: `[NEURAL]   :: SENTIMENT SCORING -> { SCORE: -0.87 CRITICAL }\n[HEURISTIC]:: CALIBRATED ANGER -> { VALUE: 8.8/10 ESCALATED }\n[SHIELD]   :: SPAM/FAKE FILTER -> { TRUST: 96% AUTHENTIC }`
    },
    {
        id: "step-3",
        stepNumber: "03",
        name: "Prioritize",
        tag: "GRI Indexer",
        title: "Step 3 // Semantic Grouping & Risk Indexing",
        summary: "Groups individual citizen complaints into unified issue clusters using cosine similarity, calculating a weighted Governance Risk Index (GRI) to triage critical events.",
        metrics: [
            { label: "Clustering Model", value: "Cosine Similarity" },
            { label: "Urgency Rating", value: "Weighted Risk Index" },
            { label: "Deduplication", value: "Unified Clusters" }
        ],
        codeSnippet: `[CLUSTER]:: MATCHED -> CLUSTER-24B [DEEP WATER MAIN LEAK]\n[PRIORITY]:: COMPUTING GRI -> WEIGHTED SCORE: 94% (CRITICAL)\n[ROUTING] :: ASSIGNING COMPLIANCE ENVELOPE -> ZONE-4`
    },
    {
        id: "step-4",
        stepNumber: "04",
        name: "Assign",
        tag: "Escalation Hub",
        title: "Step 4 // Automated Department Routing",
        summary: "Instantly generates compliance tickets and dispatches encrypted alerts to target departments (PWD, Municipal Corp, Jal Nigam) based on class taxonomy.",
        metrics: [
            { label: "Routing Latency", value: "Instantaneous" },
            { label: "Encrypted Push", value: "Active Webhooks" },
            { label: "Notification", value: "Direct SMS / Email" }
        ],
        codeSnippet: `[COMMAND]  :: COMPLIANCE DIRECTIVE PUSHED -> DEPT: JAL NIGAM\n[DISPATCH] :: DIRECTIVE GENERATED -> #JN-98124\n[STATUS]   :: ESCALATED -> DEPT ACKNOWLEDGED`
    },
    {
        id: "step-5",
        stepNumber: "05",
        name: "Resolve",
        tag: "Proof-Of-Work",
        title: "Step 5 // Verifiable Resolution",
        summary: "Closes the loop by requiring geo-tagged photo uploads and cryptographic verification from citizen leaders before marking the issue resolved.",
        metrics: [
            { label: "Audit Mechanism", value: "Proof of Work" },
            { label: "Geotag Validation", value: "GPS Locked" },
            { label: "Citizen Audit", value: "Unbounded Trust" }
        ],
        codeSnippet: `[RESOLVER] :: RESOLUTION PICTURE UPLOADED -> PARSING METADATA\n[GEOCHECK] :: LOCATION LOCKED -> Prayagraj Civil Lines [MATCHED]\n[SUCCESS]  :: VERIFIED BY CITIZENS -> CLOSING COMPLAINT #JN-98124`
    }
];

const IntelligencePipeline = () => {
    const [activeStep, setActiveStep] = useState(0);
    const current = PIPELINE_STEPS[activeStep];

    return (
        <section className="pipeline-section" id="pipeline">
            <div className="pipeline-inner">
                {/* Section Header */}
                <div className="pipeline-header">
                    <div className="mn-tag-row">
                        <span className="mn-badge">HOW IT WORKS // PIPELINE</span>
                        <span className="mn-badge-secondary">[ 5 ACTIVE STAGES ]</span>
                    </div>
                    <h2 className="pipeline-title">
                        The <span>Civic Intelligence Cycle</span>
                    </h2>
                    <p className="pipeline-subtitle">
                        Simplifying the process from raw citizen signal ingestion to verified resolution.
                    </p>
                </div>

                {/* Horizontal Workflow Flowchart (Visual Representation) */}
                <div className="workflow-flowchart-bar">
                    {PIPELINE_STEPS.map((step, idx) => (
                        <React.Fragment key={step.id}>
                            <div 
                                className={`flow-node ${activeStep === idx ? 'active' : ''} ${activeStep > idx ? 'completed' : ''}`}
                                onClick={() => setActiveStep(idx)}
                            >
                                <div className="flow-node-circle">
                                    {idx + 1}
                                </div>
                                <span className="flow-node-name">{step.name}</span>
                            </div>
                            {idx < PIPELINE_STEPS.length - 1 && (
                                <div className={`flow-connector ${activeStep > idx ? 'completed' : ''}`}>
                                    <div className="connector-line" />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step Selector Pills */}
                <div className="pipeline-stepper-nav" style={{ marginTop: '24px' }}>
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
                            <span className="mn-step-indicator">STAGE {current.stepNumber} OF 05</span>
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
                                {activeStep === 4 ? "Restart Cycle" : "Next Stage"} <ArrowRight size={16} />
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
                            <span className="term-title">TELEMETRY_LOG // {current.name.toUpperCase()}</span>
                            <span className="term-status-live"><span className="blink-dot" /> LIVE</span>
                        </div>

                        <div className="terminal-body">
                            <pre className="terminal-code-block">
                                <code>{current.codeSnippet}</code>
                            </pre>

                            <div className="terminal-live-monitor">
                                <div className="monitor-row">
                                    <span>Latency: <strong className="text-accent">14ms</strong></span>
                                    <span>Ingest Rate: <strong className="text-green">240 sig/s</strong></span>
                                    <span>Accuracy: <strong className="text-blue">95.4%</strong></span>
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
