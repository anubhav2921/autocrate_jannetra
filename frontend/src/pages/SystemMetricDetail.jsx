import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Activity, Server, AlertTriangle, CheckCircle2, Clock,
    Cpu, HardDrive, Wifi, Zap, MapPin, TrendingUp, TrendingDown,
    Minus, Brain, Wrench, ShieldCheck, RefreshCw, Circle,
} from 'lucide-react';
import api from '../services/apiClient';

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

export default function SystemMetricDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [metric, setMetric] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [acknowledging, setAcknowledging] = useState(false);

    useEffect(() => {
        api.get(`/system-metrics/${id}`)
            .then((data) => setMetric(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const data = await api.post(`/system-metrics/${id}/analyze`);
            if (data.success) {
                setMetric((prev) => ({
                    ...prev,
                    aiDiagnosis: data.aiDiagnosis,
                    aiRecommendation: data.aiRecommendation,
                }));
            }
        } catch (err) { console.error(err); }
        finally { setAnalyzing(false); }
    };

    const handleAcknowledge = async () => {
        setAcknowledging(true);
        try {
            const data = await api.patch(`/system-metrics/${id}/acknowledge`);
            if (data.success) {
                setMetric((prev) => ({ ...prev, status: 'Healthy', trend: 'Improving' }));
            }
        } catch (err) { console.error(err); }
        finally { setAcknowledging(false); }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    if (!metric) {
        return (
            <div className="page-container">
                <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
                    <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: '12px' }} />
                    <h2 style={{ color: 'var(--text-primary)' }}>Metric Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The metric "{id}" does not exist.</p>
                    <button onClick={() => navigate('/system-monitoring')} className="btn btn-primary" style={{ marginTop: '16px' }}>
                        <ArrowLeft size={14} /> Back to System Monitoring
                    </button>
                </div>
            </div>
        );
    }

    const st = STATUS_CONFIG[metric.status] || STATUS_CONFIG.Healthy;
    const MetricIcon = METRIC_ICONS[metric.metricType] || Activity;
    const isHealthy = metric.status === 'Healthy';
    const pct = metric.thresholdValue > 0 ? Math.min((metric.currentValue / metric.thresholdValue) * 100, 100) : 0;
    const gaugeColor = metric.status === 'Critical' ? '#ef4444' : metric.status === 'Warning' ? '#f59e0b' : metric.status === 'Degraded' ? '#f97316' : '#10b981';

    return (
        <div className="page-container">
            {/* Back Button */}
            <button onClick={() => navigate('/system-monitoring')} className="btn btn-ghost animate-in"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '8px 14px' }}>
                <ArrowLeft size={16} /> Back to System Monitoring
            </button>

            {/* Header Card */}
            <div className="glass-card animate-in" style={{ position: 'relative', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px',
                    background: st.color,
                }} />

                <div style={{ paddingLeft: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: '0.82rem', fontWeight: 700, color: '#8b5cf6',
                                    background: 'rgba(139,92,246,0.1)', padding: '4px 12px', borderRadius: '6px',
                                }}>{metric.id}</span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem',
                                    fontWeight: 600, background: st.bg, color: st.color,
                                    border: `1px solid ${st.border}`,
                                }}>
                                    <Circle size={8} fill={st.color} /> {metric.status}
                                </span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    fontSize: '0.75rem', fontWeight: 600,
                                    color: metric.trend === 'Improving' ? '#10b981' : metric.trend === 'Degrading' ? '#ef4444' : '#64748b',
                                }}>
                                    {metric.trend === 'Improving' ? <TrendingUp size={13} /> : metric.trend === 'Degrading' ? <TrendingDown size={13} /> : <Minus size={13} />}
                                    {metric.trend}
                                </span>
                            </div>
                            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <MetricIcon size={24} style={{ color: st.color }} />
                                {metric.subsystemName}
                            </h1>
                        </div>

                        {/* Gauge Circle */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '90px', height: '90px' }}>
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={gaugeColor}
                                        strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: gaugeColor }}>
                                        {metric.currentValue}
                                    </span>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{metric.unit}</span>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                                THRESHOLD: {metric.thresholdValue}{metric.unit}
                            </div>
                        </div>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Activity size={13} /> {metric.metricType}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={13} /> {metric.location}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} /> Last Check: {metric.lastCheckedAt ? new Date(metric.lastCheckedAt).toLocaleString() : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Diagnosis & Recommendation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                {/* Diagnosis Card */}
                <div className="glass-card animate-in">
                    <div className="section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Brain size={18} style={{ color: '#8b5cf6' }} /> AI Diagnosis
                    </div>
                    <p style={{
                        fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.8,
                        background: 'rgba(139,92,246,0.04)', padding: '20px', borderRadius: '10px',
                        border: '1px solid rgba(139,92,246,0.15)',
                        minHeight: '80px',
                    }}>
                        {metric.aiDiagnosis || 'No AI diagnosis available yet. Click "Run AI Analysis" to generate one.'}
                    </p>
                </div>

                {/* Recommendation Card */}
                <div className="glass-card animate-in">
                    <div className="section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wrench size={18} style={{ color: '#3b82f6' }} /> AI Recommendation
                    </div>
                    <p style={{
                        fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.8,
                        background: 'rgba(59,130,246,0.04)', padding: '20px', borderRadius: '10px',
                        border: '1px solid rgba(59,130,246,0.15)',
                        minHeight: '80px',
                    }}>
                        {metric.aiRecommendation || 'No recommendation available yet. Click "Run AI Analysis" to generate one.'}
                    </p>
                </div>
            </div>

            {/* Action Section */}
            <div className="glass-card animate-in" style={{
                textAlign: 'center', padding: '32px',
                border: isHealthy ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(139,92,246,0.2)',
                background: isHealthy
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(16,185,129,0.01))'
                    : 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(139,92,246,0.01))',
            }}>
                {isHealthy ? (
                    <>
                        <ShieldCheck size={48} style={{ color: '#10b981', marginBottom: '12px' }} />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                            System Healthy
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                            This subsystem is operating within normal parameters.
                        </p>
                        <button onClick={handleAnalyze} disabled={analyzing}
                            className="btn btn-primary"
                            style={{
                                padding: '12px 28px', fontSize: '0.9rem', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                            }}>
                            <RefreshCw size={16} className={analyzing ? 'spin' : ''} />
                            {analyzing ? 'Analyzing…' : 'Run AI Analysis'}
                        </button>
                    </>
                ) : (
                    <>
                        <Activity size={48} style={{ color: st.color, marginBottom: '12px' }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Attention Required — {metric.status}
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '550px', margin: '0 auto 24px' }}>
                            This subsystem requires attention. Use AI analysis for a detailed diagnosis, or acknowledge if the issue has been resolved.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={handleAnalyze} disabled={analyzing}
                                className="btn btn-primary"
                                style={{
                                    padding: '12px 28px', fontSize: '0.9rem', fontWeight: 600,
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                    boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
                                }}>
                                <RefreshCw size={16} className={analyzing ? 'spin' : ''} />
                                {analyzing ? 'Analyzing…' : 'Run AI Analysis'}
                            </button>
                            <button onClick={handleAcknowledge} disabled={acknowledging}
                                className="btn btn-primary"
                                style={{
                                    padding: '12px 28px', fontSize: '0.9rem', fontWeight: 600,
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                                }}>
                                <CheckCircle2 size={16} />
                                {acknowledging ? 'Acknowledging…' : 'Acknowledge & Resolve'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
