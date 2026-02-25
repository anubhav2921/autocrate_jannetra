
import { useState, useEffect } from 'react';
import {
    CheckCircle2, MapPin, Building2, Users, Send, Clock, Award,
    Circle, AlertTriangle, Radio, Zap,
} from 'lucide-react';

const CATEGORIES = ['Water', 'Infrastructure', 'Healthcare', 'Education', 'Law & Order', 'Corruption', 'Environment', 'Housing', 'Sanitation', 'Transport'];
const LOCATIONS = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
    'Pune', 'Jaipur', 'Lucknow', 'Ahmedabad', 'Patna', 'Bhopal',
    'Chandigarh', 'Varanasi', 'Nagpur', 'Indore', 'Surat', 'Noida',
];

export default function Resolutions({ user }) {
    const [resolutions, setResolutions] = useState([]);
    const [signalProblems, setSignalProblems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        title: '', category: '', location: '', problem_description: '',
        action_taken: '', resources_used: '', people_benefited: '', status: 'RESOLVED',
    });

    const update = (field, value) => setForm({ ...form, [field]: value });

    useEffect(() => {
        Promise.all([
            fetch('/api/resolutions').then((r) => r.json()),
            fetch('/api/signal-problems').then((r) => r.json()),
        ])
            .then(([resData, sigData]) => {
                setResolutions(resData.resolutions || []);
                setSignalProblems(sigData || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccess('');
        try {
            const res = await fetch('/api/resolutions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, user_id: user?.id }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Resolution submitted successfully!');
                setShowForm(false);
                setForm({
                    title: '', category: '', location: '', problem_description: '',
                    action_taken: '', resources_used: '', people_benefited: '', status: 'RESOLVED',
                });
                // Refresh list
                const listRes = await fetch('/api/resolutions');
                const listData = await listRes.json();
                setResolutions(listData.resolutions || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const statusColors = {
        RESOLVED: '#10b981',
        IN_PROGRESS: '#f59e0b',
        PARTIALLY_RESOLVED: '#3b82f6',
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Resolved Issues</h1>
                <p>Submit and track governance problems that have been addressed</p>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}
                className="animate-in">
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={18} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{resolutions.length}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Issues Resolved</span>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Submit Resolution'}
                </button>
            </div>

            {success && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                    fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
                }} className="animate-in">
                    <CheckCircle2 size={16} /> {success}
                </div>
            )}

            {/* Submit Form */}
            {showForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
                        Submit Resolved Problem
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                        <div className="grid-2" style={{ marginBottom: 0 }}>
                            <div className="auth-field">
                                <input type="text" placeholder="Resolution Title *" value={form.title}
                                    onChange={(e) => update('title', e.target.value)} required
                                    style={{
                                        padding: '12px 14px', width: '100%', background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                        fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                    }} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <select value={form.category} onChange={(e) => update('category', e.target.value)} required
                                    style={{
                                        flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                        fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                    }}>
                                    <option value="">Category *</option>
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={form.location} onChange={(e) => update('location', e.target.value)} required
                                    style={{
                                        flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                        fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                    }}>
                                    <option value="">Location *</option>
                                    {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>

                        <textarea placeholder="Describe the problem that was resolved *" value={form.problem_description}
                            onChange={(e) => update('problem_description', e.target.value)} required rows={3}
                            style={{
                                padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                fontSize: '0.85rem', fontFamily: 'var(--font-family)', resize: 'vertical'
                            }} />

                        <textarea placeholder="What action was taken to resolve it? *" value={form.action_taken}
                            onChange={(e) => update('action_taken', e.target.value)} required rows={3}
                            style={{
                                padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                fontSize: '0.85rem', fontFamily: 'var(--font-family)', resize: 'vertical'
                            }} />

                        <div className="grid-2" style={{ marginBottom: 0 }}>
                            <input type="text" placeholder="Resources used (e.g., 5 tankers, 10 workers)" value={form.resources_used}
                                onChange={(e) => update('resources_used', e.target.value)}
                                style={{
                                    padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                    fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                }} />
                            <input type="text" placeholder="People benefited (e.g., 2000 families)" value={form.people_benefited}
                                onChange={(e) => update('people_benefited', e.target.value)}
                                style={{
                                    padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                    fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                }} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select value={form.status} onChange={(e) => update('status', e.target.value)}
                                style={{
                                    padding: '12px', background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)',
                                    fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                }}>
                                <option value="RESOLVED">Fully Resolved</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="PARTIALLY_RESOLVED">Partially Resolved</option>
                            </select>
                            <button type="submit" className="btn btn-primary" disabled={submitting}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Send size={14} />
                                {submitting ? 'Submitting...' : 'Submit Resolution'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Signal Problem Status Showcase */}
            {signalProblems.length > 0 && (
                <div className="glass-card animate-in" style={{ marginBottom: '24px' }}>
                    <div className="section-title" style={{ marginBottom: '16px' }}>
                        <Radio size={18} /> Signal Problem Status
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {signalProblems.map((sp) => {
                            const isResolved = sp.status === 'Problem Resolved';
                            return (
                                <div key={sp.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 16px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border-color)',
                                    transition: 'all 0.2s ease',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)',
                                            background: 'rgba(59,130,246,0.1)', padding: '3px 8px', borderRadius: '4px',
                                            minWidth: '60px', textAlign: 'center',
                                        }}>{sp.id}</span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {sp.title}
                                        </span>
                                    </div>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '5px 14px', borderRadius: '20px', fontSize: '0.75rem',
                                        fontWeight: 700, whiteSpace: 'nowrap',
                                        background: isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                        color: isResolved ? '#10b981' : '#f59e0b',
                                        border: `1px solid ${isResolved ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
                                    }}>
                                        {isResolved ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                        {isResolved ? 'Problem Resolved' : 'Pending'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Resolutions List */}
            {resolutions.length === 0 ? (
                <div className="glass-card animate-in" style={{ textAlign: 'center', padding: '48px' }}>
                    <Award size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No resolutions submitted yet. Be the first to report a resolved issue!</p>
                </div>
            ) : (
                resolutions.map((r) => (
                    <div key={r.id} className="glass-card animate-in" style={{ marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                            background: statusColors[r.status] || '#10b981'
                        }} />

                        <div style={{ paddingLeft: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <span className={`badge badge-${r.status === 'RESOLVED' ? 'low' : r.status === 'IN_PROGRESS' ? 'moderate' : 'unknown'}`}>
                                        <CheckCircle2 size={11} style={{ marginRight: '4px' }} />
                                        {r.status?.replace('_', ' ')}
                                    </span>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '8px', color: 'var(--text-primary)' }}>
                                        {r.title}
                                    </h3>
                                </div>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Problem:</strong> {r.problem_description}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                <strong style={{ color: 'var(--risk-low)' }}>Action Taken:</strong> {r.action_taken}
                            </p>

                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Building2 size={13} /> {r.category}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={13} /> {r.location}
                                </span>
                                {r.people_benefited && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={13} /> {r.people_benefited}
                                    </span>
                                )}
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={13} /> {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : 'N/A'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                                    — {r.leader?.name} ({r.leader?.department})
                                </span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
