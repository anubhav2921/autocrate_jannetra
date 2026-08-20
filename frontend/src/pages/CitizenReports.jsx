import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, MapPin, Clock, Zap,
    CheckCircle2, Filter, Search, Globe, Users, Image, Mic, RefreshCw
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import api, { buildLocationParams } from '../services/api';
import ProblemActionMenu from '../components/ProblemActionMenu';

const SEVERITY_CONFIG = {
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    High: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    Low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};

export default function CitizenReports() {
    const { location, hasLocation, locationLabel } = useLocation();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const loadReports = () => {
        setLoading(true);
        const params = buildLocationParams(location);
        api.get('/citizen-reports/list', { params })
            .then((data) => {
                const formatted = (data || []).map((p) => ({
                    ...p,
                    severity: p.severity || "Medium",
                    status: p.status || "Pending",
                    riskScore: p.riskScore || p.risk || 0,
                    location: p.location || "Unknown"
                }));
                setProblems(formatted);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadReports();
    }, [location.state, location.district, location.city, location.ward]);

    const filtered = problems.filter((p) => {
        if (filterSeverity !== 'ALL' && p.severity !== filterSeverity) return false;
        if (filterStatus !== 'ALL') {
            if (filterStatus === 'Resolved' && p.status !== 'Problem Resolved' && p.status !== 'Resolved') return false;
            if (filterStatus === 'Pending' && (p.status === 'Problem Resolved' || p.status === 'Resolved')) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            const matches = 
                (p.title && p.title.toLowerCase().includes(q)) ||
                (p.id && p.id.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q)) ||
                (p.location && typeof p.location === 'string' && p.location.toLowerCase().includes(q)) ||
                (p.department && p.department.toLowerCase().includes(q)) ||
                (p.description && p.description.toLowerCase().includes(q));
            if (!matches) return false;
        }
        return true;
    });

    const stats = {
        total: problems.length,
        critical: problems.filter((p) => p.severity === 'Critical').length,
        pending: problems.filter((p) => p.status !== 'Problem Resolved' && p.status !== 'Resolved').length,
        resolved: problems.filter((p) => p.status === 'Problem Resolved' || p.status === 'Resolved').length,
    };

    if (loading) {
        return (
            <div className="dashboard-page-wrapper">
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading citizen reports...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page-wrapper animate-in">
            {/* Header Banner */}
            <div className="hero-banner-card" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.5rem' }}>Citizen Reports</h1>
                    <p className="hero-subtext">Direct citizen grievance filings, media uploads, and community escalation tracking</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="navbar-location-pill" style={{ background: '#181c2e' }}>
                        <Globe size={14} className="location-icon" />
                        <span>{hasLocation ? locationLabel() : 'All India'}</span>
                    </div>

                    <button
                        onClick={loadReports}
                        disabled={loading}
                        style={{
                            padding: '8px 14px', background: '#181c2e', color: '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600
                        }}
                        title="Refresh Reports"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="at-a-glance-stats-grid" style={{ marginBottom: '20px' }}>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper green">
                        <Users size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">{stats.total}</div>
                        <div className="stat-name">Total Filings</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper red">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#f87171' }}>{stats.critical}</div>
                        <div className="stat-name">Critical Escalations</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper orange">
                        <Clock size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#fbbf24' }}>{stats.pending}</div>
                        <div className="stat-name">Review Pending</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper blue">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#60a5fa' }}>{stats.resolved}</div>
                        <div className="stat-name">Resolved Filings</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="panel-card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="navbar-search-wrapper" style={{ flex: 1, minWidth: '220px', width: 'auto' }}>
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            className="navbar-search-input"
                            placeholder="Search citizen reports by keyword, ID or department..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={14} style={{ color: '#64748b' }} />
                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                            style={{
                                padding: '8px 14px', background: '#181c2e',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                                color: '#f8fafc', fontSize: '0.82rem', outline: 'none'
                            }}
                        >
                            <option value="ALL">All Severity</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{
                                padding: '8px 14px', background: '#181c2e',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                                color: '#f8fafc', fontSize: '0.82rem', outline: 'none'
                            }}
                        >
                            <option value="ALL">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reports Table */}
            <div className="panel-card" style={{ padding: '20px', overflowX: 'auto' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                        <Users size={36} style={{ color: '#6366f1', marginBottom: '12px' }} />
                        <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', marginBottom: '6px' }}>No Citizen Reports Found</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '400px', margin: '0 auto 16px' }}>
                            No citizen reports match the current filters or location. Try clearing filters or submit a new grievance report.
                        </p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                {['ID', 'Title', 'Media', 'Severity', 'Category', 'Location', 'Priority', 'Status', 'Action'].map((h) => (
                                    <th key={h} style={{
                                        padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem',
                                        fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => {
                                const sev = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.Medium;
                                const isResolved = p.status === 'Problem Resolved' || p.status === 'Resolved';
                                return (
                                    <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: '14px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#8b5cf6', whiteSpace: 'nowrap' }}>
                                            <span title={p.id}>{p.id.length > 12 ? p.id.substring(0, 8) + '...' : p.id}</span>
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.4 }}>
                                                {p.title}
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {p.image_url && <Image size={15} style={{ color: '#60a5fa' }} title="Image Attached" />}
                                                {p.audio_url && <Mic size={15} style={{ color: '#c084fc' }} title="Voice Audio Attached" />}
                                                {!p.image_url && !p.audio_url && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Text</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                                                background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`
                                            }}>
                                                {p.severity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                                            {p.category || 'Citizen Report'}
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: '#94a3b8' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={12} style={{ color: '#8b5cf6' }} />
                                                {typeof p.location === 'string' ? p.location : 'Submitted Report'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                                            {Math.round(p.priority_score || p.riskScore || 50)}
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                                                background: isResolved ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                                color: isResolved ? '#4ade80' : '#fbbf24'
                                            }}>
                                                {isResolved ? 'Resolved' : 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <ProblemActionMenu 
                                                problem={p} 
                                                onUpdate={(targetId, action) => {
                                                    const pid = targetId || p.id;
                                                    if (action === 'assigned' || action === 'deleted') {
                                                        setProblems((prev) => prev.filter((item) => item.id !== pid));
                                                    } else {
                                                        loadReports();
                                                    }
                                                }} 
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
