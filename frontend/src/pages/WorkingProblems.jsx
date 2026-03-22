import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Briefcase, Clock, MapPin, Search, Filter, AlertTriangle, 
    Flame, ArrowRight, UserCheck, Shield
} from 'lucide-react';
import api from '../services/api';

export default function WorkingProblems() {
    const [problems, setProblems] = useState({ owned: [], collaborative: [] });
    const [activeTab, setActiveTab] = useState('owned');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWorking = async () => {
            try {
                const res = await api.get('/workflows/working');
                if (res && typeof res === 'object' && res.owned) {
                    setProblems(res);
                } else {
                    // Fallback
                    setProblems({ owned: res || [], collaborative: [] });
                }
            } catch (err) {
                console.error("Failed to fetch working problems", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWorking();
    }, []);

    const currentList = activeTab === 'owned' ? (problems?.owned || []) : (problems?.collaborative || []);
    
    const safeSearch = (search || '').toLowerCase();
    const filtered = (Array.isArray(currentList) ? currentList : []).filter(p => {
        if (!p) return false;
        const titleStr = p.title ? String(p.title).toLowerCase() : '';
        const idStr = p.id ? String(p.id).toLowerCase() : '';
        return titleStr.includes(safeSearch) || idStr.includes(safeSearch);
    });

    return (
        <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <Briefcase size={28} /> Working Problems
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Manage workflows under your custody and access collaborative assignments.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search active issues..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                padding: '8px 16px 8px 36px', borderRadius: '8px', 
                                border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)', fontSize: '0.85rem', width: '250px'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px' }}><Shield size={24} style={{ color: '#3b82f6' }} /></div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Owned Workflows</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{problems?.owned?.length || 0}</div>
                    </div>
                </div>
                <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '10px' }}><Users size={24} style={{ color: '#8b5cf6' }} /></div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Collaborations</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{problems?.collaborative?.length || 0}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <button 
                    onClick={() => setActiveTab('owned')}
                    style={{ 
                        padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: '1.05rem', fontWeight: activeTab === 'owned' ? 700 : 500,
                        color: activeTab === 'owned' ? 'var(--text-primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'owned' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <UserCheck size={18} /> My Problems
                    <span style={{ background: activeTab === 'owned' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', color: activeTab === 'owned' ? '#fff' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {problems?.owned?.length || 0}
                    </span>
                </button>
                <button 
                    onClick={() => setActiveTab('collaborative')}
                    style={{ 
                        padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: '1.05rem', fontWeight: activeTab === 'collaborative' ? 700 : 500,
                        color: activeTab === 'collaborative' ? 'var(--text-primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'collaborative' ? '2px solid var(--accent-purple)' : '2px solid transparent',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Users size={18} /> Collaborations
                    <span style={{ background: activeTab === 'collaborative' ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)', color: activeTab === 'collaborative' ? '#fff' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {problems?.collaborative?.length || 0}
                    </span>
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading workflows...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    {activeTab === 'owned' ? (
                        <>
                            <Briefcase size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No Assigned Problems</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>You haven't been assigned any problems to your workspace yet.</p>
                        </>
                    ) : (
                        <>
                            <Users size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No Collaboration Invites</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>You haven't been invited to collaborate on any cross-department workflows.</p>
                        </>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {filtered.map((p, idx) => (
                        <div 
                            key={p.id} 
                            className="glass-card animate-in"
                            style={{
                                padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px',
                                border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden',
                                animationDelay: `${idx * 0.05}s`
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
                                background: p.priorityScore >= 80 ? '#ef4444' : p.priorityScore >= 50 ? '#f59e0b' : '#3b82f6'
                            }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px', letterSpacing: '0.5px' }}>
                                        {p.id} • {p.source}
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                        {p.title.length > 50 ? p.title.substring(0, 50) + '...' : p.title}
                                    </h3>
                                </div>
                                
                                {activeTab === 'owned' ? (
                                    <div style={{ 
                                        background: 'rgba(59, 130, 246, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.3)',
                                        fontSize: '0.7rem', fontWeight: 600, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <Shield size={12} /> Owner
                                    </div>
                                ) : (
                                    <div style={{ 
                                        background: 'rgba(139, 92, 246, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.3)',
                                        fontSize: '0.7rem', fontWeight: 600, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <Users size={12} /> Contributor
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.location}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                            
                            {activeTab === 'collaborative' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
                                    Owner: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.assignedName}</span>
                                </div>
                            )}

                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Workflow Progress</span>
                                    <span style={{ color: activeTab === 'owned' ? 'var(--accent-blue)' : 'var(--accent-purple)' }}>{p.progress}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${p.progress}%`, height: '100%', background: activeTab === 'owned' ? 'var(--accent-blue)' : 'var(--accent-purple)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                                </div>
                            </div>

                            <button 
                                onClick={() => navigate(`/signal-monitor/${p.id}`)}
                                className="btn" 
                                style={{ 
                                    width: '100%', padding: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', gap: '8px',
                                    background: activeTab === 'owned' ? 'var(--accent-blue)' : 'var(--accent-purple)', color: 'white', border: 'none'
                                }}
                            >
                                Open Workspace <ArrowRight size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
