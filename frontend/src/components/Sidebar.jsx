import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, FileText, AlertTriangle, BarChart3, Globe,
    LogOut, CheckSquare, Map, UserCircle, Trophy, Bot, Download, Scan, Activity,
} from 'lucide-react';
import { useState } from 'react';
import ExportReportModal from './ExportReportModal';

const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/signal-monitor', label: 'Signal Monitor', icon: FileText },
    { path: '/alerts', label: 'Alerts & Actions', icon: AlertTriangle },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/map', label: 'Problem Map', icon: Map },
    { path: '/scanner', label: 'Social Scanner', icon: Scan },
    { path: '/system-monitoring', label: 'System Health', icon: Activity },
    { path: '/chatbot', label: 'AI Assistant', icon: Bot },
    { path: '/sources', label: 'Source Registry', icon: Globe },
    { path: '/resolutions', label: 'Resolved Issues', icon: CheckSquare },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/account', label: 'My Account', icon: UserCircle },
];

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const handleNavClick = () => {
        // Close sidebar on mobile after navigation
        if (onClose) onClose();
    };

    return (
        <aside
            className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="sidebar-brand">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h2>Governance Intelligence</h2>
                </div>
                <span>Decision Support System</span>
            </div>

            <nav className="sidebar-nav">
                {navLinks.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === '/'}
                        className={({ isActive }) => isActive ? 'active' : ''}
                        onClick={handleNavClick}
                        aria-label={label}
                    >
                        <Icon size={18} aria-hidden="true" />
                        {label}
                    </NavLink>
                ))}

                <button
                    className="sidebar-link"
                    style={{ background: 'none', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', outline: 'none' }}
                    onClick={() => { setIsExportModalOpen(true); handleNavClick(); }}
                    aria-label="Export Report"
                >
                    <Download size={18} aria-hidden="true" />
                    Export Report
                </button>
            </nav>

            <div className="sidebar-user">
                <div className="sidebar-user-info">
                    <div className="sidebar-user-avatar" aria-hidden="true">
                        {user?.name?.charAt(0)?.toUpperCase() || 'L'}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {user?.name || 'Leader'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {user?.role || 'LEADER'}
                        </div>
                    </div>
                </div>
                <button
                    className="sidebar-logout-btn"
                    onClick={onLogout}
                    title="Sign out"
                    aria-label="Sign out"
                >
                    <LogOut size={16} aria-hidden="true" />
                </button>
            </div>

            <div className="sidebar-status" aria-live="polite">
                <span className="status-dot" aria-hidden="true" />
                <span>System Online — All Services Active</span>
            </div>
            <ExportReportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
        </aside>
    );
}
