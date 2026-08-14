import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

const TITLES = {
    '/':           'Dashboard',
    '/problems':   'Problems',
    '/map':        'Problem Map',
    '/analytics':  'Analytics',
    '/settings':   'Settings',
    '/account':    'My Account',
};

export default function Navbar({ user, onHamburgerClick }) {
    const { pathname } = useLocation();
    const title = TITLES[pathname] || TITLES[Object.keys(TITLES).find(k => k !== '/' && pathname.startsWith(k))] || 'JanNetra';

    return (
        <header className="navbar">
            <button className="hamburger-btn" onClick={onHamburgerClick} aria-label="Toggle menu">
                <Menu size={20} />
            </button>
            <span className="navbar-title">{title}</span>
            <div className="navbar-right">
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {user?.name || 'User'} &mdash; {user?.role || 'OFFICER'}
                </span>
            </div>
        </header>
    );
}
