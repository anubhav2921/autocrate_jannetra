import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, Shield, MapPin, Clock, Zap, Eye,
    CheckCircle2, Circle, Filter, Search,
} from 'lucide-react';

const SEVERITY_CONFIG = {
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    High: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    Low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};

export default function SignalMonitor() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const navigate = useNavigate();

    useEffect(() => {
        fetch('/api/signal-problems')
            .then((r) => r.json())
            .then((data) => setProblems(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = problems.filter((p) => {
        if (filterSeverity !== 'ALL' && p.severity !== filterSeverity) return false;
        if (filterStatus !== 'ALL') {
            if (filterStatus === 'Resolved' && p.status !== 'Problem Resolved') return false;
            if (filterStatus === 'Pending' && p.status !== 'Pending') return false;
        }
        if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
            !p.id.toLowerCase().includes(search.toLowerCase()) &&
            !p.category.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: problems.length,
        critical: problems.filter((p) => p.severity === 'Critical').length,
        pending: problems.filter((p) => p.status === 'Pending').length,
        resolved: problems.filter((p) => p.status === 'Problem Resolved').length,
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Signal Monitor</h1>
                <p>Real-time governance signal tracking — identify, investigate, and resolve detected problems</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid animate-in">
                <div className="glass-card stat-card blue">
                    <div className="stat-icon"><Zap size={22} /></div>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Signals</div>
                </div>
                <div className="glass-card stat-card red">
                    <div className="stat-icon"><AlertTriangle size={22} /></div>
                    <div className="stat-value" style={{ color: '#ef4444' }}>{stats.critical}</div>
                    <div className="stat-label">Critical</div>
                </div>
                <div className="glass-card stat-card amber">
                    <div className="stat-icon"><Clock size={22} /></div>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.pending}</div>
                    <div className="stat-label">Pending</div>
                </div>
                <div className="glass-card stat-card green">
                    <div className="stat-icon"><CheckCircle2 size={22} /></div>
                    <div className="stat-value" style={{ color: '#10b981' }}>{stats.resolved}</div>
                    <div className="stat-label">Resolved</div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card animate-in" style={{
                display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
                marginBottom: '20px', padding: '14px 20px',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                }}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Search signals..." value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-primary)',
                            fontSize: '0.85rem', fontFamily: 'var(--font-family)', outline: 'none', width: '100%',
                        }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
                        style={{
                            padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-color)', borderRadius: '8px',
                            color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-family)',
                        }}>
                        <option value="ALL">All Severity</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-color)', borderRadius: '8px',
                            color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-family)',
                        }}>
                        <option value="ALL">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Problems Table */}
            <div className="glass-card animate-in" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            {['ID', 'Title', 'Severity', 'Category', 'Location', 'Risk', 'Status', 'Action'].map((h) => (
                                <th key={h} style={{
                                    padding: '14px 12px', textAlign: 'left', fontSize: '0.72rem',
                                    fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p, idx) => {
                            const sev = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.Medium;
                            const isResolved = p.status === 'Problem Resolved';
                            return (
                                <tr key={p.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background 0.2s ease',
                                    animation: `fadeInUp 0.3s ease ${idx * 0.04}s both`,
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '14px 12px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                                        {p.id}
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                            {p.title}
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem',
                                            fontWeight: 600, background: sev.bg, color: sev.color,
                                            border: `1px solid ${sev.border}`,
                                        }}>
                                            <AlertTriangle size={11} /> {p.severity}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        {p.category}
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={12} /> {p.location}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{
                                                width: '40px', height: '6px', borderRadius: '3px',
                                                background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${p.riskScore}%`, height: '100%', borderRadius: '3px',
                                                    background: p.riskScore > 80 ? '#ef4444' : p.riskScore > 50 ? '#f59e0b' : '#10b981',
                                                    transition: 'width 0.6s ease',
                                                }} />
                                            </div>
                                            <span style={{
                                                fontSize: '0.78rem', fontWeight: 700,
                                                color: p.riskScore > 80 ? '#ef4444' : p.riskScore > 50 ? '#f59e0b' : '#10b981',
                                            }}>{p.riskScore}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem',
                                            fontWeight: 600,
                                            background: isResolved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                            color: isResolved ? '#10b981' : '#f59e0b',
                                            border: `1px solid ${isResolved ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                        }}>
                                            {isResolved ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                                            {isResolved ? 'Resolved' : 'Pending'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <button
                                            onClick={() => navigate(`/signal-monitor/${p.id}`)}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '6px 14px', fontSize: '0.75rem',
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                whiteSpace: 'nowrap',
                                            }}>
                                            <Eye size={13} /> Take Action
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                        <Shield size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p>No signals match your filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
