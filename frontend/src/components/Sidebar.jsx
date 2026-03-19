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

export default function Sidebar({ user, onLogout }) {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const handleOpenExportModal = () => {
        setIsExportModalOpen(true);
    };

    return (
        <aside className="sidebar">
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
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}

                <button onClick={handleOpenExportModal} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                    color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                    textAlign: 'left', fontFamily: 'var(--font-family)', borderLeft: '3px solid transparent',
                    transition: 'all 0.2s ease',
                }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <Download size={18} />
                    Export Report
                </button>
            </nav>

            <div className="sidebar-user">
                <div className="sidebar-user-info">
                    <div className="sidebar-user-avatar">
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
                <button className="sidebar-logout-btn" onClick={onLogout} title="Sign out">
                    <LogOut size={16} />
                </button>
            </div>

            <div className="sidebar-status">
                <span className="status-dot" />
                <span>System Online — All Services Active</span>
            </div>
            <ExportReportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
        </aside>
    );
}
