import { useState, useEffect } from 'react';
import { useNavigate, useLocation as useRouteLocation } from 'react-router-dom';
import {
    AlertTriangle, MapPin, Clock, Zap,
    CheckCircle2, Filter, Search, Globe, Layers,
    Play, RefreshCw, Radio, Sparkles
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { triggerPipeline, fetchPipelineStatus, fetchSignalProblems } from '../services/api';
import ProblemActionMenu from '../components/ProblemActionMenu';

const SEVERITY_CONFIG = {
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    High: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    Low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};

export default function SignalMonitor() {
    const { location, hasLocation, locationLabel } = useLocation();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [pipelineStatus, setPipelineStatus] = useState(null);
    const [runningPipeline, setRunningPipeline] = useState(false);
    const [notification, setNotification] = useState(null);
    const navigate = useNavigate();
    const routeLocation = useRouteLocation();

    useEffect(() => {
        if (routeLocation.state?.searchParam) {
            setSearch(routeLocation.state.searchParam);
        }
    }, [routeLocation.state]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchSignalProblems(location);
            const formatted = (data || []).map((p) => ({
                ...p,
                severity: p.severity || "Medium",
                status: p.status || "Pending",
                riskScore: p.riskScore || p.risk || 0,
                location: p.location || "Unknown"
            }));
            setProblems(formatted);
        } catch (err) {
            console.error('[SignalMonitor] Error fetching signals:', err);
        } finally {
            setLoading(false);
        }

        try {
            const pStatus = await fetchPipelineStatus();
            setPipelineStatus(pStatus);
        } catch (err) {
            console.error('[SignalMonitor] Error fetching pipeline status:', err);
        }
    };

    useEffect(() => {
        loadData();
    }, [location.state, location.district, location.city, location.ward]);

    const handleRunPipeline = async () => {
        setRunningPipeline(true);
        setNotification({ type: 'info', message: 'Triggering data ingestion scraper pipeline...' });
        try {
            const targetCity = location.city || location.district || null;
            const res = await triggerPipeline(targetCity);
            setNotification({
                type: 'success',
                message: res?.message || `Pipeline started successfully${targetCity ? ` for ${targetCity}` : ''}!`
            });
            // Re-fetch after 3 seconds to get newly ingested data
            setTimeout(() => {
                loadData();
            }, 3000);
        } catch (err) {
            console.error('Failed to run pipeline:', err);
            setNotification({
                type: 'error',
                message: 'Failed to start pipeline. Please check backend service.'
            });
        } finally {
            setRunningPipeline(false);
            setTimeout(() => setNotification(null), 6000);
        }
    };

    const filtered = problems.filter((p) => {
        if (filterSeverity !== 'ALL' && p.severity !== filterSeverity) return false;
        if (filterStatus !== 'ALL') {
            if (filterStatus === 'Resolved' && p.status !== 'Problem Resolved') return false;
            if (filterStatus === 'Pending' && p.status !== 'Pending') return false;
        }
        if (search &&
            !p.title?.toLowerCase().includes(search.toLowerCase()) &&
            !p.id?.toLowerCase().includes(search.toLowerCase()) &&
            !p.category?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: problems.length,
        critical: problems.filter((p) => p.severity === 'Critical').length,
        pending: problems.filter((p) => p.status === 'Pending').length,
        resolved: problems.filter((p) => p.status === 'Problem Resolved').length,
    };

    return (
        <div className="dashboard-page-wrapper animate-in">
            {/* Header Banner */}
            <div className="hero-banner-card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Signals Monitor
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                            <Radio size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                            Pipeline Connected
                        </span>
                    </h1>
                    <p className="hero-subtext">Real-time governance signal tracking — ingest, analyze, and resolve detected problems</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="navbar-location-pill" style={{ background: '#181c2e' }}>
                        <Globe size={14} className="location-icon" />
                        <span>{hasLocation ? locationLabel() : 'All India'}</span>
                    </div>

                    <button
                        onClick={handleRunPipeline}
                        disabled={runningPipeline}
                        style={{
                            padding: '8px 16px', background: runningPipeline ? '#475569' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: '10px', cursor: runningPipeline ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)', transition: 'all 0.2s'
                        }}
                    >
                        <Play size={15} className={runningPipeline ? 'animate-spin' : ''} />
                        <span>{runningPipeline ? 'Running Ingestion...' : 'Run Ingestion Pipeline'}</span>
                    </button>

                    <button
                        onClick={loadData}
                        disabled={loading}
                        style={{
                            padding: '8px 14px', background: '#181c2e', color: '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600
                        }}
                        title="Refresh Signals"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Pipeline Toast Notification */}
            {notification && (
                <div style={{
                    padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 600,
                    background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    border: `1px solid ${notification.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                    color: notification.type === 'error' ? '#f87171' : '#60a5fa',
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    <Sparkles size={16} />
                    <span>{notification.message}</span>
                </div>
            )}

            {/* Pipeline Status Summary Card */}
            {pipelineStatus && (
                <div className="panel-card" style={{ marginBottom: '20px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'rgba(24, 28, 46, 0.6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            <strong style={{ color: '#f8fafc' }}>Total Ingested Articles:</strong> {pipelineStatus.total_articles || 0}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            <strong style={{ color: '#f8fafc' }}>Scraper Schedule:</strong> {pipelineStatus.scheduler || '30 min interval'}
                        </div>
                    </div>
                    {pipelineStatus.last_scraped_at && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Last Sync: {new Date(pipelineStatus.last_scraped_at).toLocaleString()}
                        </div>
                    )}
                </div>
            )}

            {/* Stats Cards */}
            <div className="at-a-glance-stats-grid" style={{ marginBottom: '20px' }}>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper blue">
                        <Zap size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">{stats.total}</div>
                        <div className="stat-name">Problem Clusters</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper red">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#f87171' }}>{stats.critical}</div>
                        <div className="stat-name">Critical Issues</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper orange">
                        <Clock size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#fbbf24' }}>{stats.pending}</div>
                        <div className="stat-name">Actions Pending</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper green">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#4ade80' }}>{stats.resolved}</div>
                        <div className="stat-name">Issues Resolved</div>
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
                            placeholder="Search signals by ID, title or category..."
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

            {/* Signal Problems Table */}
            <div className="panel-card" style={{ padding: '20px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        Loading signals from pipeline...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No governance signals match the current filters. Click "Run Ingestion Pipeline" to fetch fresh data.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                {['ID', 'Title', 'Frequency', 'Severity', 'Category', 'Location', 'Priority', 'Status', 'Action'].map((h) => (
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
                                const isResolved = p.status === 'Problem Resolved';
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
                                        <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: '#94a3b8' }}>
                                            {p.frequency || 1} mentions
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
                                            {p.category || 'General'}
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: '#94a3b8' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={12} style={{ color: '#8b5cf6' }} />
                                                {p.location}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                                            {Math.round(p.priority_score || p.riskScore || 0)}
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
                                                        if (action === 'assigned') {
                                                            setNotification({
                                                                type: 'info',
                                                                message: `Problem taken under active custody! It has been moved to Working Problems.`
                                                            });
                                                            setTimeout(() => setNotification(null), 5000);
                                                        }
                                                    } else {
                                                        loadData();
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
