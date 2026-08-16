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
import CitizenReports from './pages/CitizenReports';
import ProblemDetail from './pages/ProblemDetail';
import WorkingProblems from './pages/WorkingProblems';
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

// New RBAC imports
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ActionDesk from './pages/official/ActionDesk';
import Supervisor from './pages/official/Supervisor';
import CommandCenter from './pages/official/CommandCenter';
import Unauthorized from './pages/Unauthorized';

function AppContent() {
    const { user, role, loading, signOut } = useAuth();
    const [showSplash, setShowSplash] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    if (showSplash) {
        return <SplashScreen onComplete={() => setShowSplash(false)} />;
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return (
            <ThemeProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/phone-auth" element={<PhoneAuth />} />
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
                            onLogout={signOut}
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
                                {/* RBAC Protected Routes - open to all authenticated users for now */}
                                <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
                                <Route path="/official/action-desk" element={<ActionDesk />} />
                                <Route path="/official/supervisor" element={<Supervisor />} />
                                <Route path="/official/command-center" element={<CommandCenter />} />
                                
                                <Route path="/unauthorized" element={<Unauthorized />} />

                                {/* Main application routes */}
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
                                <Route path="/citizen-reports" element={<CitizenReports />} />
                                <Route path="/citizen-reports/:id" element={<ProblemDetail />} />
                                <Route path="/working" element={<WorkingProblems />} />
                                <Route path="/signal-monitor/:id" element={<ProblemDetail />} />
                                <Route path="/system-monitoring" element={<SystemMonitoring />} />
                                <Route path="/system-monitoring/:id" element={<SystemMetricDetail />} />
                                <Route path="/account" element={<Account user={user} onLogout={signOut} />} />
                                <Route path="/pulse" element={<PulseDashboard />} />
                                
                                {/* Fallback route - defaults to main dashboard for all users */}
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </div>
                    </div>
                </BrowserRouter>
            </LocationProvider>
        </ThemeProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
