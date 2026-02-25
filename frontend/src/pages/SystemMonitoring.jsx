import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Server, AlertTriangle, CheckCircle2, Clock,
    Search, Filter, Cpu, HardDrive, Wifi, Zap, TrendingUp,
    TrendingDown, Minus, RefreshCw, Trash2, Eye, Circle,
} from 'lucide-react';

const STATUS_CONFIG = {
    Healthy: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    Warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    Degraded: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
};

const METRIC_ICONS = {
    'CPU Usage': Cpu,
    'Memory Usage': HardDrive,
    'Latency': Clock,
    'Throughput': Zap,
    'Error Rate': AlertTriangle,
    'Uptime': CheckCircle2,
    'Disk I/O': HardDrive,
    'Network Bandwidth': Wifi,
};

const TrendIcon = ({ trend }) => {
    if (trend === 'Improving') return <TrendingUp size={13} style={{ color: '#10b981' }} />;
    if (trend === 'Degrading') return <TrendingDown size={13} style={{ color: '#ef4444' }} />;
    return <Minus size={13} style={{ color: '#64748b' }} />;
};

export default function SystemMonitoring() {
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const navigate = useNavigate();

    const fetchMetrics = () => {
        setLoading(true);
        fetch('/api/system-metrics')
            .then((r) => r.json())
            .then((data) => setMetrics(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMetrics(); }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/system-metrics/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: 5 }),
            });
            if (res.ok) fetchMetrics();
        } catch (err) { console.error(err); }
        finally { setGenerating(false); }
    };

    const handleClear = async () => {
        try {
            await fetch('/api/system-metrics/clear', { method: 'DELETE' });
            fetchMetrics();
        } catch (err) { console.error(err); }
    };

    const filtered = metrics.filter((m) => {
        if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
        if (filterType !== 'ALL' && m.metricType !== filterType) return false;
        if (search && !m.subsystemName.toLowerCase().includes(search.toLowerCase()) &&
            !m.id.toLowerCase().includes(search.toLowerCase()) &&
            !m.metricType.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: metrics.length,
        healthy: metrics.filter((m) => m.status === 'Healthy').length,
        warning: metrics.filter((m) => m.status === 'Warning').length,
        critical: metrics.filter((m) => m.status === 'Critical' || m.status === 'Degraded').length,
    };

    const metricTypes = [...new Set(metrics.map((m) => m.metricType))];

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>System Monitoring</h1>
                <p>AI-powered infrastructure health monitoring — real-time metrics with Gemini diagnostics</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid animate-in">
                <div className="glass-card stat-card blue">
                    <div className="stat-icon"><Server size={22} /></div>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Systems</div>
                </div>
                <div className="glass-card stat-card green">
                    <div className="stat-icon"><CheckCircle2 size={22} /></div>
                    <div className="stat-value" style={{ color: '#10b981' }}>{stats.healthy}</div>
                    <div className="stat-label">Healthy</div>
                </div>
                <div className="glass-card stat-card amber">
                    <div className="stat-icon"><AlertTriangle size={22} /></div>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.warning}</div>
                    <div className="stat-label">Warning</div>
                </div>
                <div className="glass-card stat-card red">
                    <div className="stat-icon"><Activity size={22} /></div>
                    <div className="stat-value" style={{ color: '#ef4444' }}>{stats.critical}</div>
                    <div className="stat-label">Critical / Degraded</div>
                </div>
            </div>

            {/* Action Bar */}
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
                    <input type="text" placeholder="Search systems..." value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-primary)',
                            fontSize: '0.85rem', fontFamily: 'var(--font-family)', outline: 'none', width: '100%',
                        }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-color)', borderRadius: '8px',
                            color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-family)',
                        }}>
                        <option value="ALL">All Status</option>
                        <option value="Healthy">Healthy</option>
                        <option value="Warning">Warning</option>
                        <option value="Critical">Critical</option>
                        <option value="Degraded">Degraded</option>
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-color)', borderRadius: '8px',
                            color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-family)',
                        }}>
                        <option value="ALL">All Types</option>
                        {metricTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleGenerate} disabled={generating}
                        className="btn btn-primary"
                        style={{
                            padding: '8px 16px', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                            whiteSpace: 'nowrap',
                        }}>
                        <RefreshCw size={14} className={generating ? 'spin' : ''} />
                        {generating ? 'Generating…' : 'Generate with AI'}
                    </button>
                    <button onClick={handleClear}
                        className="btn btn-ghost"
                        style={{
                            padding: '8px 14px', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
            </div>

            {/* Metrics Table */}
            <div className="glass-card animate-in" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            {['ID', 'Subsystem', 'Type', 'Value', 'Status', 'Location', 'Trend', 'Action'].map((h) => (
                                <th key={h} style={{
                                    padding: '14px 12px', textAlign: 'left', fontSize: '0.72rem',
                                    fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((m, idx) => {
                            const st = STATUS_CONFIG[m.status] || STATUS_CONFIG.Healthy;
                            const MetricIcon = METRIC_ICONS[m.metricType] || Activity;
                            const pct = m.thresholdValue > 0 ? Math.min((m.currentValue / m.thresholdValue) * 100, 100) : 0;
                            const barColor = m.status === 'Critical' ? '#ef4444' : m.status === 'Warning' ? '#f59e0b' : m.status === 'Degraded' ? '#f97316' : '#10b981';

                            return (
                                <tr key={m.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background 0.2s ease',
                                    animation: `fadeInUp 0.3s ease ${idx * 0.04}s both`,
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '14px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#8b5cf6' }}>
                                        {m.id}
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <MetricIcon size={16} style={{ color: st.color, opacity: 0.8 }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                {m.subsystemName}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        {m.metricType}
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '50px', height: '6px', borderRadius: '3px',
                                                background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${pct}%`, height: '100%', borderRadius: '3px',
                                                    background: barColor,
                                                    transition: 'width 0.6s ease',
                                                }} />
                                            </div>
                                            <span style={{
                                                fontSize: '0.8rem', fontWeight: 700, color: barColor,
                                                minWidth: '70px',
                                            }}>
                                                {m.currentValue}{m.unit}
                                            </span>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                / {m.thresholdValue}{m.unit}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem',
                                            fontWeight: 600, background: st.bg, color: st.color,
                                            border: `1px solid ${st.border}`,
                                        }}>
                                            <Circle size={8} fill={st.color} /> {m.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        {m.location}
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            fontSize: '0.78rem', fontWeight: 600,
                                            color: m.trend === 'Improving' ? '#10b981' : m.trend === 'Degrading' ? '#ef4444' : '#64748b',
                                        }}>
                                            <TrendIcon trend={m.trend} /> {m.trend}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <button
                                            onClick={() => navigate(`/system-monitoring/${m.id}`)}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '6px 14px', fontSize: '0.75rem',
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                whiteSpace: 'nowrap',
                                            }}>
                                            <Eye size={13} /> Analyze
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                        <Server size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p>No system metrics match your filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
