import { useState, useEffect } from 'react';
import {
    AlertTriangle, Building2, Clock, CheckCircle2, Globe, Bell
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, buildLocationParams } from '../services/api';
import { useLocation } from '../context/LocationContext';

export default function Alerts() {
    const { location, hasLocation, locationLabel } = useLocation();
    const [alerts, setAlerts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadAlerts();
    }, [filter, location.state, location.district, location.city, location.ward]);

    const loadAlerts = () => {
        setLoading(true);
        const params = buildLocationParams(location, { active_only: true });
        if (filter) params.severity = filter;
        fetchAlerts(params)
            .then((data) => {
                setAlerts(data.alerts || []);
                setTotal(data.total || 0);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleAcknowledge = async (alertId) => {
        try {
            await acknowledgeAlert(alertId);
            setAlerts(alerts.filter((a) => a.id !== alertId));
            setTotal((prev) => prev - 1);
        } catch (err) {
            console.error(err);
        }
    };

    const severityCounts = alerts.reduce(
        (acc, a) => ({ ...acc, [a.severity]: (acc[a.severity] || 0) + 1 }),
        {}
    );

    if (loading) {
        return (
            <div className="dashboard-page-wrapper">
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading active alerts...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page-wrapper animate-in">
            {/* Header Banner */}
            <div className="hero-banner-card" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.5rem' }}>Alerts & Actions</h1>
                    <p className="hero-subtext">AI-generated governance alerts with department assignments and response strategies</p>
                </div>
                <div className="navbar-location-pill" style={{ background: '#181c2e' }}>
                    <Globe size={14} className="location-icon" />
                    <span>{hasLocation ? locationLabel() : 'All India'}</span>
                </div>
            </div>

            {/* Severity Summary Cards */}
            <div className="at-a-glance-stats-grid" style={{ marginBottom: '20px' }}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                    const colors = {
                        CRITICAL: { iconClass: 'red', textColor: '#f87171' },
                        HIGH: { iconClass: 'orange', textColor: '#fbbf24' },
                        MEDIUM: { iconClass: 'purple', textColor: '#c084fc' },
                        LOW: { iconClass: 'green', textColor: '#4ade80' },
                    };
                    return (
                        <div
                            key={sev}
                            className="glance-stat-item"
                            style={{ cursor: 'pointer', border: filter === sev ? '1px solid #6366f1' : undefined }}
                            onClick={() => setFilter(filter === sev ? '' : sev)}
                        >
                            <div className={`stat-icon-wrapper ${colors[sev].iconClass}`}>
                                <Bell size={20} />
                            </div>
                            <div className="stat-info">
                                <div className="stat-num" style={{ color: colors[sev].textColor }}>
                                    {severityCounts[sev] || 0}
                                </div>
                                <div className="stat-name">{sev} ALERTS</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Alerts List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {alerts.length === 0 ? (
                    <div className="panel-card" style={{ textAlign: 'center', padding: '48px' }}>
                        <CheckCircle2 size={48} style={{ color: '#4ade80', margin: '0 auto 12px' }} />
                        <h3 style={{ color: '#f8fafc', marginBottom: '4px' }}>No Active Alerts</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>All regional signals are stable and verified.</p>
                    </div>
                ) : (
                    alerts.map((a) => {
                        const isCrit = a.severity === 'CRITICAL' || a.severity === 'HIGH';
                        return (
                            <div
                                key={a.id}
                                className="panel-card"
                                style={{
                                    borderLeft: `4px solid ${isCrit ? '#ef4444' : '#f59e0b'}`,
                                    padding: '22px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={`severity-badge ${a.severity?.toLowerCase()}`}>
                                            {a.severity}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                            {new Date(a.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: '#94a3b8' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Building2 size={14} style={{ color: '#8b5cf6' }} />
                                            {a.department}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} style={{ color: '#fbbf24' }} />
                                            {a.urgency}
                                        </span>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '12px', lineHeight: 1.4 }}>
                                    {a.article?.title}
                                </h3>

                                <div style={{ background: '#181c2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#60a5fa', uppercase: 'true', marginBottom: '4px' }}>
                                        RECOMMENDED RESPONSE STRATEGY
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                                        {a.recommendation || a.response_strategy}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="ai-assistant-btn"
                                        style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
                                        onClick={() => handleAcknowledge(a.id)}
                                    >
                                        <CheckCircle2 size={16} /> Acknowledge & Deploy Team
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
