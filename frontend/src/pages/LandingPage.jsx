import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Zap, ArrowRight, ChevronRight,
    Sparkles, Lock, Users, MapPin, AlertTriangle,
    CheckCircle2, X, Send, Database, Cpu, GitBranch, Bell,
    ThumbsUp, ThumbsDown, Activity, Globe, TrendingUp,
    Settings, BarChart3, Menu, Moon, Sun
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import '../assets/styles/landing.css';

// Extracted Components
import VerificationModal from '../components/Landing/VerificationModal';
import SampleIssueCard from '../components/Landing/SampleIssueCard';
import VerifiedAlertCard from '../components/Landing/VerifiedAlertCard';

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
            // Real API Call
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
        // Persist to database
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
            // Stats
            api.get('/analytics/landing-stats')
                .then(data => setLandingStats(data))
                .catch(err => console.error("Error fetching landing stats:", err));

            // Complaints (for Live Monitor/Grid)
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
        const interval = setInterval(fetchAllData, 30000); // System-wide refresh every 30s
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
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <div className="landing-root">
            <div className="landing-grid-bg" />
            <div className="landing-glow-1" />
            <div className="landing-glow-2" />

            <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="nav-container">
                    <div className="nav-logo" onClick={() => navigate('/')}>
                        <div className="logo-text-wrapper">
                            <b> <span className="logo-brand">JAN<span className="highlight">NETRA</span></span></b>
                            <span className="logo-tagline">AI Civic Intelligence</span>
                        </div>
                    </div>

                    <div className="nav-center">
                        <span className="nav-link" onClick={() => scrollTo('how')}>
                            <Settings size={18} /> How It Works
                        </span>
                        <span className="nav-link" onClick={() => scrollTo('alerts')}>
                            <MapPin size={18} /> Live Issues
                        </span>
                        <span className="nav-link" onClick={() => navigate('/pulse')}>
                            <BarChart3 size={18} /> Dashboard
                        </span>
                    </div>

                    <div className="nav-right">
                        {/* Theme Toggle */}
                        <button
                            className="nav-link"
                            style={{ background: 'none', border: 'none', outline: 'none', cursor: 'pointer' }}
                            onClick={toggleTheme}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <span className="nav-auth-link" onClick={() => navigate('/login')}>Sign In</span>
                        <button className="nav-cta-btn" onClick={() => navigate('/signup')}>
                            Register
                        </button>
                    </div>
                </div>
            </nav>

            <section id="hero" className="hero-section">
                <motion.div
                    className="hero-left"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.div variants={itemVariants} className="hero-badge animate-in">
                        AI-Powered Governance Platform
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="hero-title">
                        AI That Detects Civic Problems <span style={{ color: 'var(--landing-accent)' }}>Before You Report Them</span>
                    </motion.h1>

                    <motion.p variants={itemVariants} className="hero-sub">
                        JanNetra uses real-time AI detection and community validation to identify, verify, and escalate urban issues instantly.
                    </motion.p>

                    <motion.div variants={itemVariants} className="hero-btns">
                        <div className="btn-row">
                            <button className="cta-btn cta-primary" style={{ width: '100%', maxWidth: '400px', padding: '18px 40px', fontSize: '1.1rem' }} onClick={() => navigate('/report-issue')}>
                                REPORT AN ISSUE <ArrowRight size={22} />
                            </button>
                        </div>
                        <div className="trust-signals">
                            <div className="trust-item"><div className="blink-dot" /> Scanning 120+ urban zones</div>
                            <div className="trust-item"><Activity size={14} /> 2,400+ issues detected</div>
                            <div className="trust-item"><Zap size={14} /> AI accuracy: 92%</div>
                        </div>
                    </motion.div>
                </motion.div>

                <div className="hero-right">
                    <motion.div
                        className="dashboard-card"
                        initial={{ scale: 0.9, opacity: 0, rotateY: -10 }}
                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    ><div className="dash-header">
                            <div className="dash-title">
                                <span className="live-pill">
                                    <span className="blink-dot" />
                                </span>
                                <span className="dash-subtitle">
                                    IDENTIFY ISSUES CONFIRM REALITY
                                </span>
                            </div>

                            <Database className="dash-icon" size={18} />
                        </div>

                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                <Activity size={24} className="blink" style={{ marginBottom: '12px' }} />
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
                                                delay={0.5 + idx * 0.2}
                                                source={issue.source_name}
                                                onVerify={() => handleVerifyClick(issue)}
                                            />
                                            <div className="voter-mini-tag" style={{ marginTop: '-12px', marginBottom: '16px', marginLeft: '20px' }}>
                                                {voterCounts[issue.id] > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--landing-accent)' }}><Users size={12} /> {voterCounts[issue.id]} citizens verified</span>}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="escalated-tag" style={{ marginBottom: '20px' }}>
                                            <CheckCircle2 size={14} /> Escalated to City Dept
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            /* Fallback to high-fidelity samples if DB is empty */
                            <>
                                {!isEscalated('hp1') ? (
                                    <>
                                        <SampleIssueCard
                                            location="Prayagraj, Civil Lines"
                                            type="Deep Pothole at Intersection"
                                            confidence="94"
                                            delay={0.5}
                                            onVerify={() => handleVerifyClick({ id: 'hp1', location: 'Prayagraj, Civil Lines', type: 'Deep Pothole at Intersection' })}
                                        />
                                        <div className="voter-mini-tag" style={{ marginTop: '-12px', marginBottom: '16px', marginLeft: '20px' }}>
                                            {voterCounts['hp1'] > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--landing-accent)' }}><Users size={12} /> {voterCounts['hp1']} citizens verified</span>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="escalated-tag" style={{ marginBottom: '20px' }}><CheckCircle2 size={14} /> Escalated to PWD Department</div>
                                )}

                                {!isEscalated('hp2') ? (
                                    <>
                                        <SampleIssueCard
                                            location="Prayagraj, Katra"
                                            type="Illegal Garbage Dumping"
                                            confidence="88"
                                            delay={0.7}
                                            onVerify={() => handleVerifyClick({ id: 'hp2', location: 'Prayagraj, Katra', type: 'Illegal Garbage Dumping' })}
                                        />
                                        <div className="voter-mini-tag" style={{ marginTop: '-12px', marginBottom: '16px', marginLeft: '20px' }}>
                                            {voterCounts['hp2'] > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--landing-accent)' }}><Users size={12} /> {voterCounts['hp2']} citizens verified</span>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="escalated-tag" style={{ marginBottom: '20px' }}><CheckCircle2 size={14} /> Escalated to Municipal Corp</div>
                                )}
                            </>
                        )}

                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <p className="micro-text" style={{ fontSize: '0.65rem' }}>AI continuously scanning 124 urban sectors</p>
                        </div>
                    </motion.div>

                    {/* Decorative element */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        right: '-20px',
                        width: '100px',
                        height: '100px',
                        background: 'radial-gradient(var(--landing-accent), transparent 70%)',
                        opacity: 0.2,
                        filter: 'blur(20px)',
                        zIndex: -1
                    }} />
                </div>
            </section>

            <section className="track-section">
                <motion.div
                    className="track-container glass-card"
                    initial={{ y: 40, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <div className="track-info">
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
                                {trackingLoading ? "..." : <><ArrowRight size={18} /></>}
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
                                    style={{ flexWrap: 'wrap', gap: '20px' }}
                                >
                                    <div className="res-item">
                                        <span className="res-label">Status</span>
                                        <div className="res-val highlight">
                                            <span className="live-dot" /> {trackingResult.status}
                                        </div>
                                    </div>
                                    <div className="res-sep" />
                                    <div className="res-item">
                                        <span className="res-label">Type</span>
                                        <div className="res-val">{trackingResult.category}</div>
                                    </div>
                                    <div className="res-sep" />
                                    <div className="res-item">
                                        <span className="res-label">Updated</span>
                                        <div className="res-val">{trackingResult.lastUpdate}</div>
                                    </div>

                                    {/* Workflow Progress Bar */}
                                    <div style={{ width: '100%', marginTop: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Workflow Progress</span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--landing-accent)', fontWeight: 800 }}>{trackingResult.progress || 0}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${trackingResult.progress || 0}%` }}
                                                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                                                style={{ height: '100%', background: 'linear-gradient(90deg, var(--landing-accent), var(--landing-purple))', borderRadius: '4px' }} 
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </section>

            <section id="how" className="how-section">
                <div className="section-head">
                    <span className="section-label">System Workflow</span>
                    <h2 className="section-title">How JanNetra Works</h2>
                    <p className="hero-sub" style={{ margin: '16px auto 0', maxWidth: '600px', fontSize: '1.1rem' }}>
                        Turning real-time public data into verified civic action using AI and community intelligence.
                    </p>
                </div>

                <div className="how-steps-container">
                    <div className="steps-progress-line" />
                    <div className="how-steps">
                        {/* Step 1: Data Collection */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="step-card">
                            <div className="step-badge">Live Data</div>
                            <div className="step-icon-box"><Database size={28} /></div>
                            <h3 className="step-title">1. Real-Time Data Collection</h3>
                            <p className="step-desc">JanNetra gathers data from social platforms and open APIs to detect potential civic issues.</p>
                            <div className="step-micro-ui">
                                <div className="micro-item"><Globe size={12} /> Social Signals</div>
                                <div className="micro-item"><GitBranch size={12} /> API Hooks</div>
                            </div>
                        </motion.div>

                        {/* Step 2: AI Detection (Highlighted Core) */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="step-card core-step">
                            <div className="step-badge badge-ai">AI Powered</div>
                            <div className="step-icon-box box-ai"><Brain size={28} /></div>
                            <h3 className="step-title">2. AI Detection Engine</h3>
                            <p className="step-desc">AI analyzes text and images using NLP and machine learning to identify and classify problems.</p>
                            <div className="step-micro-ui">
                                <div className="micro-item"><Cpu size={12} /> NLP Engine</div>
                                <div className="micro-item"><Zap size={12} /> Vision AI</div>
                            </div>
                        </motion.div>

                        {/* Step 3: Issue Intelligence */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="step-card">
                            <div className="step-badge">Priority Scored</div>
                            <div className="step-icon-box"><Activity size={28} /></div>
                            <h3 className="step-title">3. Smart Issue Analysis</h3>
                            <p className="step-desc">Each issue is scored based on severity and location to prioritize the most urgent problems.</p>
                            <div className="step-micro-ui">
                                <div className="micro-item"><AlertTriangle size={12} /> Severity 8/10</div>
                                <div className="micro-item"><TrendingUp size={12} /> Priority High</div>
                            </div>
                        </motion.div>

                        {/* Step 4: Verification & Action (High Impact) */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="step-card impact-step">
                            <div className="step-badge badge-impact">Verified Output</div>
                            <div className="step-icon-box box-impact"><CheckCircle2 size={28} /></div>
                            <h3 className="step-title">4. Verification & Action</h3>
                            <p className="step-desc">Citizens validate issues, and verified cases are escalated to authorities for faster resolution.</p>
                            <div className="step-micro-ui">
                                <div className="micro-item"><Users size={12} /> Community Audit</div>
                                <div className="micro-item">Official Route</div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                <div className="trust-layer">
                    <p><Lock size={14} /> Only verified issues are escalated to ensure accuracy and prevent false reporting.</p>
                </div>
            </section>

            <section id="alerts" className="alerts-section">
                <div className="section-head">
                    <span className="section-label">Live Feed</span>
                    <h2 className="section-title" style={{ color: 'var(--text-primary)' }}>Live Civic Signals</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>AI-detected and community-verified issues in real time</p>
                </div>

                <div className="alerts-grid">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="alert-card-dark" style={{ height: '200px', animate: 'pulse' }} />
                        ))
                    ) : verifiedIssues.length > 0 ? (
                        verifiedIssues.map((c) => (
                            <div key={c.id} className="alert-card-dark">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ color: '#818cf8', fontSize: '0.8rem' }}><MapPin size={12} /> {c.location}</div>
                                    <span className="status-pill status-verified">Verified</span>
                                </div>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px' }}>{c.title || c.type}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Updated 12s ago</span>
                                    <button className="cta-btn cta-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => navigate('/signal-monitor')}>Verify Now</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* Realistic Dummy Alerts for Empty State */
                        <>
                            {!isEscalated('dummy1') && (
                                <div className="alert-card-dark" style={{ opacity: 0.8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ color: '#818cf8', fontSize: '0.8rem' }}><MapPin size={12} /> Civil Lines, Prayagraj</div>
                                        <span className="status-pill status-verified">Verified</span>
                                    </div>
                                    <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px' }}>Broken Water Main</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Updated 2m ago</span>
                                            {voterCounts['dummy1'] > 0 && <span style={{ color: '#10b981', fontSize: '0.7rem' }}><Users size={12} /> {voterCounts['dummy1']} verifications</span>}
                                        </div>
                                        <button className="cta-btn cta-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#fff' }} onClick={() => handleVerifyClick({ id: 'dummy1', location: 'Civil Lines', title: 'Broken Water Main' })}>Verify Now</button>
                                    </div>
                                </div>
                            )}

                            {!isEscalated('dummy2') && (
                                <div className="alert-card-dark" style={{ opacity: 0.6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ color: 'var(--landing-accent)', fontSize: '0.8rem' }}><MapPin size={12} /> Katra Market</div>
                                        <span className="status-pill status-pending">Pending</span>
                                    </div>
                                    <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Street Light Failure</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>AI Detected 5m ago</span>
                                            {voterCounts['dummy2'] > 0 && <span style={{ color: 'var(--risk-low)', fontSize: '0.7rem' }}><Users size={12} /> {voterCounts['dummy2']} verifications</span>}
                                        </div>
                                        <button className="cta-btn cta-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleVerifyClick({ id: 'dummy2', location: 'Katra Market', title: 'Street Light Failure' })}>Verify Now</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '60px' }}>
                    <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>
                        {verifiedIssues.length === 0 && "No active verified alerts right now. AI is still monitoring your area."}
                    </p>
                    <button className="cta-btn cta-primary" style={{ margin: '0 auto', padding: '16px 40px' }} onClick={() => navigate('/signal-monitor')}>
                        View All Live Alerts <ChevronRight size={20} />
                    </button>
                </div>
            </section>

            <footer className="landing-footer" aria-labelledby="footer-heading">
                <h2 id="footer-heading" className="sr-only">Footer</h2>
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="logo" style={{ marginBottom: '16px' }}>
                            <span className="logo-text">JanNetra</span>
                        </div>
                        <p className="footer-tagline">Empowering citizens through transparency and AI-driven civic intelligence.</p>
                        <div className="social-links">
                            <a href="https://twitter.com/jannetra" aria-label="Twitter" target="_blank" rel="noopener noreferrer"><Zap size={20} /></a>
                            <a href="https://linkedin.com/company/jannetra" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><Users size={20} /></a>
                            <a href="https://github.com/jannetra" aria-label="GitHub" target="_blank" rel="noopener noreferrer"><Database size={20} /></a>
                        </div>
                    </div>
                    <div className="footer-links">
                        <h4>Platform</h4>
                        <ul>
                            <li><button onClick={() => scrollTo('how')} aria-label="How it works">How it works</button></li>
                            <li><button onClick={() => scrollTo('alerts')} aria-label="Live Feed">Live Feed</button></li>
                            <li><button onClick={() => navigate('/pulse')} aria-label="System Pulse">System Pulse</button></li>
                        </ul>
                    </div>
                    <div className="footer-links">
                        <h4>Resources</h4>
                        <ul>
                            <li><button onClick={() => navigate('/legal/transparency')} aria-label="Transparency">Transparency</button></li>
                            <li><button onClick={() => navigate('/legal/privacy')} aria-label="Privacy Policy">Privacy Policy</button></li>
                            <li><button onClick={() => navigate('/legal/terms')} aria-label="Terms of Service">Terms of Service</button></li>
                        </ul>
                    </div>
                    <div className="footer-links">
                        <h4>Contact</h4>
                        <ul>
                            <li><a href="mailto:support@jannetra.ai" aria-label="Support">Support</a></li>
                            <li><a href="mailto:press@jannetra.ai" aria-label="Press">Press</a></li>
                            <li><a href="mailto:contact@jannetra.ai" aria-label="Email Us">Email Us</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 JanNetra. AI-Powered Civic Intelligence for Smarter Cities. All rights reserved.</p>
                </div>
            </footer>

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
