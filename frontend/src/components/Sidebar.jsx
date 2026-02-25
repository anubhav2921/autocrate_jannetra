import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, FileText, AlertTriangle, BarChart3, Globe, Shield,
    LogOut, CheckSquare, Map, UserCircle, Trophy, Bot, Download, Scan, Activity,
} from 'lucide-react';

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
    const handleDownloadReport = async () => {
        try {
            const res = await fetch('/api/report/download');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `governance_report.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Report download failed:', err);
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <Shield size={22} style={{ color: '#3b82f6' }} />
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

                <button onClick={handleDownloadReport} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                    color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                    textAlign: 'left', fontFamily: 'var(--font-family)', borderLeft: '3px solid transparent',
                    transition: 'all 0.2s ease',
                }}
                    onMouseEnter={(e) => { e.target.style.background = 'var(--bg-glass-hover)'; e.target.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.color = 'var(--text-secondary)'; }}
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
        </aside>
    );
}
