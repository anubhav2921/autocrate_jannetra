import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Zap, ArrowRight, ChevronRight,
    Sparkles, Lock, Users, MapPin, AlertTriangle,
    CheckCircle2, X, Send, Database, Cpu, GitBranch, Bell,
    ThumbsUp, ThumbsDown, Activity, Globe, TrendingUp,
    Settings, BarChart3, Menu, Moon, Sun, ShieldAlert, Terminal
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import '../assets/styles/landing.css';

// Extracted & New DeepGreen-Inspired Components
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

            {/* Navigation Bar with DeepGreen-style Pill Layout */}
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
                        <button className="nav-cta-btn" onClick={() => navigate('/signup')}>
                            Get Started
                        </button>
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

                    <motion.p variants={itemVariants} className="hero-sub">
                        Autonomous AI that scrapes 150+ sources, measures public anger dynamics (0-10), filters misinformation, and dispatches verified civic alerts in real time.
                    </motion.p>

                    <motion.div variants={itemVariants} className="hero-btns">
                        <div className="btn-row">
                            <button className="cta-btn cta-primary" onClick={() => navigate('/report-issue')}>
                                REPORT CIVIC ISSUE <ArrowRight size={20} />
                            </button>
                            <button className="cta-btn cta-secondary" onClick={() => scrollTo('simulator')}>
                                <Terminal size={18} /> LAUNCH LIVE AUDITOR
                            </button>
                        </div>
                        <div className="hero-quick-links">
                            <span className="hero-nav-item" onClick={() => scrollTo('pipeline')}>
                                Pipeline // 4 Steps <ArrowRight size={12} />
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

            {/* 1. DeepGreen-Inspired Intelligence Pipeline [4 Steps] */}
            <IntelligencePipeline />

            {/* 2. DeepGreen-Inspired Live Signal Auditor Simulator */}
            <SignalAuditorSimulator />

            {/* 3. DeepGreen-Inspired Key Differentiators & Capabilities */}
            <StackingFeatures />

            {/* 4. DeepGreen-Inspired Project Highlights & Benchmarks */}
            <ProjectHighlights />

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

            {/* 6. Live Alerts Feed Section */}
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
