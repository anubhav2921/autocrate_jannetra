import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PlusCircle, Search, Shield, Clock, CheckCircle2, 
    AlertTriangle, MapPin, ArrowRight, User, LogOut, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function CitizenDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState('');
    const [trackedReport, setTrackedReport] = useState(null);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [trackError, setTrackError] = useState('');

    const fetchReports = () => {
        setLoading(true);
        api.get('/citizen-reports/list')
            .then(data => setReports(data || []))
            .catch(err => console.error("Failed to load citizen reports:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleTrack = (e) => {
        e.preventDefault();
        if (!searchId.trim()) return;
        setTrackingLoading(true);
        setTrackError('');
        setTrackedReport(null);

        api.get(`/report/${searchId.trim()}`)
            .then(data => setTrackedReport(data))
            .catch(err => setTrackError(err.response?.data?.detail || "Report not found or invalid ID"))
            .finally(() => setTrackingLoading(false));
    };

    return (
        <div className="dashboard-page-wrapper animate-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Banner */}
            <div className="hero-banner-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.6rem', color: '#f8fafc', margin: 0 }}>Citizen Intelligence Desk</h1>
                    <p className="hero-subtext" style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>
                        Welcome back, {user?.email || 'Citizen'}. Submit civic grievances, track AI validation & monitor resolution status.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => navigate('/report-issue')}
                        style={{
                            padding: '12px 20px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                        }}
                    >
                        <PlusCircle size={18} /> Report New Issue
                    </button>
                    <button 
                        onClick={signOut}
                        style={{
                            padding: '12px 16px', background: 'rgba(239,68,68,0.12)',
                            color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                        }}
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>

            {/* Quick Track Bar */}
            <div className="panel-card" style={{ marginBottom: '24px', padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={18} style={{ color: '#6366f1' }} /> Track Report Status by Report ID
                </h3>
                <form onSubmit={handleTrack} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input 
                        type="text" 
                        placeholder="Enter Report ID (e.g. JN-123456)" 
                        value={searchId}
                        onChange={e => setSearchId(e.target.value)}
                        style={{
                            flex: 1, minWidth: '240px', padding: '12px 16px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                        }}
                    />
                    <button 
                        type="submit" 
                        disabled={trackingLoading}
                        style={{
                            padding: '12px 24px', background: '#3b82f6', color: 'white',
                            border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        {trackingLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Check Status'}
                    </button>
                </form>

                {trackError && (
                    <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '0.85rem' }}>
                        ⚠️ {trackError}
                    </div>
                )}

                {trackedReport && (
                    <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700 }}>REPORT ID: {trackedReport.id}</span>
                                <h4 style={{ margin: '4px 0', fontSize: '1rem', color: 'white' }}>{trackedReport.category}</h4>
                                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Location: {trackedReport.location || 'Reported Location'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                    background: trackedReport.status === 'Problem Resolved' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                                    color: trackedReport.status === 'Problem Resolved' ? '#4ade80' : '#fbbf24',
                                    border: `1px solid ${trackedReport.status === 'Problem Resolved' ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`
                                }}>
                                    {trackedReport.status || 'Pending'}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                                    Progress: {trackedReport.progress}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* List of Recent Citizen Filings */}
            <div className="panel-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={20} style={{ color: '#8b5cf6' }} /> Community Citizen Reports
                    </h3>
                    <button 
                        onClick={fetchReports} 
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        Loading citizen report filings...
                    </div>
                ) : reports.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No citizen reports logged yet. Be the first to report an issue!
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                        {reports.map((report) => (
                            <div 
                                key={report.id}
                                onClick={() => navigate(`/citizen-reports/${report.id}`)}
                                style={{
                                    padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border-color)', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                                className="table-row-hover"
                            >
                                <div style={{ flex: 1, minWidth: '220px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6' }}>{report.id}</span>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                                            background: report.severity === 'Critical' || report.severity === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: report.severity === 'Critical' || report.severity === 'High' ? '#f87171' : '#fbbf24'
                                        }}>
                                            {report.severity || 'Medium'}
                                        </span>
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{report.title}</h4>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={12} /> {report.location || 'Prayagraj'}
                                        </span>
                                        <span>Dept: {report.department}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                        background: report.status === 'Problem Resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                        color: report.status === 'Problem Resolved' ? '#4ade80' : '#fbbf24'
                                    }}>
                                        {report.status || 'Pending'}
                                    </span>
                                    <ArrowRight size={18} style={{ color: '#64748b' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

