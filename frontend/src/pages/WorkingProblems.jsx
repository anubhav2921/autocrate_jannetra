import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Briefcase, Clock, MapPin, Search, Filter, AlertTriangle, 
    Flame, ArrowRight, UserCheck, Shield, Globe, Users, CheckCircle2,
    Layers, Sparkles
} from 'lucide-react';
import api from '../services/api';
import safe from '../utils/safeRender';
import ProblemActionMenu from '../components/ProblemActionMenu';

export default function WorkingProblems() {
    const { location, hasLocation, locationLabel } = { location: {}, hasLocation: false, locationLabel: () => 'All India' };
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('my-problems');
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem('user')) || { uid: 'u-1', name: 'Leader' };
    const currentUserId = currentUser.uid || currentUser.id;

    useEffect(() => {
        const fetchWorking = async () => {
            try {
                const res = await api.get('/workflows/working');
                setProblems(res || []);
            } catch (err) {
                console.error("Failed to fetch working problems", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWorking();
    }, []);

    const searched = problems.filter(p => 
        (p.title || p.id || '').toLowerCase().includes(search.toLowerCase())
    );

    const myProblems = searched.filter(p => 
        p.assignedTo === currentUserId || p.ownerId === currentUserId || !p.assignedTo
    );

    const collaborations = searched.filter(p => 
        (p.collaborators || []).includes(currentUserId) && p.assignedTo !== currentUserId && p.ownerId !== currentUserId
    );

    const displayedProblems = activeTab === 'my-problems' ? myProblems : collaborations;

    return (
        <div className="dashboard-page-wrapper animate-in">
            {/* Header Banner */}
            <div className="hero-banner-card" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.5rem' }}>Working Problems & Escalations</h1>
                    <p className="hero-subtext">Manage, track, and resolve governance issues currently assigned under active custody</p>
                </div>
                <div className="navbar-location-pill" style={{ background: '#181c2e' }}>
                    <Globe size={14} className="location-icon" />
                    <span>All India</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="at-a-glance-stats-grid" style={{ marginBottom: '20px' }}>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper purple">
                        <Briefcase size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">{myProblems.length}</div>
                        <div className="stat-name">Active Custody</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper blue">
                        <Shield size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">{collaborations.length}</div>
                        <div className="stat-name">Collaborations</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper red">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#f87171' }}>
                            {problems.filter(p => p.severity === 'Critical' || p.severity === 'High').length}
                        </div>
                        <div className="stat-name">High Priority</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper green">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#4ade80' }}>
                            {problems.filter(p => p.status === 'Problem Resolved').length}
                        </div>
                        <div className="stat-name">Resolved Items</div>
                    </div>
                </div>
            </div>

            {/* Search & Custom Tabs Bar */}
            <div className="panel-card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setActiveTab('my-problems')}
                            style={{
                                background: activeTab === 'my-problems' ? '#6366f1' : '#181c2e',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Briefcase size={15} /> My Custody ({myProblems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('collaborations')}
                            style={{
                                background: activeTab === 'collaborations' ? '#8b5cf6' : '#181c2e',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Shield size={15} /> Collaborations ({collaborations.length})
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="navbar-search-wrapper" style={{ width: '280px' }}>
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            className="navbar-search-input"
                            placeholder="Search active issues..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content Cards Container */}
            {displayedProblems.length === 0 ? (
                <div className="panel-card" style={{ padding: '54px 24px', textAlign: 'center' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '18px',
                        background: 'rgba(99,102,241,0.12)', color: '#8b5cf6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <Briefcase size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                        No Active Problems Under Custody
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94a3b8', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                        You haven't assigned any active governance problems to your workspace yet. Assign issues from Signal Monitor to track them here.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button className="ai-assistant-btn" onClick={() => navigate('/signal-monitor')}>
                            <Layers size={16} /> Explore Signal Monitor
                        </button>
                        <button className="btn btn-ghost" style={{ borderRadius: '12px', padding: '10px 18px', fontSize: '0.85rem' }} onClick={() => navigate('/alerts')}>
                            <AlertTriangle size={16} /> Review Alerts
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {displayedProblems.map((p) => (
                        <div key={p.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b5cf6' }}>{p.id}</span>
                                    <span className={`severity-badge ${p.severity?.toLowerCase() || 'medium'}`}>
                                        {p.severity || 'Medium'}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px', lineHeight: 1.4 }}>
                                    {p.title}
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '14px' }}>
                                    {p.description || p.category || 'Active governance issue requiring departmental resolution.'}
                                </p>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={12} style={{ color: '#8b5cf6' }} /> {p.location || 'All India'}
                                </span>
                                <ProblemActionMenu problem={p} onUpdate={(updated) => {
                                    setProblems(prev => prev.map(item => item.id === updated.id ? updated : item));
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
