import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Eye, Shield, Brain, Zap, ArrowRight, ChevronRight,
    Sparkles, Lock, Users, MapPin, AlertTriangle,
    CheckCircle2, X, Send, Database, Cpu, GitBranch, Bell,
    ThumbsUp, ThumbsDown,
} from 'lucide-react';
import api from '../services/api';

/* 
   ReviewModal
   Open to ALL users — no login required (anonymous verification)
 */
function ReviewModal({ complaint, onClose, onSubmit }) {
    const [text, setText] = useState('');
    const [verifiedAs, setVerifiedAs] = useState('unconfirmed');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    /* Client-side validation — minimum 20 characters */
    const isValid = text.trim().length >= 20;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid) {
            setError('Review must be at least 20 characters.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await onSubmit(complaint.id, text.trim(), verifiedAs);
            setDone(true);
            setTimeout(onClose, 1800);
        } catch {
            setError('Submission failed — please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="review-modal-overlay">
            <div className="review-modal-card">
                <button className="review-modal-close" onClick={onClose}>
                    <X size={16} />
                </button>

                <div className="review-modal-header">
                    <div className="review-modal-icon">
                        <Shield size={20} />
                    </div>
                    <div>
                        <p className="review-modal-title">Community Review</p>
                        <p className="review-modal-sub">Open to all — no account required</p>
                    </div>
                </div>

                <div className="review-complaint-preview">
                    <p className="review-complaint-preview-title">
                        {complaint.title || 'Untitled Complaint'}
                    </p>
                    <p className="review-complaint-preview-loc">
                        <MapPin size={12} />
                        {complaint.location || 'Unknown location'}
                    </p>
                    <div className="review-confidence-badge">
                        <AlertTriangle size={11} />
                        AI Confidence: {complaint.confidence_score ?? 'N/A'}%
                    </div>
                </div>

                {done ? (
                    <div className="review-success">
                        <CheckCircle2 size={40} />
                        <p>Review submitted — thank you!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Verification verdict */}
                        <select
                            className="filter-bar"
                            value={verifiedAs}
                            onChange={(e) => setVerifiedAs(e.target.value)}
                            style={{ width: '100%', marginBottom: '10px' }}
                        >
                            <option value="unconfirmed">— Select your verdict —</option>
                            <option value="real">✅ I believe this is a real issue</option>
                            <option value="false">❌ I believe this is false / exaggerated</option>
                            <option value="needs_more_info">🔎 Needs more information</option>
                        </select>

                        <textarea
                            className="review-textarea"
                            rows={4}
                            placeholder="Describe what you observed. Min 20 characters — does this issue seem valid? Add any context…"
                            value={text}
                            onChange={(e) => { setText(e.target.value); setError(''); }}
                        />

                        {/* Character counter */}
                        <p className="review-modal-sub" style={{ textAlign: 'right', marginTop: '4px' }}>
                            {text.trim().length} / 20 min chars
                        </p>

                        {error && (
                            <p className="auth-error" style={{ marginBottom: '10px' }}>{error}</p>
                        )}

                        <button
                            type="submit"
                            className="review-submit-btn"
                            disabled={submitting || !isValid}
                        >
                            <Send size={15} />
                            {submitting ? 'Submitting…' : 'Submit Review'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

/* 
   AlertCard
   Displayed in the Verified Alerts section
 */
function AlertCard({ complaint, onReview, onSupport, onMarkFalse }) {
    const score = complaint.confidence_score ?? 0;
    const isVerified = complaint.status === 'verified';

    return (
        <div className="alert-card-landing animate-in">
            <div className="alert-card-landing-score">
                {score}%
            </div>

            {isVerified && (
                <span className="badge badge-verified">
                    <CheckCircle2 size={10} style={{ marginRight: '4px' }} />
                    Verified
                </span>
            )}

            <h4 className="alert-card-landing-title">
                {complaint.title || 'Untitled Complaint'}
            </h4>
            <p className="alert-card-landing-meta">
                <MapPin size={12} />
                {complaint.location || 'Unknown location'}
            </p>

            <div className="alert-card-landing-actions">
                <button className="btn-verify" onClick={() => onReview(complaint)}>
                    <Shield size={12} /> Review
                </button>
                <button className="btn-support" onClick={() => onSupport(complaint.id)}>
                    <ThumbsUp size={12} /> Support
                </button>
                <button className="btn-false" onClick={() => onMarkFalse(complaint.id)}>
                    <ThumbsDown size={12} /> False
                </button>
            </div>
        </div>
    );
}

/* 
   HOW IT WORKS — step data
 */
const HOW_STEPS = [
    {
        icon: Database,
        title: 'Data Collection',
        desc: 'Civic reports from citizens, social signals, and government feeds are ingested in real-time from verified channels.',
        colorClass: 'how-step-blue',
        step: '01',
    },
    {
        icon: Cpu,
        title: 'AI Detection',
        desc: 'ML models analyse each complaint, assign a confidence score, detect anomalies, and auto-flag urgent civic issues.',
        colorClass: 'how-step-purple',
        step: '02',
    },
    {
        icon: Users,
        title: 'Community Verification',
        desc: 'Citizens cross-check AI findings with real observations, vote on validity, and add context that machines miss.',
        colorClass: 'how-step-green',
        step: '03',
    },
    {
        icon: GitBranch,
        title: 'Department Escalation',
        desc: 'Verified issues are intelligently routed to the correct civic department — PWD, municipal body, health & more.',
        colorClass: 'how-step-amber',
        step: '04',
    },
];

/* 
   ABOUT — card data
 */
const ABOUT_CARDS = [
    {
        icon: Brain,
        title: 'AI Detection',
        desc: 'Machine learning models continuously scan civic signals, score confidence, and surface real issues before they escalate into crises.',
        colorClass: 'about-card-blue',
    },
    {
        icon: Users,
        title: 'Community Verification',
        desc: 'Citizens like you cross-check AI findings with on-ground observations, vote on issue validity, and add essential context.',
        colorClass: 'about-card-green',
    },
    {
        icon: GitBranch,
        title: 'Department Routing',
        desc: 'Once verified, issues are intelligently matched to the right civic body — PWD, municipal corp, health board, and more — for swift action.',
        colorClass: 'about-card-purple',
    },
];

/* 
   LandingPage — main export
 */
export default function LandingPage() {
    const navigate = useNavigate();

    /*  state  */
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewTarget, setReviewTarget] = useState(null);

    /*  fetch complaints  */
    useEffect(() => {
        api.get('/complaints')
            .then((data) => {
                const list = Array.isArray(data)
                    ? data
                    : (data?.complaints ?? data?.data ?? []);
                setComplaints(list);
            })
            .catch(() => setComplaints([]))
            .finally(() => setLoading(false));
    }, []);

    /*  derived lists via useMemo  */
    const lowConfidenceIssues = useMemo(
        () => complaints.filter((c) => (c.confidence_score ?? 100) < 70).slice(0, 3),
        [complaints]
    );

    const verifiedIssues = useMemo(
        () => complaints.filter((c) => (c.confidence_score ?? 0) >= 70 || c.status === 'verified'),
        [complaints]
    );

    /*  helpers  */
    const scrollTo = (id) =>
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    /* No auth required — open modal directly for any visitor */
    const handleReview = (complaint) => {
        setReviewTarget(complaint);
    };

    /* Payload includes verified_as for anonymous verdict */
    const handleSubmitReview = (complaintId, reviewText, verifiedAs) =>
        api.post('/reviews', {
            complaint_id: complaintId,
            review_text: reviewText,
            verified_as: verifiedAs,
        });

    /* Support / false — open to all, no login needed */
    const handleSupport = async (id) => {
        try { await api.post(`/complaints/${id}/support`); } catch { /* ignore */ }
    };

    const handleMarkFalse = async (id) => {
        try { await api.post(`/complaints/${id}/false`); } catch { /* ignore */ }
    };

    /*  JSX  */
    return (
        <div className="landing-root">

            {/* 
                NAVBAR
             */}
            <nav className="landing-nav">

                {/* Logo */}
                <button className="landing-nav-logo" onClick={() => scrollTo('hero')}>
                    <div className="landing-nav-logo-icon">
                        <Eye size={18} color="#fff" />
                    </div>
                    <span className="landing-nav-logo-text">Janmnetra</span>
                </button>

                {/* Center scroll-links — hidden on mobile via CSS */}
                <div className="landing-nav-center">
                    <button className="landing-nav-link" onClick={() => scrollTo('about')}>About</button>
                    <button className="landing-nav-link" onClick={() => scrollTo('how')}>How It Works</button>
                    <button className="landing-nav-link" onClick={() => scrollTo('alerts')}>Live Alerts</button>
                </div>

                {/* Auth buttons */}
                <div className="landing-nav-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
                        Sign In
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>
                        Get Started
                    </button>
                </div>
            </nav>

            {/* 
                HERO — Split layout
             */}
            <section id="hero" className="landing-hero">
                <div className="landing-hero-inner">

                    {/* LEFT: copy + CTAs */}
                    <div className="landing-hero-left">
                        <div className="landing-badge">
                            <span className="landing-badge-dot" />
                            AI-Powered Civic Intelligence
                        </div>

                        <h1 className="landing-hero-title">
                            <span className="landing-hero-title-white">Empowering Civic<br /></span>
                            <span className="landing-hero-title-gradient">Action with AI</span>
                        </h1>

                        <p className="landing-hero-sub">
                            Janmnetra combines <strong>advanced AI detection</strong> with{' '}
                            <strong>community-powered verification</strong> to surface real civic
                            issues and route them directly to the right departments — faster than
                            ever before.
                        </p>

                        <div className="landing-hero-btns">
                            <button
                                className="btn btn-primary"
                                onClick={() => document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Explore Live Alerts <ArrowRight size={16} />
                            </button>
                            <button className="btn btn-ghost" onClick={() => scrollTo('alerts')}>
                                View Verified Alerts <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Live mini-stats */}
                        <div className="landing-stats-strip">
                            <div className="landing-stat-item">
                                <div className="landing-stat-value">
                                    {loading ? '—' : verifiedIssues.length}
                                </div>
                                <div className="landing-stat-label">Verified Alerts</div>
                            </div>
                            <div className="landing-stat-item">
                                <div className="landing-stat-value">
                                    {loading ? '—' : lowConfidenceIssues.length}
                                </div>
                                <div className="landing-stat-label">Needs Review</div>
                            </div>
                            <div className="landing-stat-item">
                                <div className="landing-stat-value">24/7</div>
                                <div className="landing-stat-label">Monitoring</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: AI Flagged Issues panel */}
                    <div className="landing-hero-right">
                        <div className="flagged-panel">

                            {/* Panel header */}
                            <div className="flagged-panel-header">
                                <div className="flagged-panel-title-row">
                                    <div className="flagged-panel-icon">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div>
                                        <p className="flagged-panel-title">
                                            🚩 AI Flagged Issues
                                        </p>
                                        <p className="flagged-panel-sub">
                                            Needs community verification
                                        </p>
                                    </div>
                                </div>
                                <span className="flagged-count-badge">
                                    {loading ? '…' : lowConfidenceIssues.length} Issues
                                </span>
                            </div>

                            {/* Issue list */}
                            {loading ? (
                                <div className="landing-loading">
                                    <div className="spinner" />
                                    Loading issues…
                                </div>
                            ) : lowConfidenceIssues.length === 0 ? (
                                <div className="landing-loading">
                                    <CheckCircle2 size={36} style={{ color: 'var(--risk-low)', marginBottom: '10px' }} />
                                    <p>No low-confidence issues right now.</p>
                                </div>
                            ) : (
                                <div className="flagged-list">
                                    {lowConfidenceIssues.map((c) => (
                                        <div key={c.id} className="flagged-item animate-in">
                                            <div className="flagged-item-header">
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p className="flagged-item-title">
                                                        {c.title || 'Untitled'}
                                                    </p>
                                                    <p className="flagged-item-location">
                                                        <MapPin size={11} />
                                                        {c.location || 'Unknown'}
                                                    </p>
                                                </div>
                                                <span className="flagged-item-score">
                                                    {c.confidence_score ?? 'N/A'}% AI
                                                </span>
                                            </div>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ width: '100%' }}
                                                onClick={() => handleReview(c)}
                                            >
                                                <Shield size={13} /> Verify This Issue
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Footer note — no login CTA; each card has its own Verify button */}
                            <div className="flagged-panel-footer">
                                <p>
                                    No account needed — click <strong>Verify This Issue</strong> on
                                    any card above to submit your community review instantly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 
                ABOUT — id="about"
             */}
            <section id="about" className="landing-section-alt">
                <div className="landing-section-inner">

                    <div className="landing-section-head">
                        <div className="landing-label landing-label-purple">
                            <Sparkles size={12} />
                            About Janmnetra
                        </div>
                        <h2 className="landing-section-title">The Civic Intelligence Platform</h2>
                        <p className="landing-section-sub">
                            Janmnetra bridges the gap between citizens and civic administration through
                            the power of AI — making it effortless to report, verify, and resolve real
                            community problems.
                        </p>
                    </div>

                    <div className="about-grid">
                        {ABOUT_CARDS.map((card, i) => (
                            <div key={i} className={`about-card ${card.colorClass} animate-in`}>
                                <div className="about-card-icon">
                                    <card.icon size={26} />
                                </div>
                                <h3 className="about-card-title">{card.title}</h3>
                                <p className="about-card-desc">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 
                HOW IT WORKS — id="how"
             */}
            <section id="how" className="landing-section">
                <div className="landing-section-inner">

                    <div className="landing-section-head">
                        <div className="landing-label landing-label-cyan">
                            <Zap size={12} />
                            The Process
                        </div>
                        <h2 className="landing-section-title">How It Works</h2>
                        <p className="landing-section-sub">
                            Four intelligent steps from detection to resolution
                        </p>
                    </div>

                    <div className="how-grid">
                        {HOW_STEPS.map((step, i) => (
                            <div key={i} className={`how-step ${step.colorClass} animate-in`}>
                                <span className="how-step-number">{step.step}</span>
                                <div className="how-step-icon">
                                    <step.icon size={22} />
                                </div>
                                <span className="how-step-pill">Step {step.step}</span>
                                <h3 className="how-step-title">{step.title}</h3>
                                <p className="how-step-desc">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 
                VERIFIED ALERTS — id="alerts"
             */}
            <section id="alerts" className="landing-section-alt">
                <div className="landing-section-inner">

                    <div className="alerts-section-header">
                        <div>
                            <div className="landing-label landing-label-green">
                                <Bell size={12} />
                                Live Feed
                            </div>
                            <h2 className="landing-section-title">Verified Alerts</h2>
                            <p className="landing-section-sub" style={{ textAlign: 'left', margin: 0 }}>
                                Community-confirmed civic issues ready for departmental action
                            </p>
                        </div>
                        <div className="alerts-count-box">
                            <CheckCircle2 size={20} style={{ color: 'var(--risk-low)' }} />
                            <div>
                                <div className="alerts-count-value">
                                    {loading ? '—' : verifiedIssues.length}
                                </div>
                                <div className="alerts-count-label">Verified</div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="landing-loading">
                            <div className="spinner" />
                            Loading verified alerts…
                        </div>
                    ) : verifiedIssues.length === 0 ? (
                        <div className="alerts-empty">
                            <CheckCircle2 size={48} style={{ color: 'var(--risk-low)' }} />
                            <p>No verified alerts right now. Great work, community!</p>
                        </div>
                    ) : (
                        <div className="alerts-grid">
                            {verifiedIssues.map((c) => (
                                <AlertCard
                                    key={c.id}
                                    complaint={c}
                                    onReview={handleReview}
                                    onSupport={handleSupport}
                                    onMarkFalse={handleMarkFalse}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 
                CTA BANNER
             */}
            <section className="landing-cta-section">
                <div className="landing-cta-card">
                    <Lock size={36} style={{ color: 'var(--accent-blue)', marginBottom: '18px' }} />
                    <h2 className="landing-cta-title">Ready to Secure Your Community?</h2>
                    <p className="landing-cta-sub">
                        Join Janmnetra today — verify AI findings, report issues, and help route
                        them to the departments that can fix them.
                    </p>
                    <div className="landing-cta-btns">
                        <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                            Create Free Account <ArrowRight size={17} />
                        </button>
                        <button className="btn btn-ghost" onClick={() => navigate('/login')}>
                            Sign In
                        </button>
                    </div>
                </div>
            </section>

            {/* 
                FOOTER
             */}
            <footer className="landing-footer">
                <div className="landing-footer-brand">
                    <div className="landing-footer-logo">
                        <Eye size={13} color="#fff" />
                    </div>
                    <span className="landing-footer-name">Janmnetra</span>
                    <span className="landing-footer-copy">© 2026 All rights reserved</span>
                </div>
                <span className="landing-footer-sub">AI-Powered Civic Intelligence Platform</span>
            </footer>

            {/* 
                REVIEW MODAL (conditional)
             */}
            {reviewTarget && (
                <ReviewModal
                    complaint={reviewTarget}
                    onClose={() => setReviewTarget(null)}
                    onSubmit={handleSubmitReview}
                />
            )}
        </div>
    );
}
