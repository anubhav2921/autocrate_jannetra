import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Briefcase, Clock, MapPin, Search, Filter, AlertTriangle, 
    Flame, ArrowRight, UserCheck, Shield
} from 'lucide-react';
import api from '../services/api';

export default function WorkingProblems() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('my-problems');
    const navigate = useNavigate();

    // Adapter layer for mocked user mapping
    const currentUserId = 'demo-user-id';

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
        (p.title || p.id).toLowerCase().includes(search.toLowerCase())
    );

    const myProblems = searched.filter(p => 
        p.assignedTo === currentUserId || p.ownerId === currentUserId
    );

    const collaborations = searched.filter(p => 
        (p.collaborators || []).includes(currentUserId) && p.assignedTo !== currentUserId && p.ownerId !== currentUserId
    );

    const displayedProblems = activeTab === 'my-problems' ? myProblems : collaborations;

    return (
        <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <Briefcase size={28} /> Working Problems
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Manage and track progress on issues currently logged under your custody.
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

            {/* Custom Tab UI Segment */}
            <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <button 
                    onClick={() => setActiveTab('my-problems')}
                    style={{ 
                        background: 'none', border: 'none', padding: '10px 16px', fontSize: '1rem', fontWeight: 600,
                        color: activeTab === 'my-problems' ? 'var(--accent-blue)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'my-problems' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                    <Briefcase size={16} /> My Problems ({myProblems.length})
                </button>
                <button 
                    onClick={() => setActiveTab('collaborations')}
                    style={{ 
                        background: 'none', border: 'none', padding: '10px 16px', fontSize: '1rem', fontWeight: 600,
                        color: activeTab === 'collaborations' ? 'var(--accent-purple)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'collaborations' ? '2px solid var(--accent-purple)' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                    <Shield size={16} /> Collaborations ({collaborations.length})
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading workflows...</div>
            ) : displayedProblems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    {activeTab === 'my-problems' ? <Briefcase size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} /> : <Shield size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} />}
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No Active Problems</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{activeTab === 'my-problems' ? "You haven't assigned any problems to your workspace yet." : "You haven't been invited to collaborate on any problems yet."}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {displayedProblems.map((p, idx) => (
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
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '20px', 
                                    fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {activeTab === 'my-problems' ? (
                                        <><UserCheck size={12} /> Under Custody</>
                                    ) : (
                                        <><Shield size={12} style={{ color: 'var(--accent-purple)' }}/> Collaborator</>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.location}
                                    </span>
                                </div>
                                {activeTab === 'my-problems' ? (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                                        Assigned recently
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><UserCheck size={12}/> {p.assignedName}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Invited by {p.invitedBy}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Workflow Progress</span>
                                    <span style={{ color: 'var(--accent-purple)' }}>{p.progress}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${p.progress}%`, height: '100%', background: 'var(--accent-purple)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                                </div>
                            </div>

                            <button 
                                onClick={() => navigate(`/signal-monitor/${p.id}`)}
                                className="btn btn-primary" 
                                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', gap: '8px' }}
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
