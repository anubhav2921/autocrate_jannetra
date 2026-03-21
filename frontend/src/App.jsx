import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import Articles from './pages/Articles';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Sources from './pages/Sources';
import Resolutions from './pages/Resolutions';
import MapView from './pages/MapView';
import Account from './pages/Account';
import Leaderboard from './pages/Leaderboard';
import Chatbot from './pages/Chatbot';
import Scanner from './pages/Scanner';
import SignalMonitor from './pages/SignalMonitor';
import ProblemDetail from './pages/ProblemDetail';
import SystemMonitoring from './pages/SystemMonitoring';
import SystemMetricDetail from './pages/SystemMetricDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import PhoneAuth from './pages/PhoneAuth';
import LandingPage from './pages/LandingPage';
import PulseDashboard from './pages/PulseDashboard';
import Legal from './pages/Legal';
import ReportIssue from './pages/ReportIssue';
import { LocationProvider } from './context/LocationContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
    const [user, setUser] = useState(null);
    const [showSplash, setShowSplash] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('user');
        if (saved) {
            try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('user'); }
        }
    }, []);

    // Close sidebar on Escape key
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [sidebarOpen]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    const handleLogin = (userData) => setUser(userData);
    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };
    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    if (showSplash) {
        return <SplashScreen onComplete={() => setShowSplash(false)} />;
    }

    if (!user) {
        return (
            <ThemeProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/phone-auth" element={<PhoneAuth onLogin={handleLogin} />} />
                        <Route path="/pulse" element={<PulseDashboard />} />
                        <Route path="/legal/privacy" element={<Legal />} />
                        <Route path="/legal/terms" element={<Legal />} />
                        <Route path="/legal/transparency" element={<Legal />} />
                        <Route path="/report-issue" element={<ReportIssue />} />
                        <Route path="*" element={<LandingPage />} />
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <LocationProvider>
                <BrowserRouter>
                    <div className="app-layout">
                        {/* Mobile overlay — click to close sidebar */}
                        <div
                            className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                            onClick={closeSidebar}
                            aria-hidden="true"
                        />

                        <Sidebar
                            user={user}
                            onLogout={handleLogout}
                            isOpen={sidebarOpen}
                            onClose={closeSidebar}
                        />

                        <div className="main-content">
                            <Navbar
                                user={user}
                                onHamburgerClick={toggleSidebar}
                                isSidebarOpen={sidebarOpen}
                            />
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/articles" element={<Articles />} />
                                <Route path="/alerts" element={<Alerts />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/sources" element={<Sources />} />
                                <Route path="/resolutions" element={<Resolutions user={user} />} />
                                <Route path="/map" element={<MapView />} />
                                <Route path="/leaderboard" element={<Leaderboard />} />
                                <Route path="/chatbot" element={<Chatbot />} />
                                <Route path="/scanner" element={<Scanner />} />
                                <Route path="/signal-monitor" element={<SignalMonitor />} />
                                <Route path="/signal-monitor/:id" element={<ProblemDetail />} />
                                <Route path="/system-monitoring" element={<SystemMonitoring />} />
                                <Route path="/system-monitoring/:id" element={<SystemMetricDetail />} />
                                <Route path="/account" element={<Account user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
                                <Route path="/pulse" element={<PulseDashboard />} />
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </div>
                    </div>
                </BrowserRouter>
            </LocationProvider>
        </ThemeProvider>
    );
}
