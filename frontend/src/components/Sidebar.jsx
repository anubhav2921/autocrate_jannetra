import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, Map, BarChart3, Settings, LogOut } from 'lucide-react';

const NAV = [
    { path: '/',          label: 'Dashboard', icon: LayoutDashboard },
    { path: '/problems',  label: 'Problems',  icon: ListChecks },
    { path: '/map',       label: 'Map',       icon: Map },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings',  label: 'Settings',  icon: Settings },
];

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
    return (
        <aside className={sidebar } role="navigation" aria-label="Main navigation">
            <div className="sidebar-brand">
                <h2>JanNetra</h2>
                <span>Governance Operations</span>
            </div>
            <nav className="sidebar-nav">
                {NAV.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === '/'}
                        className={({ isActive }) => isActive ? 'active' : ''}
                        onClick={onClose}
                    >
                        <Icon size={17} aria-hidden="true" />
                        {label}
                    </NavLink>
                ))}
            </nav>
            <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sidebar-user-name">{user?.name || 'User'}</div>
                    <div className="sidebar-user-role">{user?.role || 'OFFICER'}</div>
                </div>
                <button className="sidebar-logout-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">
                    <LogOut size={15} />
                </button>
            </div>
        </aside>
    );
}
