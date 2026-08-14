import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Account from './pages/Account';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ReportIssue from './pages/ReportIssue';
import Legal from './pages/Legal';

export default function App() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('user');
        if (saved) {
            try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('user'); }
        }
    }, []);

    useEffect(() => {
        const handle = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, []);

    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    const handleLogin = (u) => { setUser(u); };
    const handleLogout = () => { localStorage.removeItem('user'); localStorage.removeItem('token'); setUser(null); };
    const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);
    const closeSidebar  = useCallback(() => setSidebarOpen(false), []);

    if (!user) {
        return (
            <BrowserRouter>
                <Routes>
                    <Route path="/login"          element={<Login onLogin={handleLogin} />} />
                    <Route path="/signup"          element={<Signup onLogin={handleLogin} />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/report-issue"    element={<ReportIssue />} />
                    <Route path="/legal/:type"     element={<Legal />} />
                    <Route path="*"                element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <div className="app-layout">
                <div className={sidebar-overlay } onClick={closeSidebar} aria-hidden="true" />
                <Sidebar user={user} onLogout={handleLogout} isOpen={sidebarOpen} onClose={closeSidebar} />
                <div className="main-content">
                    <Navbar user={user} onHamburgerClick={toggleSidebar} />
                    <main className="page-content">
                        <Routes>
                            <Route path="/"                element={<Dashboard />} />
                            <Route path="/problems"        element={<Problems />} />
                            <Route path="/problems/:id"    element={<ProblemDetail />} />
                            <Route path="/map"             element={<MapView />} />
                            <Route path="/analytics"       element={<Analytics />} />
                            <Route path="/settings"        element={<Settings user={user} />} />
                            <Route path="/account"         element={<Account user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
                            <Route path="*"                element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </BrowserRouter>
    );
}
