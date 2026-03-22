import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, AlertTriangle, MapPin, Clock, Shield, Zap, CheckCircle2,
    Circle, FileText, Radio, Target, Flame, Image, Mic
} from 'lucide-react';

const SEVERITY_CONFIG = {
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    High: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    Low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};

import api from '../services/api';

export default function ProblemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [resolved, setResolved] = useState(false);
    const [showResolveForm, setShowResolveForm] = useState(false);
    const [report, setReport] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [progress, setProgress] = useState(0);
    const [updatingProgress, setUpdatingProgress] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get(`/signal-problems/${id}`)
            .then((data) => {
                setProblem(data);
                if (data?.status === 'Problem Resolved' || data?.status === 'Resolved') setResolved(true);
                setProgress(data?.progress || 0);
            })
            .catch((err) => {
                console.error('Failed to fetch problem detail:', err);
            })
            .finally(() => setLoading(false));

        api.get(`/workflows/${id}/activity`)
            .then(data => setActivityLogs(data))
            .catch(err => console.error("Failed to load activity logs", err));
    }, [id]);

    const handleResolve = async () => {
        if (!report) {
            alert('Please provide a resolution report/details.');
            return;
        }

        setResolving(true);
        try {
            // First submit resolution natively
            const formData = new FormData();
            formData.append('report', report);
            if (proofFile) formData.append('proof', proofFile);

            const data = await api.patch(`/signal-problems/${id}/resolve`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                // Log and update workflow native progress
                await api.post(`/workflows/${id}/progress`, { progress: 100 });
                setResolved(true);
                setProblem((prev) => ({ ...prev, status: 'Resolved', progress: 100 }));
                setShowResolveForm(false);
            }
        } catch (err) {
            console.error('Failed to resolve signal problem:', err);
            alert('Failed to submit resolution. Please try again.');
        } finally {
            setResolving(false);
        }
    };

    const handleUpdateProgress = async () => {
        setUpdatingProgress(true);
        try {
            const data = await api.post(`/workflows/${id}/progress`, { progress: parseInt(progress) });
            setProblem(prev => ({ ...prev, progress: data.progress, status: data.status }));
            if (data.progress === 100) setResolved(true);
            
            const logs = await api.get(`/workflows/${id}/activity`);
            setActivityLogs(logs);
        } catch(err) {
            console.error(err);
        } finally {
            setUpdatingProgress(false);
        }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setAddingNote(true);
        try {
            await api.post(`/workflows/${id}/notes`, { note: noteText });
            setNoteText('');
            const logs = await api.get(`/workflows/${id}/activity`);
            setActivityLogs(logs);
        } catch(err) {
            console.error(err);
        } finally {
            setAddingNote(false);
        }
    };

    const handleEscalate = async () => {
        try {
            const reason = prompt("Enter reason for escalation:");
            if (!reason) return;
            await api.post(`/workflows/${id}/escalate`, { reason });
            const p = await api.get(`/signal-problems/${id}`);
            setProblem(p);
            const logs = await api.get(`/workflows/${id}/activity`);
            setActivityLogs(logs);
        } catch(err) {
            console.error(err);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    if (!problem || problem.detail) {
        return (
            <div className="page-container">
                <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
                    <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: '12px' }} />
                    <h2 style={{ color: 'var(--text-primary)' }}>Signal Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                        {problem?.detail || `The signal "${id}" does not exist.`}
                    </p>
                    <button onClick={() => navigate(location.pathname.startsWith('/citizen-reports') ? '/citizen-reports' : '/signal-monitor')} className="btn btn-primary" style={{ marginTop: '16px' }}>
                        <ArrowLeft size={14} /> {location.pathname.startsWith('/citizen-reports') ? 'Back to Citizen Reports' : 'Back to Signal Monitor'}
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
            <button onClick={() => navigate(location.pathname.startsWith('/citizen-reports') ? '/citizen-reports' : '/signal-monitor')} className="btn btn-ghost animate-in"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '8px 14px' }}>
                <ArrowLeft size={16} /> {location.pathname.startsWith('/citizen-reports') ? 'Back to Citizen Reports' : 'Back to Signal Monitor'}
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

                        {/* Priority Score Circle */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                position: 'relative', width: '80px', height: '80px',
                            }}>
                                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '80px', height: '80px' }}>
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={(problem.priorityScore || problem.riskScore) > 80 ? '#ef4444' : (problem.priorityScore || problem.riskScore) > 50 ? '#f59e0b' : '#10b981'}
                                        strokeWidth="3" strokeDasharray={`${problem.priorityScore || problem.riskScore} ${100 - (problem.priorityScore || problem.riskScore)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.1rem', fontWeight: 800,
                                    color: (problem.priorityScore || problem.riskScore) > 80 ? '#ef4444' : (problem.priorityScore || problem.riskScore) > 50 ? '#f59e0b' : '#10b981',
                                }}>{problem.priorityScore || problem.riskScore}</div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                                PRIORITY SCORE
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
                            <Flame size={13} style={{ color: problem.frequency > 1 ? '#f97316' : 'inherit' }} /> 
                            <strong>{problem.frequency || 1}</strong> Reported Signals
                        </span>
                    </div>
                </div>
            </div>



            <div className="grid-2">
                {/* Problem Summary & Intelligence Summary */}
                <div className="glass-card animate-in">
                    <div className="section-title" style={{ marginBottom: '16px' }}>
                        <FileText size={18} /> {problem.hasGeminiSummary ? 'AI Intelligence Summary' : 'Problem Summary'}
                    </div>
                    
                    {problem.hasGeminiSummary ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Problem Description
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {problem.description}
                                </p>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                        Location Context
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {problem.locationDetail || problem.location}
                                    </p>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                        Evidence Analysis
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {problem.evidenceSummary || 'Multiple signals clustered by semantic similarity.'}
                                    </p>
                                </div>
                            </div>
                            
                            <div style={{ 
                                background: 'rgba(139, 92, 246, 0.05)', 
                                border: '1px solid rgba(139, 92, 246, 0.2)', 
                                padding: '16px', 
                                borderRadius: '8px',
                                marginTop: '4px'
                            }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Shield size={14} /> Recommended Solution for Leaders
                                </div>
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
                                    {problem.expectedSolution}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '20px' }}>
                                {problem.description || problem.title}
                            </p>
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <button 
                                    onClick={() => window.location.reload()} 
                                    className="btn btn-ghost"
                                    style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', gap: '8px', padding: '8px 16px' }}
                                >
                                    <Zap size={14} /> Generate AI Intelligence Report
                                </button>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    AI analysis may take a few seconds for new signal clusters.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Signals Cluster Evidence */}
                <div className="glass-card animate-in">
                    <div className="section-title" style={{ marginBottom: '16px' }}>
                        <Zap size={18} /> Signal Cluster Evidence
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {problem.sampleRecords && problem.sampleRecords.length > 0 ? (
                            problem.sampleRecords.map((rec, i) => (
                                <div key={i} style={{
                                    padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rec.title}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Source: {rec.source}</div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem', fontWeight: 700, color: rec.risk > 70 ? '#ef4444' : '#f59e0b',
                                        background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px'
                                    }}>
                                        {rec.risk}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                No individual source signals listed for this cluster.
                            </div>
                        )}
                    </div>

                    {/* Appended Tags & Primary Evidence for Citizen Reports */}
                    {(problem.image_url || problem.audio_url || problem.department) && (
                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Image size={15} /> Primary Core Evidence & Tags
                            </div>

                            {problem.department && (
                                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MAPPED DEPARTMENT:</div>
                                    <span style={{
                                        background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(59,130,246,0.2)'
                                    }}>
                                        #{problem.department}
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: problem.image_url && problem.audio_url ? '1fr 1fr' : '1fr', gap: '16px' }}>
                                {problem.image_url && (
                                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                                        <img src={problem.image_url} alt="Problem Evidence" style={{ width: '100%', maxHeight: '250px', objectFit: 'contain' }} />
                                    </div>
                                )}
                                {problem.audio_url && (
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Mic size={14} /> Voice Note Attached
                                        </div>
                                        <audio src={problem.audio_url} controls style={{ width: '100%' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Workflow Progress Engine */}
            <div className="glass-card animate-in" style={{ padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Target size={18} style={{ color: 'var(--accent-purple)' }} /> Execution Workflow Progress
                    </h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleEscalate} className="btn" style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <Flame size={12} style={{ marginRight: '4px' }} /> Escalate Priority
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <input 
                        type="range" 
                        min={problem?.progress || 0} 
                        max="100" 
                        value={progress} 
                        onChange={e => setProgress(Math.max(problem?.progress || 0, e.target.value))}
                        disabled={isResolved || updatingProgress}
                        style={{ flex: 1, accentColor: 'var(--accent-purple)' }}
                    />
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-purple)', width: '60px', textAlign: 'right' }}>
                        {progress}%
                    </div>
                    {!isResolved && progress != problem.progress && (
                        <button onClick={handleUpdateProgress} disabled={updatingProgress} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                            {updatingProgress ? 'Saving...' : 'Save Progress'}
                        </button>
                    )}
                </div>

                {/* Activity & Notes */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                        Governance Audit Timeline
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                        {activityLogs.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No activity logs found.</div>
                        ) : (
                            activityLogs.map(log => (
                                <div key={log._id} style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                                    <div style={{ width: '2px', background: 'var(--accent-blue)', opacity: 0.5, borderRadius: '2px' }} />
                                    <div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>by {log.performed_by} at {new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        {log.details && <div style={{ color: 'var(--text-secondary)' }}>{log.details}</div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {!isResolved && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Add an official execution note or update..." 
                                style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                            />
                            <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="btn" style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', fontSize: '0.85rem' }}>
                                {addingNote ? 'Adding...' : 'Attach Note'}
                            </button>
                        </div>
                    )}
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
                            please provide the resolution details below. The status will remain <strong style={{ color: '#f59e0b' }}>Pending</strong> until confirmed.
                        </p>

                        {!showResolveForm ? (
                            <button
                                onClick={() => {
                                    setShowResolveForm(true);
                                    if (problem.expectedSolution && !report) {
                                        setReport(`Proposed Action Plan:\n${problem.expectedSolution}\n\nActual Resolution Details:\n`);
                                    }
                                }}
                                className="btn btn-primary"
                                style={{
                                    padding: '14px 36px', fontSize: '0.95rem', fontWeight: 700,
                                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none', boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <CheckCircle2 size={20} />
                                Start Resolution Process
                            </button>
                        ) : (
                            <div className="animate-in" style={{
                                maxWidth: '600px', margin: '0 auto', background: 'rgba(255,255,255,0.03)',
                                padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)',
                                textAlign: 'left'
                            }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Resolution Report / Details *
                                    </label>
                                    <textarea
                                        value={report}
                                        onChange={(e) => setReport(e.target.value)}
                                        placeholder="Describe what steps were taken to resolve this issue..."
                                        style={{
                                            width: '100%', height: '120px', padding: '12px', borderRadius: '8px',
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'none'
                                        }}
                                    />
                                </div>
                                
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Proof of Resolution (Photo)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setProofFile(e.target.files[0])}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
                                            color: 'var(--text-muted)', fontSize: '0.85rem'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={handleResolve}
                                        disabled={resolving}
                                        className="btn btn-primary"
                                        style={{
                                            flex: 1, padding: '12px', fontWeight: 700,
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            border: 'none'
                                        }}
                                    >
                                        {resolving ? 'Confirming...' : 'Complete & Confirm Resolution'}
                                    </button>
                                    <button
                                        onClick={() => setShowResolveForm(false)}
                                        disabled={resolving}
                                        className="btn btn-ghost"
                                        style={{ padding: '12px 24px' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
