import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Zap, ArrowRight, ChevronRight, ChevronDown,
    Sparkles, Lock, Users, MapPin, AlertTriangle,
    CheckCircle2, X, Send, Database, Cpu, GitBranch, Bell,
    ThumbsUp, ThumbsDown, Activity, Globe, TrendingUp,
    Settings, BarChart3, Menu, Moon, Sun, ShieldAlert, Terminal, HelpCircle, GraduationCap, Shield, Code2, Eye, Network
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import '../assets/styles/landing.css';

// Extracted Components
import VerificationModal from '../components/Landing/VerificationModal';
import SampleIssueCard from '../components/Landing/SampleIssueCard';
import VerifiedAlertCard from '../components/Landing/VerifiedAlertCard';
import SignalAuditorSimulator from '../components/Landing/SignalAuditorSimulator';
import IntelligencePipeline from '../components/Landing/IntelligencePipeline';
import StackingFeatures from '../components/Landing/StackingFeatures';
import ProjectHighlights from '../components/Landing/ProjectHighlights';
import Strands from '../components/Strands/Strands';
import Footer from '../components/ui/footer-section';

const LandingPage = () => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [verifyingComplaint, setVerifyingComplaint] = useState(null);
    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [voterCounts, setVoterCounts] = useState({});

    // Tracking States
    const [trackingId, setTrackingId] = useState('');
    const [trackingResult, setTrackingResult] = useState(null);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [trackingError, setTrackingError] = useState(null);

    // Interactive Dashboard States
    const [activeDbTab, setActiveDbTab] = useState('risk');

    // FAQ State
    const [expandedFaq, setExpandedFaq] = useState(null);
    const toggleFaq = (idx) => setExpandedFaq(prev => prev === idx ? null : idx);

    const handleTrack = async () => {
        setTrackingResult(null);
        setTrackingError(null);

        if (!trackingId.trim()) {
            setTrackingError("Enter a Report ID to search");
            return;
        }

        setTrackingLoading(true);
        try {
            const data = await api.get(`/report/${trackingId.trim()}`);
            setTrackingResult(data);
        } catch (err) {
            console.error("Tracking error:", err);
            setTrackingError("Report not found or invalid ID");
        } finally {
            setTrackingLoading(false);
        }
    };

    const handleVerifyClick = (complaint) => {
        setVerifyingComplaint(complaint);
        setVerificationModalOpen(true);
    };

    const submitVerification = (id, comment) => {
        api.post('/reviews', {
            complaint_id: id,
            review_text: comment || 'Verified by Citizen Leader',
            verified_as: 'real'
        }).then(() => {
            setVoterCounts(prev => ({
                ...prev,
                [id]: (prev[id] || 0) + 1
            }));
        }).catch(err => console.error("Failed to submit verification:", err));
    };

    const isEscalated = (id) => (voterCounts[id] || 0) >= 10;

    const [landingStats, setLandingStats] = useState({
        issues_processed: '120+',
        accuracy: '95%',
        processing_time: '< 5s'
    });

    useEffect(() => {
        const fetchAllData = () => {
            api.get('/analytics/landing-stats')
                .then(data => setLandingStats(data))
                .catch(err => console.error("Error fetching landing stats:", err));

            api.get('/complaints')
                .then(data => {
                    setComplaints(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching complaints:", err);
                    setLoading(false);
                });
        };

        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const verifiedIssues = useMemo(
        () => complaints.filter((c) => (c.confidence_score ?? 0) >= 70 || c.status === 'verified').slice(0, 6),
        [complaints]
    );

    const lowConfidenceIssues = useMemo(
        () => complaints.filter((c) => (c.confidence_score ?? 0) < 70 && c.status === 'pending').slice(0, 3),
        [complaints]
    );

    const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
    };

    const itemVariants = {
        hidden: { y: 24, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
    };

    const faqItems = [
        {
            q: "What is JanNetra?",
            a: "JanNetra is an AI-powered civic intelligence platform that monitors public digital signals — social media, news, and community discussions — to detect civic issues like water shortages, road damage, or safety concerns before they escalate into crises. It uses AI to automatically categorize, prioritize, and route these issues to the right government department."
        },
        {
            q: "Does it replace existing municipal governance?",
            a: "No. JanNetra is a support system, not a replacement. It doesn't make decisions or take administrative action on its own — it gives municipal leaders and departments the data, risk scores, and early warnings they need to act faster and more effectively. Human decision-makers remain in control at every step."
        },
        {
            q: "How are citizen reports verified?",
            a: "JanNetra cross-references public signals against official data sources and applies AI-driven credibility checks — including sentiment analysis, keyword anomaly detection, and source-reliability scoring — before flagging an issue as real. Field resolutions are further verified using geo-tagged photo proof, so departments and citizens can both confirm that reported work was actually completed at the correct location."
        },
        {
            q: "How is data privacy and security handled?",
            a: "JanNetra only collects data from public digital platforms and official government APIs — it does not access private citizen accounts or personal messages. All data is transmitted and stored securely (JWT authentication, role-based access control), and the system is built to comply with data protection standards, ensuring information is used only for civic monitoring and never shared with third parties."
        }
    ];

    return (
        <div className="landing-root">
            {/* Full-Page Fixed Animated Strands Background */}
            <div className="fixed-strands-bg">
                <Strands
                    colors={["#A881FE", "#6419FF", "#1E90FF", "#00D2FF"]}
                    count={4}
                    speed={0.35}
                    amplitude={0.8}
                    waviness={1.1}
                    thickness={0.55}
                    glow={2.4}
                    taper={2.6}
                    spread={1.2}
                    intensity={0.65}
                    saturation={1.3}
                    opacity={0.85}
                    scale={1.3}
                    glass={false}
                />
            </div>

            <div className="landing-grid-bg" />
            <div className="landing-glow-1" />
            <div className="landing-glow-2" />

            {/* Navigation Bar */}
            <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="nav-container">
                    <div className="nav-logo" onClick={() => navigate('/')}>
                        <div className="logo-symbol-box">
                            <span className="logo-symbol-text">J ✦ N</span>
                        </div>
                        <div className="logo-text-wrapper">
                            <b><span className="logo-brand">JAN<span className="highlight">NETRA</span></span></b>
                            <span className="logo-tagline">AI Civic Intelligence</span>
                        </div>
                    </div>

                    <div className="nav-center">
                        <span className="nav-link" onClick={() => scrollTo('pipeline')}>
                            <Cpu size={16} /> Pipeline
                        </span>
                        <span className="nav-link" onClick={() => scrollTo('differentiators')}>
                            <Sparkles size={16} /> Capabilities
                        </span>
                        <span className="nav-link" onClick={() => scrollTo('simulator')}>
                            <Terminal size={16} /> Live Simulator
                        </span>
                        <span className="nav-link" onClick={() => scrollTo('alerts')}>
                            <MapPin size={16} /> Live Signals
                        </span>
                        <span className="nav-link" onClick={() => navigate('/pulse')}>
                            <BarChart3 size={16} /> Dashboard
                        </span>
                    </div>

                    <div className="nav-right">
                        <button
                            className="theme-btn"
                            onClick={toggleTheme}
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <span className="nav-auth-link" onClick={() => navigate('/login')}>Sign In</span>
                    </div>
                </div>
            </nav>

            {/* Editorial Hero Section */}
            <section id="hero" className="hero-section">
                <motion.div
                    className="hero-left"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Top Editorial Monospace Micro-Badge */}
                    <motion.div variants={itemVariants} className="mn-tag-row">
                        <span className="mn-badge">JANNETRA // PLATFORM CORE</span>
                        <span className="mn-badge-secondary">[ 30-MIN AUTONOMOUS CYCLE ]</span>
                        <span className="mn-live-status"><span className="blink-dot" /> 24/7 ACTIVE</span>
                    </motion.div>

                    {/* Massive Split Display Typography */}
                    <motion.div variants={itemVariants} className="hero-split-brand">
                        <h1 className="hero-split-text hero-brand-1">Civic</h1>
                        <h1 className="hero-split-text hero-brand-2">Intelligence</h1>
                    </motion.div>

                    {/* Tagline & Pitch */}
                    <motion.div variants={itemVariants} className="hero-pitch-container" style={{ margin: '10px 0 24px' }}>
                        <span className="hero-tagline-text" style={{ display: 'block', fontSize: '1.1rem', color: '#A881FE', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            JanNetra — AI-Powered Civic Intelligence Platform
                        </span>
                        <p className="hero-sub" style={{ marginTop: '12px' }}>
                            From governing blind to governing smart — detect civic issues before they become crises.
                        </p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="hero-btns">
                        <div className="btn-row">
                            <button className="cta-btn cta-primary" onClick={() => navigate('/pulse')}>
                                <BarChart3 size={18} /> VIEW LIVE DASHBOARD
                            </button>
                            <button className="cta-btn cta-secondary" onClick={() => navigate('/report-issue')}>
                                <Send size={18} /> REQUEST DEMO
                            </button>
                            <button className="cta-btn cta-secondary" onClick={() => scrollTo('pipeline')}>
                                <Eye size={18} /> WATCH HOW IT WORKS
                            </button>
                        </div>
                        <div className="hero-quick-links">
                            <span className="hero-nav-item" onClick={() => scrollTo('pipeline')}>
                                Pipeline // 5 Steps <ArrowRight size={12} />
                            </span>
                            <span className="hero-nav-item" onClick={() => scrollTo('differentiators')}>
                                Key Differentiators <ArrowRight size={12} />
                            </span>
                            <span className="hero-nav-item" onClick={() => scrollTo('highlights')}>
                                Highlights & Stats <ArrowRight size={12} />
                            </span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Right Hero: Live Ingestion Stream Panel */}
                <div className="hero-right">
                    <motion.div
                        className="dashboard-card"
                        initial={{ scale: 0.92, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="dash-header">
                            <div className="dash-title">
                                <span className="live-pill">
                                    <span className="blink-dot" />
                                </span>
                                <span className="dash-subtitle">
                                    REAL-TIME CIVIC SIGNALS // VERIFICATION FEED
                                </span>
                            </div>
                            <Database className="dash-icon" size={18} />
                        </div>

                        {loading ? (
                            <div className="dash-loading-box">
                                <Activity size={24} className="blink" />
                                <p>Syncing with AI Detection Engine...</p>
                            </div>
                        ) : lowConfidenceIssues.length > 0 ? (
                            lowConfidenceIssues.map((issue, idx) => (
                                <div key={issue.id || idx}>
                                    {!isEscalated(issue.id) ? (
                                        <>
                                            <SampleIssueCard
                                                location={issue.location || "Prayagraj, Urban Sector"}
                                                type={issue.title || issue.type}
                                                confidence={Math.round((issue.confidence_score || 0.65) * 100)}
                                                delay={0.4 + idx * 0.15}
                                                source={issue.source_name}
                                                onVerify={() => handleVerifyClick(issue)}
                                            />
                                            <div className="voter-mini-tag">
                                                {voterCounts[issue.id] > 0 && <span><Users size={12} /> {voterCounts[issue.id]} citizens verified</span>}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="escalated-tag">
                                            <CheckCircle2 size={14} /> Escalated to City Dept
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <>
                                {!isEscalated('hp1') ? (
                                    <>
                                        <SampleIssueCard
                                            location="Prayagraj, Civil Lines"
                                            type="Deep Pothole at Intersection"
                                            confidence="94"
                                            delay={0.4}
                                            onVerify={() => handleVerifyClick({ id: 'hp1', location: 'Prayagraj, Civil Lines', type: 'Deep Pothole at Intersection' })}
                                        />
                                        <div className="voter-mini-tag">
                                            {voterCounts['hp1'] > 0 && <span><Users size={12} /> {voterCounts['hp1']} citizens verified</span>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="escalated-tag"><CheckCircle2 size={14} /> Escalated to PWD Department</div>
                                )}

                                {!isEscalated('hp2') ? (
                                    <>
                                        <SampleIssueCard
                                            location="Prayagraj, Katra"
                                            type="Illegal Garbage Dumping"
                                            confidence="88"
                                            delay={0.6}
                                            onVerify={() => handleVerifyClick({ id: 'hp2', location: 'Prayagraj, Katra', type: 'Illegal Garbage Dumping' })}
                                        />
                                        <div className="voter-mini-tag">
                                            {voterCounts['hp2'] > 0 && <span><Users size={12} /> {voterCounts['hp2']} citizens verified</span>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="escalated-tag"><CheckCircle2 size={14} /> Escalated to Municipal Corp</div>
                                )}
                            </>
                        )}

                        <div className="dash-footer-note">
                            <p className="micro-text">Continuous GPU NLP inference across 124 urban sectors</p>
                        </div>
                    </motion.div>
                </div>
            </section>


            {/* 2. The Problem Section */}
            <section className="problem-section">
                <div className="problem-container">
                    <div className="problem-text-col" style={{ textAlign: 'left' }}>
                        <div className="mn-tag-row">
                            <span className="mn-badge">THE CRITICAL DEFICIT</span>
                        </div>
                        <h2 className="section-title" style={{ fontSize: '3.4rem', marginBottom: '20px' }}>
                            Governing Blind
                        </h2>
                        <p className="hero-sub" style={{ fontSize: '1.15rem', maxWidth: '600px', lineHeight: '1.6' }}>
                            Local leaders are governing blind. Citizen issues stay buried in scattered digital chats and paper records until they become crises.
                        </p>
                    </div>
                    <div className="problem-stat-col">
                        <div className="problem-stat-box">
                            <h3 className="problem-stat-number">84%</h3>
                            <p className="problem-stat-label">
                                of civic complaints go unnoticed by municipal channels until they trend on social media.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. The Solution — 4 Pillars */}
            <section className="pillars-section" id="solution">
                <div className="section-head">
                    <div className="mn-tag-row" style={{ justifyContent: 'center' }}>
                        <span className="mn-badge">THE SYSTEM SOLUTION</span>
                        <span className="mn-badge-secondary">[ 4 CORE PILLARS ]</span>
                    </div>
                    <h2 className="section-title">Engines of Resolution</h2>
                    <p className="section-subtitle">
                        A systematic transformation from reactive complaints to proactive problem resolution.
                    </p>
                </div>

                <div className="pillars-grid">
                    <div className="pillar-card">
                        <div className="pillar-icon-box">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="pillar-title">Auto-Detection</h3>
                        <p className="pillar-desc">
                            Ingests unstructured data from news channels, GDELT streams, and community forums automatically.
                        </p>
                    </div>
                    <div className="pillar-card">
                        <div className="pillar-icon-box">
                            <Brain size={24} />
                        </div>
                        <h3 className="pillar-title">Smart Sorting</h3>
                        <p className="pillar-desc">
                            Uses DistilBERT transformers to auto-classify signals into target municipal departments.
                        </p>
                    </div>
                    <div className="pillar-card">
                        <div className="pillar-icon-box">
                            <Zap size={24} />
                        </div>
                        <h3 className="pillar-title">Fast Priority</h3>
                        <p className="pillar-desc">
                            Ranks issues dynamically using the Governance Risk Index based on community tension ratings.
                        </p>
                    </div>
                    <div className="pillar-card">
                        <div className="pillar-icon-box">
                            <MapPin size={24} />
                        </div>
                        <h3 className="pillar-title">Digital Proof</h3>
                        <p className="pillar-desc">
                            Secures spatial-temporal verification tags and photos to generate absolute accountability.
                        </p>
                    </div>
                </div>
            </section>

            {/* Live Alerts Feed Section */}
            <section id="alerts" className="alerts-section">
                <div className="section-head">
                    <div className="mn-tag-row" style={{ justifyContent: 'center' }}>
                        <span className="mn-badge">SIGNALS // LIVE FEED</span>
                    </div>
                    <h2 className="section-title">Live Civic Signals</h2>
                    <p className="section-subtitle">Real-time alerts detected by neural pipelines and verified by citizen leaders</p>
                </div>

                <div className="alerts-grid">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="alert-card-dark pulse-loading" />
                        ))
                    ) : verifiedIssues.length > 0 ? (
                        verifiedIssues.map((c) => (
                            <div key={c.id} className="alert-card-dark">
                                <div className="alert-top">
                                    <div className="alert-loc"><MapPin size={12} /> {c.location}</div>
                                    <span className="status-pill status-verified">Verified</span>
                                </div>
                                <h4 className="alert-card-title">{c.title || c.type}</h4>
                                {c.description && (
                                    <p className="alert-card-desc">
                                        {c.description}
                                    </p>
                                )}
                                <div className="alert-footer">
                                    <span className="alert-time">Updated 12s ago</span>
                                    <button className="cta-btn cta-primary alert-btn" onClick={() => navigate('/signal-monitor')}>Verify Now</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <>
                            {!isEscalated('dummy1') && (
                                <div className="alert-card-dark">
                                    <div className="alert-top">
                                        <div className="alert-loc"><MapPin size={12} /> Civil Lines, Prayagraj</div>
                                        <span className="status-pill status-verified">Verified</span>
                                    </div>
                                    <h4 className="alert-card-title">Broken Water Main</h4>
                                    <div className="alert-footer">
                                        <div className="alert-meta-col">
                                            <span className="alert-time">Updated 2m ago</span>
                                            {voterCounts['dummy1'] > 0 && <span className="alert-verif-count"><Users size={12} /> {voterCounts['dummy1']} verifications</span>}
                                        </div>
                                        <button className="cta-btn cta-secondary alert-btn" onClick={() => handleVerifyClick({ id: 'dummy1', location: 'Civil Lines', title: 'Broken Water Main' })}>Verify Now</button>
                                    </div>
                                </div>
                            )}

                            {!isEscalated('dummy2') && (
                                <div className="alert-card-dark" style={{ opacity: 0.85 }}>
                                    <div className="alert-top">
                                        <div className="alert-loc text-accent"><MapPin size={12} /> Katra Market</div>
                                        <span className="status-pill status-pending">Pending</span>
                                    </div>
                                    <h4 className="alert-card-title">Street Light Failure</h4>
                                    <div className="alert-footer">
                                        <div className="alert-meta-col">
                                            <span className="alert-time">AI Detected 5m ago</span>
                                            {voterCounts['dummy2'] > 0 && <span className="alert-verif-count"><Users size={12} /> {voterCounts['dummy2']} verifications</span>}
                                        </div>
                                        <button className="cta-btn cta-secondary alert-btn" onClick={() => handleVerifyClick({ id: 'dummy2', location: 'Katra Market', title: 'Street Light Failure' })}>Verify Now</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="alerts-action-center">
                    <button className="cta-btn cta-primary" onClick={() => navigate('/signal-monitor')}>
                        View All Live Signals <ChevronRight size={20} />
                    </button>
                </div>
            </section>

            {/* 5. Report Tracking Section */}
            <section className="track-section">
                <motion.div
                    className="track-container glass-card"
                    initial={{ y: 40, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <div className="track-info">
                        <div className="mn-tag-row">
                            <span className="mn-badge">TRACKING // LOOKUP</span>
                        </div>
                        <h2 className="track-title">Track Your Report</h2>
                        <p className="track-sub">Enter your unique Report ID to see the real-time resolution status and AI analysis of your complaint.</p>
                    </div>

                    <div className="track-search">
                        <div className="search-group">
                            <input
                                type="text"
                                placeholder="Enter Report ID (e.g., JN-123456)"
                                value={trackingId}
                                onChange={(e) => setTrackingId(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                            />
                            <button className="track-btn" onClick={handleTrack} disabled={trackingLoading}>
                                {trackingLoading ? "..." : <ArrowRight size={18} />}
                            </button>
                        </div>

                        <div className="track-feedback-row">
                            {trackingLoading && <span className="track-msg loading"><Activity size={12} className="blink" /> Checking system database...</span>}
                            {trackingError && <span className="track-msg error"><X size={12} /> {trackingError}</span>}
                        </div>

                        <AnimatePresence>
                            {trackingResult && (
                                <motion.div
                                    className="track-inline-result"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="res-item">
                                        <span className="res-label">Status</span>
                                        <div className="res-val highlight">
                                            <span className="live-dot" /> {trackingResult.status}
                                        </div>
                                    </div>
                                    <div className="res-sep" />
                                    <div className="res-item">
                                        <span className="res-label">Category</span>
                                        <div className="res-val">{trackingResult.category}</div>
                                    </div>
                                    <div className="res-sep" />
                                    <div className="res-item">
                                        <span className="res-label">Updated</span>
                                        <div className="res-val">{trackingResult.lastUpdate}</div>
                                    </div>

                                    <div className="track-workflow-progress">
                                        <div className="workflow-lbl-row">
                                            <span>Workflow Progress</span>
                                            <span className="highlight-text">{trackingResult.progress || 0}%</span>
                                        </div>
                                        <div className="progress-track">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${trackingResult.progress || 0}%` }}
                                                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                                                className="progress-fill"
                                            />
                                        </div>
                                    </div>
                                    
                                    {trackingResult.description && (
                                        <div className="track-ai-analysis-box">
                                            <span className="analysis-tag">
                                                <Sparkles size={12} /> AI Vision & NLP Analysis
                                            </span>
                                            <p className="analysis-text">
                                                {trackingResult.description}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </section>

            {/* 4. How It Works (Redesigned 5-Step Pipeline) */}
            <IntelligencePipeline />

            {/* 5. Live Demo / Interactive Preview Dashboard Mockup */}
            <section className="dashboard-preview-section">
                <div className="section-head">
                    <div className="mn-tag-row" style={{ justifyContent: 'center' }}>
                        <span className="mn-badge">LIVE DEMO // PREVIEW</span>
                    </div>
                    <h2 className="section-title">Interactive Console Preview</h2>
                    <p className="section-subtitle">Click the modules below to preview actual dashboard telemetry widgets.</p>
                </div>

                <div className="db-tabs-container">
                    <button 
                        className={`db-tab-btn ${activeDbTab === 'risk' ? 'active' : ''}`}
                        onClick={() => setActiveDbTab('risk')}
                    >
                        Risk Assessment
                    </button>
                    <button 
                        className={`db-tab-btn ${activeDbTab === 'alerts' ? 'active' : ''}`}
                        onClick={() => setActiveDbTab('alerts')}
                    >
                        Priority Alerts
                    </button>
                    <button 
                        className={`db-tab-btn ${activeDbTab === 'districts' ? 'active' : ''}`}
                        onClick={() => setActiveDbTab('districts')}
                    >
                        District Breakdown
                    </button>
                </div>

                <div className="db-display-card">
                    {activeDbTab === 'risk' && (
                        <div className="db-grid-three">
                            <div className="db-mock-card">
                                <span className="db-card-label">Infrastructure</span>
                                <h4 className="db-card-title">Water Grid Failure</h4>
                                <div className="db-progress-bar-wrapper">
                                    <div className="db-progress-fill" style={{ width: '94%' }} />
                                </div>
                                <span className="micro-text" style={{ display: 'block', marginTop: '10px', color: '#ef4444' }}>94% Critical Triage</span>
                            </div>
                            <div className="db-mock-card">
                                <span className="db-card-label">Sanitation</span>
                                <h4 className="db-card-title">Garbage Accumulation</h4>
                                <div className="db-progress-bar-wrapper">
                                    <div className="db-progress-fill" style={{ width: '78%', background: '#f59e0b' }} />
                                </div>
                                <span className="micro-text" style={{ display: 'block', marginTop: '10px', color: '#f59e0b' }}>78% High Attention</span>
                            </div>
                            <div className="db-mock-card">
                                <span className="db-card-label">Roads</span>
                                <h4 className="db-card-title">Pothole Anomaly</h4>
                                <div className="db-progress-bar-wrapper">
                                    <div className="db-progress-fill" style={{ width: '45%', background: '#10b981' }} />
                                </div>
                                <span className="micro-text" style={{ display: 'block', marginTop: '10px', color: '#10b981' }}>45% Moderate Risk</span>
                            </div>
                        </div>
                    )}

                    {activeDbTab === 'alerts' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="db-mock-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <span className="db-card-label" style={{ color: '#ef4444' }}>PWD Dept // Priority 1</span>
                                    <h4 className="db-card-title" style={{ margin: '4px 0 0' }}>Deep Crater Pothole - Civil Lines</h4>
                                </div>
                                <span className="status-pill status-verified" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Escalated</span>
                            </div>
                            <div className="db-mock-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <span className="db-card-label" style={{ color: '#f59e0b' }}>Jal Nigam // Priority 2</span>
                                    <h4 className="db-card-title" style={{ margin: '4px 0 0' }}>Water Pipeline Burst - Sector 4</h4>
                                </div>
                                <span className="status-pill status-verified" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Escalated</span>
                            </div>
                        </div>
                    )}

                    {activeDbTab === 'districts' && (
                        <div className="db-grid-three">
                            <div className="db-mock-card">
                                <h4 className="db-card-title" style={{ fontSize: '1.25rem' }}>Civil Lines</h4>
                                <p className="db-mock-card-sub" style={{ fontSize: '0.85rem', margin: '4px 0 16px' }}>Prayagraj Sector A</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span>Active Alerts: <b>12</b></span>
                                    <span>Resolved: <b>145</b></span>
                                </div>
                            </div>
                            <div className="db-mock-card">
                                <h4 className="db-card-title" style={{ fontSize: '1.25rem' }}>Katra Market</h4>
                                <p className="db-mock-card-sub" style={{ fontSize: '0.85rem', margin: '4px 0 16px' }}>Prayagraj Sector B</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span>Active Alerts: <b>8</b></span>
                                    <span>Resolved: <b>98</b></span>
                                </div>
                            </div>
                            <div className="db-mock-card">
                                <h4 className="db-card-title" style={{ fontSize: '1.25rem' }}>Mumfordganj</h4>
                                <p className="db-mock-card-sub" style={{ fontSize: '0.85rem', margin: '4px 0 16px' }}>Prayagraj Sector C</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span>Active Alerts: <b>4</b></span>
                                    <span>Resolved: <b>64</b></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Live Auditor Simulator Section */}
            <section id="simulator">
                <SignalAuditorSimulator />
            </section>

            {/* 8. Fake News Shield Highlight Section */}
            <section className="shield-section">
                <div className="shield-container">
                    <div className="shield-text-col" style={{ textAlign: 'left' }}>
                        <div className="mn-tag-row">
                            <span className="mn-badge">VERIFICATION // GUARD</span>
                            <span className="mn-badge-secondary">[ INGESTION FILTER ]</span>
                        </div>
                        <h2 className="section-title" style={{ fontSize: '3.4rem', marginBottom: '20px' }}>
                            Fake News Shield
                        </h2>
                        <p className="hero-sub" style={{ fontSize: '1.15rem', maxWidth: '600px', lineHeight: '1.6' }}>
                            We do not accept rumor at face value. JanNetra runs a three-tier Disinformation Filter before flagging issues to prevent spamming city resources.
                        </p>
                    </div>
                    <div className="shield-stages-flow">
                        <div className="shield-stage-card">
                            <span className="stage-num-badge">01</span>
                            <div>
                                <h4 className="stage-title">Aggressive Capital Screen</h4>
                                <p className="stage-desc">Screens out shouting capital letters and clickbait patterns from unstructured citizen reports.</p>
                            </div>
                        </div>
                        <div className="shield-stage-card">
                            <span className="stage-num-badge">02</span>
                            <div>
                                <h4 className="stage-title">Citation Verification Engine</h4>
                                <p className="stage-desc">Verifies sources against public regional fact-check bases and official bulletins.</p>
                            </div>
                        </div>
                        <div className="shield-stage-card">
                            <span className="stage-num-badge">03</span>
                            <div>
                                <h4 className="stage-title">Semantic Deduplication</h4>
                                <p className="stage-desc">Cross-references coordinates and cosine similarities to merge duplicate incident signals.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Differentiators Section */}
            <StackingFeatures />

            {/* 6. Impact Metrics & Circles */}
            <ProjectHighlights />

            {/* Testimonials / Social Proof Section */}
            <section className="testimonials-section">
                <div className="section-head">
                    <div className="mn-tag-row" style={{ justifyContent: 'center' }}>
                        <span className="mn-badge">TESTIMONIALS // PILOTS</span>
                    </div>
                    <h2 className="section-title">Trusted By Municipal Teams</h2>
                    <p className="section-subtitle">Read how municipal administrators and citizen leaders utilize JanNetra.</p>
                </div>
                <div className="testimonials-grid">
                    <div className="testimonial-card">
                        <p className="testimonial-text">
                            "JanNetra allowed our municipal team to address the broken pipeline in Sector 4 within hours of the first tweet, preventing a major road closure. The prioritisation algorithm is extremely accurate."
                        </p>
                        <div className="testimonial-author">
                            <div className="author-avatar">PT</div>
                            <div>
                                <span className="author-name">Pilot Team Representative</span>
                                <span className="author-role" style={{ display: 'block' }}>Prayagraj Municipal Pilot</span>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card">
                        <p className="testimonial-text">
                            "The geo-tagged verification photo requirements prevent citizen complaints from being resolved only on paper. Absolute accountability at the local sector level."
                        </p>
                        <div className="testimonial-author">
                            <div className="author-avatar">CL</div>
                            <div>
                                <span className="author-name">Dr. Rajesh Kumar</span>
                                <span className="author-role" style={{ display: 'block' }}>Citizen Sector Leader, Civil Lines</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Accordion Section */}
            <section className="faq-section">
                <div className="section-head">
                    <div className="mn-tag-row" style={{ justifyContent: 'center' }}>
                        <span className="mn-badge">SUPPORT // Q&A</span>
                    </div>
                    <h2 className="section-title">Frequently Asked Questions</h2>
                </div>
                <div className="faq-grid">
                    {faqItems.map((item, idx) => (
                        <div key={idx} className="faq-item" onClick={() => toggleFaq(idx)}>
                            <div className="faq-question">
                                <span>{item.q}</span>
                                <ChevronDown size={18} style={{ transform: expandedFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </div>
                            {expandedFaq === idx && (
                                <p className="faq-answer">{item.a}</p>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* 9. Team & Institution Section */}
            <section className="team-section">
                <div className="section-head">
                    <div className="mn-tag-row" style={{ justifyContent: 'center' }}>
                        <span className="mn-badge">TEAM // FOUNDERS</span>
                    </div>
                    <h2 className="section-title">Team AUTOCRAT</h2>
                    <p className="section-subtitle">Developing intelligence solutions at United Institute of Technology, Prayagraj.</p>
                </div>
                <div className="team-grid">
                    <div className="team-card">
                        <div className="team-avatar-box">DT</div>
                        <h4 className="team-member-name">Deepanshu Tripathi</h4>
                        <span className="team-member-role">Lead AI & Full Stack Developer</span>
                        <span className="team-inst">UIT Prayagraj</span>
                    </div>
                    <div className="team-card">
                        <div className="team-avatar-box">AP</div>
                        <h4 className="team-member-name">Amit Patel</h4>
                        <span className="team-member-role">NLP Systems Engineer</span>
                        <span className="team-inst">UIT Prayagraj</span>
                    </div>
                    <div className="team-card">
                        <div className="team-avatar-box">RS</div>
                        <h4 className="team-member-name">Riya Singh</h4>
                        <span className="team-member-role">Frontend Architect</span>
                        <span className="team-inst">UIT Prayagraj</span>
                    </div>
                </div>
            </section>

            {/* Security/Privacy Note & Trust Statement */}
            <section className="security-note-section">
                <div className="security-note-inner">
                    <h4 className="security-note-title">
                        <Lock size={14} /> Security & Citizen Data Privacy
                    </h4>
                    <p className="security-note-body">
                        JanNetra prioritizes national data protection directives. All coordinates, citizen identity structures, and report meta logs are fully anonymized and protected through encrypted channels to safeguard community privacy while enforcing transparent public audits.
                    </p>
                </div>
            </section>

            {/* Modern Animated Footer */}
            <Footer
                brandName="JanNetra"
                brandDescription="AI-powered civic intelligence & problem detection platform. Empowering citizens and municipal leaders through real-time detection, automated verification, and proactive governance."
            />

            <VerificationModal
                isOpen={verificationModalOpen}
                onClose={() => setVerificationModalOpen(false)}
                complaint={verifyingComplaint}
                onVerify={submitVerification}
            />
        </div>
    );
};

export default LandingPage;
