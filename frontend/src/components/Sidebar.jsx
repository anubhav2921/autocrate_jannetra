import { NavLink, useLocation as useRouterLocation } from 'react-router-dom';
import {
    LayoutDashboard, FileText, Users, AlertTriangle, ShieldAlert,
    BarChart3, FileSpreadsheet, Bot, Map, Activity, Globe, Scan,
    Shield, ChevronRight, Award, User, Download
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import ExportReportModal from './ExportReportModal';

const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/signal-monitor', label: 'Signal Monitor', icon: FileText },
    { path: '/citizen-reports', label: 'Citizen Reports', icon: Users },
    { path: '/working', label: 'Working Problems', icon: ShieldAlert },
    { path: '/alerts', label: 'Alerts & Actions', icon: AlertTriangle },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/map', label: 'Problem Map', icon: Map },
    { path: '/scanner', label: 'Social Scanner', icon: Scan },
    { path: '/system-monitoring', label: 'System Health', icon: Activity },
    { path: '/chatbot', label: 'AI Assistant', icon: Bot },
    { path: '/sources', label: 'Source Registry', icon: Globe },
    { path: '/resolutions', label: 'Resolved Issues', icon: FileSpreadsheet },
    { path: '/leaderboard', label: 'Leaderboard', icon: Award },
    { path: '/account', label: 'My Account', icon: User },
];

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleNavClick = () => {
        if (onClose) onClose();
    };

    return (
        <aside
            className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
            role="navigation"
            aria-label="Main navigation"
        >
            {/* Sidebar Brand Header */}
            <div className="sidebar-brand">
                <div className="brand-logo-icon">
                    <Shield size={20} color="#ffffff" />
                </div>
                <div className="brand-text-container">
                    <h2>Governance Intelligence</h2>
                    <span>Decision Support System</span>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="sidebar-nav">
                <div className="sidebar-nav-group">
                    {navLinks.map(({ path, label, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={path === '/'}
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={handleNavClick}
                            aria-label={label}
                        >
                            <Icon size={18} className="sidebar-nav-icon" aria-hidden="true" />
                            <span>{label}</span>
                        </NavLink>
                    ))}

                    <button
                        className="sidebar-nav-item"
                        onClick={() => { setIsExportModalOpen(true); handleNavClick(); }}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <Download size={18} className="sidebar-nav-icon" />
                        <span>Export Report</span>
                    </button>
                </div>
            </nav>

            {/* Footer Status & Settings */}
            <div className="sidebar-footer">
                <div className="sidebar-system-card" onClick={() => { window.location.href = '/system-monitoring'; handleNavClick(); }}>
                    <div className="status-dot-wrapper">
                        <span className="status-dot-active" />
                    </div>
                    <div className="status-card-info">
                        <span className="status-card-title">System Status</span>
                        <span className="status-card-sub">All systems operational</span>
                    </div>
                    <ChevronRight size={14} className="status-card-arrow" />
                </div>

                <div className="sidebar-theme-toggle">
                    <span className="theme-toggle-label">Dark Mode</span>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={theme === 'dark'}
                            onChange={toggleTheme}
                        />
                        <span className="toggle-slider" />
                    </label>
                </div>
            </div>

            <ExportReportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
        </aside>
    );
}
