import { useState, useEffect, useRef } from 'react';
import {
    Bell, Search, AlertTriangle, CheckCircle2, ChevronRight, X, Building2,
    MapPin, Clock, Globe, ChevronDown,
} from 'lucide-react';
import { fetchDashboard, fetchAlerts, acknowledgeAlert } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import LocationFilter from './LocationFilter';

export default function Navbar({ user }) {
    const [alertCount, setAlertCount] = useState(0);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertsData, setAlertsData] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const dropdownRef = useRef(null);
    const locationDropdownRef = useRef(null);
    const navigate = useNavigate();
    const { hasLocation, locationLabel } = useLocation();

    useEffect(() => {
        fetchDashboard()
            .then((data) => setAlertCount(data.active_alerts || 0))
            .catch(() => { });
    }, []);

    // Close both dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsAlertOpen(false);
            }
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target)) {
                setIsLocationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleAlertOpen = () => {
        const nextState = !isAlertOpen;
        setIsAlertOpen(nextState);
        setIsLocationOpen(false);
        if (nextState) {
            setAlertCount(0);
            setLoadingAlerts(true);
            fetchAlerts({ active_only: true, limit: 10 })
                .then(data => setAlertsData(data.alerts || []))
                .catch(console.error)
                .finally(() => setLoadingAlerts(false));
        }
    };

    const toggleLocationOpen = () => {
        setIsLocationOpen(prev => !prev);
        setIsAlertOpen(false);
    };

    return (
        <>
            <header className="navbar">
                <div className="navbar-left">
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="navbar-search"
                        placeholder="Search signals, alerts, locations..."
                    />
                </div>
                <div className="navbar-right">

                    {/* ── Location Selector ─────────────────────────── */}
                    <div style={{ position: 'relative' }} ref={locationDropdownRef}>
                        <button
                            id="btn-location-selector"
                            className={`navbar-location-btn ${hasLocation ? 'navbar-location-btn-active' : ''}`}
                            onClick={toggleLocationOpen}
                            title="Select location"
                        >
                            {hasLocation ? (
                                <MapPin size={14} className="navbar-location-icon" />
                            ) : (
                                <Globe size={14} className="navbar-location-icon" />
                            )}
                            <span className="navbar-location-label">
                                {hasLocation ? locationLabel() : 'All India'}
                            </span>
                            <ChevronDown
                                size={12}
                                style={{
                                    transition: 'transform 0.2s',
                                    transform: isLocationOpen ? 'rotate(180deg)' : 'rotate(0)',
                                }}
                            />
                        </button>

                        {isLocationOpen && (
                            <div
                                className="location-dropdown-panel glass-card animate-in"
                                style={{
                                    position: 'absolute',
                                    top: '45px',
                                    right: '0',
                                    zIndex: 1001,
                                    width: '380px',
                                }}
                            >
                                <LocationFilter
                                    compact={true}
                                    onApply={() => setIsLocationOpen(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Alert Bell ────────────────────────────────── */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button className="notification-btn" title="Alerts" onClick={toggleAlertOpen}>
                            <Bell size={20} />
                            {alertCount > 0 && (
                                <span className="notification-badge">{alertCount > 99 ? '99+' : alertCount}</span>
                            )}
                        </button>

                        {isAlertOpen && (
                            <div className="notifications-dropdown glass-card animate-in" style={{
                                position: 'absolute', top: '45px', right: '0', width: '380px',
                                padding: '12px', zIndex: 1000, border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)', background: '#1e293b'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>Recent Notifications</span>
                                    <button onClick={() => { setIsAlertOpen(false); navigate('/alerts'); }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>View All</button>
                                </div>
                                {loadingAlerts ? (
                                    <div style={{ padding: '20px', textAlign: 'center' }}><div className="spinner" style={{ width: 20, height: 20, margin: 'auto' }} /></div>
                                ) : alertsData.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                        <CheckCircle2 size={24} style={{ margin: '0 auto 8px', color: '#10b981' }} />
                                        No active alerts
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {alertsData.map(a => (
                                            <div
                                                key={a.id}
                                                onClick={() => { setSelectedAlert(a); setIsAlertOpen(false); }}
                                                style={{
                                                    padding: '10px', background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: '6px', cursor: 'pointer',
                                                    borderLeft: `4px solid ${a.severity === 'CRITICAL' ? '#dc2626' : a.severity === 'HIGH' ? '#ef4444' : '#f59e0b'}`,
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            >
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>{a.article?.title?.substring(0, 60)}...</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                                        <AlertTriangle size={12} style={{ color: a.severity === 'CRITICAL' ? '#dc2626' : a.severity === 'HIGH' ? '#ef4444' : '#f59e0b' }} />
                                                        {a.severity}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                                                        Details <ChevronRight size={12} />
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── User Avatar ───────────────────────────────── */}
                    <div
                        className="user-avatar"
                        title={user?.name || 'Admin'}
                        onClick={() => navigate('/account')}
                        style={{ cursor: 'pointer' }}
                    >
                        {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                </div>
            </header>

            {/* Alert Details Modal */}
            {selectedAlert && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }} onClick={() => setSelectedAlert(null)}>
                    <div className="glass-card animate-in" style={{
                        background: '#0f172a', width: '90%', maxWidth: '600px',
                        padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                        position: 'relative', overflowY: 'auto', maxHeight: '90vh'
                    }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedAlert(null)} style={{
                            position: 'absolute', top: '16px', right: '16px', background: 'none',
                            border: 'none', color: '#94a3b8', cursor: 'pointer'
                        }}>
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <span className={`badge badge-${selectedAlert.severity?.toLowerCase()}`}>
                                <AlertTriangle size={14} style={{ marginRight: '6px' }} />
                                {selectedAlert.severity} ALERT
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(selectedAlert.created_at).toLocaleString()}</span>
                        </div>

                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', lineHeight: 1.4 }}>
                            {selectedAlert.article?.title}
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                <Building2 size={16} style={{ color: '#3b82f6' }} />
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Department</div>
                                    <div style={{ fontWeight: 500 }}>{selectedAlert.department}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                <Clock size={16} style={{ color: '#f59e0b' }} />
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Urgency</div>
                                    <div style={{ fontWeight: 500 }}>{selectedAlert.urgency}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ color: '#cbd5e1', marginBottom: '6px', fontSize: '0.9rem' }}>Recommended Action</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                                {selectedAlert.recommendation}
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ color: '#cbd5e1', marginBottom: '6px', fontSize: '0.9rem' }}>Response Strategy</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {selectedAlert.response_strategy}
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                            <button className="btn btn-ghost" onClick={() => setSelectedAlert(null)}>
                                Close
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                acknowledgeAlert(selectedAlert.id).then(() => {
                                    setSelectedAlert(null);
                                }).catch(console.error);
                            }}>
                                <CheckCircle2 size={16} /> Acknowledge Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
