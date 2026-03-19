import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Server, AlertTriangle, CheckCircle2, Clock,
    Search, Filter, Cpu, HardDrive, Wifi, Zap, TrendingUp,
    TrendingDown, Minus, RefreshCw, Trash2, Circle,
    Shield, BarChart3, Binary, Layout
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const STATUS_CONFIG = {
    Healthy: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.1)' },
    Warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.2)' },
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', glow: 'rgba(239,68,68,0.4)' },
    Degraded: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', glow: 'rgba(249,115,22,0.2)' },
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

const Sparkline = ({ data, color }) => (
    <div style={{ width: '80px', height: '24px' }}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <Line
                    type="monotone"
                    dataKey="val"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export default function SystemMonitoring() {
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const [insights, setInsights] = useState(null);
    const [showInsights, setShowInsights] = useState(false);
    const [history, setHistory] = useState({}); // Tracking historical values for sparklines
    const navigate = useNavigate();

    const fetchMetrics = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const data = await api.get('/system-metrics');
            setMetrics(data);

            // Update sparkline history
            setHistory(prev => {
                const newHistory = { ...prev };
                data.forEach(m => {
                    if (!newHistory[m.id]) newHistory[m.id] = [];
                    newHistory[m.id] = [...newHistory[m.id], { val: m.currentValue }].slice(-10);
                });
                return newHistory;
            });
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, []);

    const fetchInsights = async () => {
        try {
            const data = await api.get('/system-metrics/insights');
            setInsights(data);
            setShowInsights(true);
        } catch (err) {
            console.error('Failed to fetch insights:', err);
        }
    };

    // Initial load
    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    // Real-time polling simulation
    useEffect(() => {
        if (metrics.length === 0) return;
        const interval = setInterval(() => {
            fetchMetrics(true);
        }, 3000);
        return () => clearInterval(interval);
    }, [metrics.length, fetchMetrics]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await api.post('/system-metrics/generate', { count: 8 });
            fetchMetrics();
        } catch (err) {
            console.error('Failed to generate metrics:', err);
        } finally {
            setGenerating(false);
        }
    };

    const handleClear = async () => {
        try {
            await api.delete('/system-metrics/clear');
            setMetrics([]);
            setHistory({});
        } catch (err) {
            console.error('Failed to clear metrics:', err);
        }
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

    if (loading && metrics.length === 0) {
        return (
            <div className="loading-container">
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 20px' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Initializing AI health monitor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>System Monitoring</h1>
                    <p>AI-powered infrastructure health monitoring — real-time control center</p>
                </div>
                {metrics.length > 0 && (
                    <button
                        onClick={fetchInsights}
                        className="btn btn-primary"
                        style={{
                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                            border: 'none', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px'
                        }}
                    >
                        <Binary size={18} /> Get AI Insights
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showInsights && insights && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            background: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '12px', padding: '16px 20px', marginBottom: '24px',
                            display: 'flex', gap: '20px', alignItems: 'center', position: 'relative'
                        }}
                    >
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6'
                        }}>
                            <Shield size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '4px' }}>
                                AI Diagnostic Insight
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                {insights.summary}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Recommendation:</span> {insights.recommendation}
                            </div>
                        </div>
                        <button onClick={() => setShowInsights(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <Zap size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            whiteSpace: 'nowrap', border: 'none'
                        }}>
                        <RefreshCw size={14} className={generating ? 'spin' : ''} />
                        {generating ? 'Generating…' : 'Add Systems'}
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

            {/* Metrics List/Table */}
            <div className="glass-card animate-in" style={{ overflow: 'auto', minHeight: '300px' }}>
                {metrics.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {['ID', 'Subsystem', 'Type', 'Current Value', 'Status', 'Location', 'Real-time Trend', 'Action'].map((h) => (
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

                                return (
                                    <motion.tr
                                        key={m.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            transition: 'background 0.2s ease',
                                            boxShadow: m.status === 'Critical' ? `inset 4px 0 0 ${st.color}` : 'none',
                                            background: m.status === 'Critical' ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = m.status === 'Critical' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = m.status === 'Critical' ? 'rgba(239, 68, 68, 0.02)' : 'transparent'}>
                                        <td style={{ padding: '14px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#8b5cf6' }}>
                                            {m.id}
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    padding: '8px', borderRadius: '8px', background: st.bg, color: st.color,
                                                    boxShadow: m.status === 'Critical' ? `0 0 10px ${st.glow}` : 'none'
                                                }}>
                                                    <MetricIcon size={16} />
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {m.subsystemName}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {m.metricType}
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ flex: 1, minWidth: '40px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: st.color }}>
                                                            {m.currentValue}{m.unit}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        width: '100px', height: '5px', borderRadius: '3px',
                                                        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                                                    }}>
                                                        <motion.div
                                                            animate={{ width: `${pct}%` }}
                                                            style={{
                                                                height: '100%', borderRadius: '3px',
                                                                background: st.color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem',
                                                fontWeight: 700, background: st.bg, color: st.color,
                                                border: `1px solid ${st.border}`,
                                                textTransform: 'uppercase', letterSpacing: '0.05em'
                                            }}>
                                                <Circle size={6} fill={st.color} /> {m.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            {m.location}
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Sparkline data={history[m.id] || []} color={st.color} />
                                                <div style={{ fontSize: '0.7rem', color: m.trend === 'Improving' ? '#10b981' : m.trend === 'Degrading' ? '#ef4444' : 'var(--text-muted)' }}>
                                                    {m.trend === 'Degrading' ? <TrendingDown size={12} /> : m.trend === 'Improving' ? <TrendingUp size={12} /> : <Minus size={12} />}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <button
                                                onClick={() => navigate(`/system-monitoring/${m.id}`)}
                                                className="btn btn-ghost"
                                                style={{
                                                    padding: '6px 12px', fontSize: '0.75rem',
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.05)'
                                                }}>
                                                <BarChart3 size={13} /> Diagnostics
                                            </button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div style={{
                        height: '400px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                        padding: '40px'
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '25px',
                            background: 'rgba(255,255,255,0.03)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <Layout size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                            No active systems connected
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', marginBottom: '24px', lineHeight: 1.6 }}>
                            The System Health module is currently idle. Connect your governance infrastructure subsystems to begin real-time monitoring and AI diagnostics.
                        </p>
                        <button
                            onClick={handleGenerate}
                            className="btn btn-primary"
                            style={{ padding: '12px 32px', fontWeight: 600 }}
                        >
                            Connect Data Sources
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Info Bar */}
            {metrics.length > 0 && (
                <div style={{
                    marginTop: '20px', padding: '12px 20px', borderRadius: '12px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Stability: 99.8%
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Clock size={12} /> Last Sync: Just Now
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 600 }}>
                        <Binary size={12} /> AI AUTO-PILOT ACTIVE
                    </div>
                </div>
            )}
        </div>
    );
}
