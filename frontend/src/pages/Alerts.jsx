import { useState, useEffect } from 'react';
import {
    AlertTriangle, MapPin, Building2, Clock, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, buildLocationParams } from '../services/api';
import { useLocation } from '../context/LocationContext';

export default function Alerts() {
    const { location } = useLocation();
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
            <div className="loading-container"><div className="spinner" /></div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Alerts & Recommended Actions</h1>
                <p>AI-generated governance alerts with department assignments and response strategies</p>
            </div>

            {/* Severity Summary */}
            <div className="stats-grid" style={{ marginBottom: '20px' }}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                    const colors = {
                        CRITICAL: { card: 'red', color: '#dc2626' },
                        HIGH: { card: 'red', color: '#ef4444' },
                        MEDIUM: { card: 'amber', color: '#f59e0b' },
                        LOW: { card: 'green', color: '#10b981' },
                    };
                    return (
                        <div
                            key={sev}
                            className={`glass-card stat-card ${colors[sev].card} animate-in`}
                            style={{ cursor: 'pointer', opacity: filter === sev ? 1 : 0.7 }}
                            onClick={() => setFilter(filter === sev ? '' : sev)}
                        >
                            <div className="stat-value" style={{ color: colors[sev].color, fontSize: '1.6rem' }}>
                                {severityCounts[sev] || 0}
                            </div>
                            <div className="stat-label">{sev}</div>
                        </div>
                    );
                })}
            </div>

            {/* Alert List */}
            <div style={{ marginTop: '8px' }}>
                {alerts.length === 0 ? (
                    <div className="glass-card animate-in" style={{ textAlign: 'center', padding: '48px' }}>
                        <CheckCircle2 size={48} style={{ color: 'var(--risk-low)', marginBottom: '12px' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>No active alerts — governance is stable.</p>
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`alert-card severity-${alert.severity?.toLowerCase()} animate-in`}
                        >
                            <div className="alert-card-header">
                                <div>
                                    <span className={`badge badge-${alert.severity?.toLowerCase()}`}>
                                        <AlertTriangle size={11} style={{ marginRight: '4px' }} />
                                        {alert.severity}
                                    </span>
                                    <h3 style={{
                                        fontSize: '0.95rem', fontWeight: 600, marginTop: '8px',
                                        color: 'var(--text-primary)',
                                    }}>
                                        {alert.article?.title}
                                    </h3>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleAcknowledge(alert.id)}
                                    title="Acknowledge & resolve this alert"
                                >
                                    <CheckCircle2 size={14} style={{ marginRight: '4px' }} />
                                    Acknowledge
                                </button>
                            </div>

                            <div className="alert-card-body">
                                <p><strong>Recommendation:</strong> {alert.recommendation}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Response Strategy:</strong> {alert.response_strategy}
                                </p>
                            </div>

                            <div className="alert-card-meta">
                                <span><Building2 size={13} /> {alert.department}</span>
                                <span><MapPin size={13} /> {alert.article?.location}</span>
                                <span><Clock size={13} /> {alert.urgency}</span>
                                <span>
                                    <ChevronRight size={13} />
                                    {alert.article?.category}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
