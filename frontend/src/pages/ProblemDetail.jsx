import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, AlertTriangle, MapPin, Clock, Shield, Zap, CheckCircle2,
    Circle, FileText, Radio, Target,
} from 'lucide-react';

const SEVERITY_CONFIG = {
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    High: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    Low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};

export default function ProblemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [resolved, setResolved] = useState(false);

    useEffect(() => {
        fetch(`/api/signal-problems/${id}`)
            .then((r) => r.json())
            .then((data) => {
                setProblem(data);
                if (data.status === 'Problem Resolved') setResolved(true);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const handleResolve = async () => {
        setResolving(true);
        try {
            const res = await fetch(`/api/signal-problems/${id}/resolve`, { method: 'PATCH' });
            const data = await res.json();
            if (data.success) {
                setResolved(true);
                setProblem((prev) => ({ ...prev, status: 'Problem Resolved' }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setResolving(false);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    if (!problem) {
        return (
            <div className="page-container">
                <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
                    <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: '12px' }} />
                    <h2 style={{ color: 'var(--text-primary)' }}>Signal Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The signal "{id}" does not exist.</p>
                    <button onClick={() => navigate('/signal-monitor')} className="btn btn-primary" style={{ marginTop: '16px' }}>
                        <ArrowLeft size={14} /> Back to Signal Monitor
                    </button>
                </div>
            </div>
        );
    }

    const sev = SEVERITY_CONFIG[problem.severity] || SEVERITY_CONFIG.Medium;
    const isResolved = resolved || problem.status === 'Problem Resolved';

    return (
        <div className="page-container">
            {/* Back Button */}
            <button onClick={() => navigate('/signal-monitor')} className="btn btn-ghost animate-in"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '8px 14px' }}>
                <ArrowLeft size={16} /> Back to Signal Monitor
            </button>

            {/* Header Card */}
            <div className="glass-card animate-in" style={{ position: 'relative', overflow: 'hidden', marginBottom: '20px' }}>
                {/* Severity stripe */}
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px',
                    background: sev.color,
                }} />

                <div style={{ paddingLeft: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-blue)',
                                    background: 'rgba(59,130,246,0.1)', padding: '4px 12px', borderRadius: '6px',
                                }}>{problem.id}</span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem',
                                    fontWeight: 600, background: sev.bg, color: sev.color,
                                    border: `1px solid ${sev.border}`,
                                }}>
                                    <AlertTriangle size={11} /> {problem.severity}
                                </span>

                                {/* Dynamic Status Badge */}
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: isResolved ? '#10b981' : '#f59e0b',
                                    border: `1px solid ${isResolved ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
                                }}>
                                    {isResolved ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                    {isResolved ? 'Problem Resolved' : 'Pending'}
                                </span>
                            </div>
                            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                {problem.title}
                            </h1>
                        </div>

                        {/* Risk Score Circle */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                position: 'relative', width: '80px', height: '80px',
                            }}>
                                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '80px', height: '80px' }}>
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={problem.riskScore > 80 ? '#ef4444' : problem.riskScore > 50 ? '#f59e0b' : '#10b981'}
                                        strokeWidth="3" strokeDasharray={`${problem.riskScore} ${100 - problem.riskScore}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.1rem', fontWeight: 800,
                                    color: problem.riskScore > 80 ? '#ef4444' : problem.riskScore > 50 ? '#f59e0b' : '#10b981',
                                }}>{problem.riskScore}</div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                                RISK SCORE
                            </div>
                        </div>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Target size={13} /> {problem.category}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={13} /> {problem.location}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} /> Detected: {problem.detectedAt ? new Date(problem.detectedAt).toLocaleString() : 'N/A'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Radio size={13} /> Source: {problem.source}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* Problem Description */}
                <div className="glass-card animate-in" style={{ gridColumn: '1 / -1' }}>
                    <div className="section-title" style={{ marginBottom: '16px' }}>
                        <FileText size={18} /> Problem Description
                    </div>
                    <p style={{
                        fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8,
                        background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                    }}>
                        {problem.description}
                    </p>
                </div>
            </div>

            {/* Action Section */}
            <div className="glass-card animate-in" style={{
                marginTop: '20px', textAlign: 'center', padding: '32px',
                border: isResolved ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)',
                background: isResolved
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(16,185,129,0.01))'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(245,158,11,0.01))',
            }}>
                {isResolved ? (
                    <>
                        <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '12px' }} />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                            Problem Resolved
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            This signal has been confirmed as resolved by the Leader.
                        </p>
                    </>
                ) : (
                    <>
                        <Shield size={48} style={{ color: '#f59e0b', marginBottom: '12px' }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Action Required
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                            Review the problem details above. If this issue has been addressed and resolved,
                            click the button below to confirm resolution. The status will remain <strong style={{ color: '#f59e0b' }}>Pending</strong> until confirmed.
                        </p>
                        <button
                            onClick={handleResolve}
                            disabled={resolving}
                            className="btn btn-primary"
                            style={{
                                padding: '14px 36px', fontSize: '0.95rem', fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', gap: '10px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none', boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 28px rgba(16,185,129,0.4)'; }}
                            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(16,185,129,0.3)'; }}
                        >
                            <CheckCircle2 size={20} />
                            {resolving ? 'Confirming...' : 'Confirm Problem Resolved'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
