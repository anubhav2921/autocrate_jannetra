import { useState, useEffect, useRef } from 'react';
import {
    Bell, Search, AlertTriangle, CheckCircle2, ChevronRight, X, Building2,
    MapPin, Clock, Globe, ChevronDown, Moon, Sun, Menu, Command
} from 'lucide-react';
import { fetchLocationDashboard, fetchAlerts, acknowledgeAlert, buildLocationParams } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import LocationFilter from './LocationFilter';

export default function Navbar({ user, onHamburgerClick, isSidebarOpen }) {
    const { theme, toggleTheme } = useTheme();
    const [alertCount, setAlertCount] = useState(3);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertsData, setAlertsData] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const dropdownRef = useRef(null);
    const locationDropdownRef = useRef(null);
    const navigate = useNavigate();
    const { location, hasLocation, locationLabel } = useLocation();

    useEffect(() => {
        fetchLocationDashboard(location)
            .then((data) => setAlertCount(data.active_alerts || 3))
            .catch(() => { });
    }, [location.state, location.district, location.city, location.ward]);

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
            setLoadingAlerts(true);
            fetchAlerts(buildLocationParams(location, { active_only: true, limit: 10 }))
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
                    <button
                        className="hamburger-btn"
                        onClick={onHamburgerClick}
                        aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    >
                        <Menu size={20} />
                    </button>
                    
                    {/* Search Bar matching exact mock screenshot */}
                    <div className="navbar-search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            className="navbar-search-input"
                            placeholder="Search signals, locations, reports..."
                            aria-label="Search signals, locations, reports"
                        />
                        <div className="search-shortcut-badge">
                            <Command size={11} />
                            <span>K</span>
                        </div>
                    </div>
                </div>

                <div className="navbar-right">
                    {/* Location Selector */}
                    <div style={{ position: 'relative' }} ref={locationDropdownRef}>
                        <button
                            id="btn-location-selector"
                            className="navbar-location-pill"
                            onClick={toggleLocationOpen}
                            title="Select location"
                        >
                            <Globe size={14} className="location-icon" />
                            <span className="location-text">
                                {hasLocation ? locationLabel() : 'All India'}
                            </span>
                            <ChevronDown size={13} className="location-arrow" />
                        </button>

                        {isLocationOpen && (
                            <div
                                className="location-dropdown-panel glass-card animate-in"
                                style={{
                                    position: 'absolute',
                                    top: '45px',
                                    right: '0',
                                    zIndex: 1001,
                                    width: '100vw',
                                    maxWidth: '380px',
                                }}
                            >
                                <LocationFilter
                                    compact={true}
                                    onApply={() => setIsLocationOpen(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle Icon Button */}
                    <button 
                        className="navbar-icon-btn" 
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} 
                        onClick={toggleTheme}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Alert Bell Icon Button */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button className="navbar-icon-btn" title="Alerts" onClick={toggleAlertOpen}>
                            <Bell size={18} />
                            {alertCount > 0 && (
                                <span className="navbar-badge-count">{alertCount}</span>
                            )}
                        </button>

                        {isAlertOpen && (
                            <div className="notifications-dropdown glass-card animate-in">
                                <div className="dropdown-header">
                                    <span>Recent Notifications</span>
                                    <button onClick={() => { setIsAlertOpen(false); navigate('/alerts'); }}>View All</button>
                                </div>
                                {loadingAlerts ? (
                                    <div style={{ padding: '20px', textAlign: 'center' }}><div className="spinner" style={{ width: 20, height: 20, margin: 'auto' }} /></div>
                                ) : alertsData.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <CheckCircle2 size={24} style={{ margin: '0 auto 8px', color: 'var(--risk-low)' }} />
                                        No active alerts
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {alertsData.map(a => (
                                            <div
                                                key={a.id}
                                                className="notification-item"
                                                onClick={() => { setSelectedAlert(a); setIsAlertOpen(false); }}
                                            >
                                                <div className="notif-title">{a.article?.title?.substring(0, 60)}...</div>
                                                <div className="notif-meta">
                                                    <span className={`severity-tag ${a.severity?.toLowerCase()}`}>
                                                        <AlertTriangle size={12} />
                                                        {a.severity}
                                                    </span>
                                                    <span>Details <ChevronRight size={12} /></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Profile Circle Avatar (Letter 'D' / Initial) */}
                    <div
                        className="user-avatar-circle"
                        title={user?.name || 'Admin'}
                        onClick={() => navigate('/account')}
                    >
                        {user?.name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                </div>
            </header>

            {/* Alert Details Modal */}
            {selectedAlert && (
                <div className="modal-backdrop" onClick={() => setSelectedAlert(null)}>
                    <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedAlert(null)}>
                            <X size={20} />
                        </button>
                        <div className="modal-header-row">
                            <span className={`badge badge-${selectedAlert.severity?.toLowerCase()}`}>
                                <AlertTriangle size={14} style={{ marginRight: '6px' }} />
                                {selectedAlert.severity} ALERT
                            </span>
                            <span className="modal-date">{new Date(selectedAlert.created_at).toLocaleString()}</span>
                        </div>
                        <h2 className="modal-title">{selectedAlert.article?.title}</h2>
                        <div className="modal-info-grid">
                            <div>
                                <Building2 size={16} />
                                <div>
                                    <div className="label">Department</div>
                                    <div className="val">{selectedAlert.department}</div>
                                </div>
                            </div>
                            <div>
                                <Clock size={16} />
                                <div>
                                    <div className="label">Urgency</div>
                                    <div className="val">{selectedAlert.urgency}</div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-section">
                            <h4>Recommended Action</h4>
                            <p>{selectedAlert.recommendation}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setSelectedAlert(null)}>Close</button>
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
