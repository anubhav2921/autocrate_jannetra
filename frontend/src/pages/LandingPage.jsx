import { useNavigate } from 'react-router-dom';
import {
    Eye, Shield, Brain, BarChart3, Globe, Zap,
    ArrowRight, ChevronRight, Sparkles, Activity,
    Lock, Users, TrendingUp, Scan
} from 'lucide-react';

const FEATURES = [
    {
        icon: Brain,
        title: 'AI-Powered Detection',
        desc: 'Advanced machine learning models analyze governance signals in real-time to detect anomalies and risks.',
        color: '#8b5cf6',
    },
    {
        icon: Shield,
        title: 'Fake News Shield',
        desc: 'Multi-layer verification system cross-references sources to identify misinformation instantly.',
        color: '#3b82f6',
    },
    {
        icon: Activity,
        title: 'Real-Time Monitoring',
        desc: 'Continuous surveillance of governance metrics with instant alerts for critical changes.',
        color: '#10b981',
    },
    {
        icon: BarChart3,
        title: 'Risk Analytics',
        desc: 'Comprehensive risk scoring and trend analysis to predict governance challenges before they escalate.',
        color: '#f59e0b',
    },
    {
        icon: Globe,
        title: 'Source Intelligence',
        desc: 'Track credibility scores and accuracy ratings across all signal sources in your network.',
        color: '#06b6d4',
    },
    {
        icon: Scan,
        title: 'Social Scanner',
        desc: 'Deep scanning of social media channels to identify emerging governance concerns early.',
        color: '#ef4444',
    },
];

const STATS = [
    { value: '99.2%', label: 'Detection Accuracy' },
    { value: '50K+', label: 'Signals Analyzed' },
    { value: '<2s', label: 'Response Time' },
    { value: '24/7', label: 'Active Monitoring' },
];

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden',
        }}>
            {/* ── Navbar ─── */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 40px',
                background: 'rgba(10, 14, 26, 0.8)',
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid var(--border-color)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Eye size={26} style={{ color: '#3b82f6' }} />
                    <span style={{
                        fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.08em',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>JanNetra</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => navigate('/login')} style={{
                        padding: '9px 22px', borderRadius: '8px', fontSize: '0.85rem',
                        fontWeight: 600, border: '1px solid var(--border-color)',
                        background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}>Sign In</button>
                    <button onClick={() => navigate('/signup')} style={{
                        padding: '9px 22px', borderRadius: '8px', fontSize: '0.85rem',
                        fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        color: '#fff', transition: 'all 0.2s',
                    }}>Get Started</button>
                </div>
            </nav>

            {/* ── Hero ─── */}
            <section style={{
                position: 'relative', minHeight: '100vh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '120px 24px 80px',
            }}>
                {/* Ambient glow */}
                <div style={{
                    position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                    width: '800px', height: '800px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '6px 16px', borderRadius: '100px', marginBottom: '24px',
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                    fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                    <Sparkles size={14} /> AI-Powered Governance Intelligence
                </div>

                <h1 style={{
                    fontSize: 'clamp(2.8rem, 7vw, 4.5rem)',
                    fontWeight: 800, lineHeight: 1.1, maxWidth: '800px',
                    marginBottom: '20px',
                }}>
                    <span style={{
                        background: 'linear-gradient(135deg, #fff 30%, #94a3b8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>See What Others Miss.</span>
                    <br />
                    <span style={{
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Act Before It's Too Late.</span>
                </h1>

                <p style={{
                    fontSize: '1.1rem', color: 'var(--text-secondary)',
                    maxWidth: '580px', lineHeight: 1.7, marginBottom: '36px',
                }}>
                    JanNetra harnesses artificial intelligence to monitor governance signals,
                    detect misinformation, and deliver actionable intelligence — in real time.
                </p>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={() => navigate('/signup')} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '14px 32px', borderRadius: '12px', fontSize: '0.95rem',
                        fontWeight: 700, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                        color: '#fff', transition: 'all 0.3s', boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                    }}>
                        Start Monitoring <ArrowRight size={18} />
                    </button>
                    <button onClick={() => navigate('/login')} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '14px 32px', borderRadius: '12px', fontSize: '0.95rem',
                        fontWeight: 600, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)', transition: 'all 0.3s',
                    }}>
                        View Dashboard <ChevronRight size={18} />
                    </button>
                </div>

                {/* Stats strip */}
                <div style={{
                    display: 'flex', gap: '48px', marginTop: '80px',
                    flexWrap: 'wrap', justifyContent: 'center',
                }}>
                    {STATS.map((s, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: '2rem', fontWeight: 800,
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>{s.value}</div>
                            <div style={{
                                fontSize: '0.75rem', color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px',
                            }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ─── */}
            <section style={{
                padding: '80px 24px', maxWidth: '1200px', margin: '0 auto',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                    <h2 style={{
                        fontSize: '2.2rem', fontWeight: 800, marginBottom: '12px',
                        background: 'linear-gradient(135deg, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Intelligent Capabilities</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                        Powered by advanced AI to give you complete governance visibility
                    </p>
                </div>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '20px',
                }}>
                    {FEATURES.map((f, i) => (
                        <div key={i} className="glass-card" style={{
                            padding: '28px', cursor: 'default',
                            transition: 'transform 0.3s, border-color 0.3s',
                            borderColor: 'transparent',
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = `${f.color}40`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'transparent';
                            }}
                        >
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${f.color}15`, marginBottom: '16px',
                            }}>
                                <f.icon size={22} style={{ color: f.color }} />
                            </div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ─── */}
            <section style={{
                padding: '80px 24px', textAlign: 'center',
            }}>
                <div className="glass-card" style={{
                    maxWidth: '700px', margin: '0 auto', padding: '56px 40px',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))',
                    borderColor: 'rgba(59,130,246,0.15)',
                }}>
                    <Lock size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>
                        Ready to Secure Governance?
                    </h2>
                    <p style={{
                        color: 'var(--text-secondary)', fontSize: '0.95rem',
                        maxWidth: '450px', margin: '0 auto 28px', lineHeight: 1.7,
                    }}>
                        Join leaders who trust JanNetra for real-time governance intelligence and AI-powered decision support.
                    </p>
                    <button onClick={() => navigate('/signup')} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '14px 36px', borderRadius: '12px', fontSize: '0.95rem',
                        fontWeight: 700, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                        color: '#fff', boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                    }}>
                        Create Free Account <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {/* ── Footer ─── */}
            <footer style={{
                padding: '32px 40px', borderTop: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '12px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} style={{ color: '#3b82f6' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        JanNetra
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        &copy; 2026 All rights reserved
                    </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    AI-Powered Governance Intelligence System
                </div>
            </footer>
        </div>
    );
}
