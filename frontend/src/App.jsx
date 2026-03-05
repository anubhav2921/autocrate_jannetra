import { useState, useEffect } from 'react';
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

export default function App() {
    const [user, setUser] = useState(null);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('user');
        if (saved) {
            try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('user'); }
        }
    }, []);

    const handleLogin = (userData) => setUser(userData);
    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    if (showSplash) {
        return <SplashScreen onComplete={() => setShowSplash(false)} />;
    }

    if (!user) {
        return (
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/phone-auth" element={<PhoneAuth onLogin={handleLogin} />} />
                    <Route path="*" element={<LandingPage />} />
                </Routes>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar user={user} onLogout={handleLogout} />
                <div className="main-content">
                    <Navbar user={user} />
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
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}

