import { useState, useEffect } from 'react';
import {
    CheckCircle2, MapPin, Building2, Users, Send, Clock, Award,
    Globe, Plus, Shield, Layers, FileSpreadsheet, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useLocation } from '../context/LocationContext';

const CATEGORIES = ['Water', 'Infrastructure', 'Healthcare', 'Education', 'Law & Order', 'Corruption', 'Environment', 'Housing', 'Sanitation', 'Transport'];
const LOCATIONS = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
    'Pune', 'Jaipur', 'Lucknow', 'Ahmedabad', 'Patna', 'Bhopal',
    'Chandigarh', 'Varanasi', 'Nagpur', 'Indore', 'Surat', 'Noida',
];

export default function Resolutions({ user }) {
    const { hasLocation, locationLabel } = useLocation();
    const [resolutions, setResolutions] = useState([]);
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
        setLoading(true);
        api.get('/resolutions', { params: { user_id: user?.id } })
            .then((resData) => {
                setResolutions(resData?.resolutions || []);
            })
            .catch((err) => {
                console.error('Failed to fetch resolutions data:', err);
                setResolutions([]);
            })
            .finally(() => setLoading(false));
    }, [user?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccess('');
        try {
            const data = await api.post('/resolutions', { ...form, user_id: user?.id });
            if (data.success) {
                setSuccess('Resolution submitted successfully!');
                setShowForm(false);
                setForm({
                    title: '', category: '', location: '', problem_description: '',
                    action_taken: '', resources_used: '', people_benefited: '', status: 'RESOLVED',
                });
                const listData = await api.get('/resolutions', { params: { user_id: user?.id } });
                setResolutions(listData?.resolutions || []);
            }
        } catch (err) {
            console.error('Submit failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-page-wrapper">
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading resolution logs...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page-wrapper animate-in">
            {/* Header Banner */}
            <div className="hero-banner-card" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.5rem' }}>Resolved Issues & Reports</h1>
                    <p className="hero-subtext">Log, verify, and showcase governance resolutions, resource allocation, and citizen impact</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="navbar-location-pill" style={{ background: '#181c2e' }}>
                        <Globe size={14} className="location-icon" />
                        <span>{hasLocation ? locationLabel() : 'All India'}</span>
                    </div>
                    <button
                        className="ai-assistant-btn"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <Plus size={16} /> {showForm ? 'Cancel' : 'Submit Resolution'}
                    </button>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="at-a-glance-stats-grid" style={{ marginBottom: '20px' }}>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper green">
                        <Award size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">{resolutions.length}</div>
                        <div className="stat-name">Issues Resolved</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper blue">
                        <Users size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">12,450+</div>
                        <div className="stat-name">People Benefited</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper purple">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">98.4%</div>
                        <div className="stat-name">Verification Rate</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper orange">
                        <Building2 size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">14</div>
                        <div className="stat-name">Departments Active</div>
                    </div>
                </div>
            </div>

            {success && (
                <div className="panel-card" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', marginBottom: '20px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={18} /> {success}
                </div>
            )}

            {/* Modal / Form Overlay */}
            {showForm && (
                <div className="panel-card" style={{ marginBottom: '24px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '18px' }}>
                        Submit Resolved Problem
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <input
                                type="text"
                                placeholder="Resolution Title *"
                                value={form.title}
                                onChange={(e) => update('title', e.target.value)}
                                required
                                style={{
                                    padding: '12px 14px', background: '#181c2e',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f8fafc',
                                    fontSize: '0.85rem', outline: 'none'
                                }}
                            />
                            <select
                                value={form.category}
                                onChange={(e) => update('category', e.target.value)}
                                required
                                style={{
                                    padding: '12px 14px', background: '#181c2e',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f8fafc',
                                    fontSize: '0.85rem', outline: 'none'
                                }}
                            >
                                <option value="">Category *</option>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                                value={form.location}
                                onChange={(e) => update('location', e.target.value)}
                                required
                                style={{
                                    padding: '12px 14px', background: '#181c2e',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f8fafc',
                                    fontSize: '0.85rem', outline: 'none'
                                }}
                            >
                                <option value="">Location *</option>
                                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>

                        <textarea
                            placeholder="Describe the problem that was resolved *"
                            value={form.problem_description}
                            onChange={(e) => update('problem_description', e.target.value)}
                            required
                            rows={3}
                            style={{
                                padding: '12px 14px', background: '#181c2e',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f8fafc',
                                fontSize: '0.85rem', outline: 'none', resize: 'vertical'
                            }}
                        />

                        <textarea
                            placeholder="What action was taken to resolve it? *"
                            value={form.action_taken}
                            onChange={(e) => update('action_taken', e.target.value)}
                            required
                            rows={3}
                            style={{
                                padding: '12px 14px', background: '#181c2e',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f8fafc',
                                fontSize: '0.85rem', outline: 'none', resize: 'vertical'
                            }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <input
                                type="text"
                                placeholder="Resources used (e.g. 5 tankers)"
                                value={form.resources_used}
                                onChange={(e) => update('resources_used', e.target.value)}
                                style={{
                                    padding: '12px 14px', background: '#181c2e',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f8fafc',
                                    fontSize: '0.85rem', outline: 'none'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="People benefited (e.g. 2000 families)"
                                value={form.people_benefited}
                                onChange={(e) => update('people_benefited', e.target.value)}
                                style={{
                                    padding: '12px 14px', background: '#181c2e',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f8fafc',
                                    fontSize: '0.85rem', outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                className="ai-assistant-btn"
                                disabled={submitting}
                                style={{ justifyContent: 'center' }}
                            >
                                <Send size={16} /> {submitting ? 'Submitting...' : 'Post Resolution Log'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Resolutions List Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {resolutions.length === 0 ? (
                    <div className="panel-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <Award size={42} style={{ color: '#4ade80', margin: '0 auto 12px' }} />
                        <h3 style={{ color: '#f8fafc', marginBottom: '6px' }}>No Resolutions Recorded Yet</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Log verified resolution reports to showcase governance action and impact.</p>
                    </div>
                ) : (
                    resolutions.map((r) => (
                        <div key={r.id} className="panel-card" style={{ borderLeft: '4px solid #10b981', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                                        {r.status || 'RESOLVED'}
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                        <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                        {r.location || 'All India'}
                                    </span>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px', lineHeight: 1.4 }}>
                                {r.title}
                            </h3>

                            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', lineHeight: 1.5 }}>
                                <strong style={{ color: '#f8fafc' }}>Problem:</strong> {r.problem_description}
                            </p>

                            <p style={{ fontSize: '0.85rem', color: '#4ade80', marginBottom: '12px', lineHeight: 1.5 }}>
                                <strong>Action Taken:</strong> {r.action_taken}
                            </p>

                            {(r.resources_used || r.people_benefited) && (
                                <div style={{ display: 'flex', gap: '16px', background: '#181c2e', padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
                                    {r.resources_used && <span>🛠️ Resources: <strong>{r.resources_used}</strong></span>}
                                    {r.people_benefited && <span>👥 Benefited: <strong>{r.people_benefited}</strong></span>}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
