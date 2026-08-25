import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Bell, Users, Eye, ArrowRight, AlertTriangle, Shield,
    Wrench, Droplets, Zap, PlusCircle, CheckCircle2, BarChart2, FileText,
    TrendingUp, TrendingDown, Sparkles, Layers, ShieldAlert, FileSpreadsheet, Play, LogOut, MessageSquare, AtSign, Download
} from 'lucide-react';
import { fetchLocationDashboard, triggerPipeline } from '../services/api';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import ExportReportModal from '../components/ExportReportModal';

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const { location } = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!data) setLoading(true);
        setError(null);
        fetchLocationDashboard(location)
            .then(resData => {
                setData(resData);
            })
            .catch(err => {
                console.error(err);
                if (!data) setError('Failed to load dashboard data. Please try again.');
            })
            .finally(() => setLoading(false));
    }, [location.state, location.district, location.city, location.ward]);

    if (loading) {
        return (
            <div className="dashboard-page-wrapper animate-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-page-wrapper animate-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
                <AlertTriangle size={48} className="text-red-500" color="var(--risk-high)" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Error Loading Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    const totalSignals = data?.total_articles ?? 0;
    const problemClusters = data?.active_problems_count ?? 0;
    const activeAlertsCount = data?.active_alerts ?? 0;
    const citizenReportsCount = data?.citizen_reports_count ?? 0;

    return (
        <div className="dashboard-page-wrapper animate-in">
            <div className="dashboard-grid-layout">
                
                {/* ═══════════════════════════════════════════════════════════
                   LEFT MAIN COLUMN (Hero, Today at a Glance, Actions, AI Insight)
                   ═══════════════════════════════════════════════════════════ */}
                <div className="dashboard-left-col">
                    
                    {/* Hero Greeting Section */}
                    <div className="hero-banner-card">
                        <div className="hero-content">
                            <h1 className="hero-greeting">Good morning, {user?.name || 'Admin'} 👋</h1>
                            <p className="hero-subtext">Here's what needs your attention today.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button 
                                onClick={signOut}
                                style={{
                                    padding: '10px 18px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                                title="Log Out"
                            >
                                <LogOut size={16} /> Log Out
                            </button>
                            <div className="hero-illustration">
                                <div className="shield-3d-glow">
                                    <div className="shield-inner">
                                        <Shield size={54} color="#a855f7" />
                                        <Sparkles size={24} className="sparkle-overlay" color="#d8b4fe" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today at a Glance Section */}
                    <div className="at-a-glance-card">
                        <div className="at-a-glance-header">
                            <Eye size={18} className="header-icon" />
                            <span>Today at a Glance</span>
                        </div>

                        <div className="at-a-glance-stats-grid">
                            {/* Stat 1: Total Signals */}
                            <div className="glance-stat-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/signal-monitor'); } }} onClick={() => navigate('/signal-monitor')}>
                                <div className="stat-icon-wrapper purple">
                                    <Activity size={20} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-num">{totalSignals}</div>
                                    <div className="stat-name">Total Signals</div>
                                    <div className="stat-trend up">
                                        <TrendingUp size={12} />
                                        <span>18% vs yesterday</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stat 2: Problem Clusters */}
                            <div className="glance-stat-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/signal-monitor'); } }} onClick={() => navigate('/signal-monitor')}>
                                <div className="stat-icon-wrapper blue">
                                    <Layers size={20} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-num">{problemClusters}</div>
                                    <div className="stat-name">Problem Clusters</div>
                                    <div className="stat-trend up">
                                        <TrendingUp size={12} />
                                        <span>12% vs yesterday</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stat 3: Active Alerts */}
                            <div className="glance-stat-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }} onClick={() => navigate('/alerts')}>
                                <div className="stat-icon-wrapper red">
                                    <Bell size={20} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-num">{activeAlertsCount}</div>
                                    <div className="stat-name">Active Alerts</div>
                                    <div className="stat-trend down">
                                        <TrendingDown size={12} />
                                        <span>20% vs yesterday</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stat 4: Citizen Reports */}
                            <div className="glance-stat-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/citizen-reports'); } }} onClick={() => navigate('/citizen-reports')}>
                                <div className="stat-icon-wrapper green">
                                    <Users size={20} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-num">{citizenReportsCount}</div>
                                    <div className="stat-name">Citizen Reports</div>
                                    <div className="stat-trend up">
                                        <TrendingUp size={12} />
                                        <span>50% vs yesterday</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What would you like to do today? Section */}
                    <div className="action-selection-section">
                        <h2 className="section-subtitle">What would you like to do today?</h2>
                        
                        <div className="action-cards-grid">
                            {/* Card 1: Monitor Signals */}
                            <div className="action-card-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/signal-monitor'); } }} onClick={() => navigate('/signal-monitor')}>
                                <div className="action-card-header">
                                    <div className="action-icon-box purple">
                                        <Activity size={20} />
                                    </div>
                                    <div className="action-arrow-btn">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                                <h3 className="action-card-title">Monitor Signals</h3>
                                <p className="action-card-desc">View and track incoming signals in real-time</p>
                            </div>

                            {/* Card 2: Review Alerts */}
                            <div className="action-card-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }} onClick={() => navigate('/alerts')}>
                                <div className="action-card-header">
                                    <div className="action-icon-box red">
                                        <Bell size={20} />
                                    </div>
                                    <div className="action-arrow-btn">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                                <h3 className="action-card-title">Review Alerts</h3>
                                <p className="action-card-desc">Check critical alerts and take immediate action</p>
                            </div>

                            {/* Card 3: Citizen Reports */}
                            <div className="action-card-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/citizen-reports'); } }} onClick={() => navigate('/citizen-reports')}>
                                <div className="action-card-header">
                                    <div className="action-icon-box green">
                                        <Users size={20} />
                                    </div>
                                    <div className="action-arrow-btn">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                                <h3 className="action-card-title">Citizen Reports</h3>
                                <p className="action-card-desc">Browse and analyze citizen submitted reports</p>
                            </div>

                            {/* Card 4: Analytics Dashboard */}
                            <div className="action-card-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/analytics'); } }} onClick={() => navigate('/analytics')}>
                                <div className="action-card-header">
                                    <div className="action-icon-box blue">
                                        <BarChart2 size={20} />
                                    </div>
                                    <div className="action-arrow-btn">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                                <h3 className="action-card-title">Analytics Dashboard</h3>
                                <p className="action-card-desc">Explore trends, patterns and insights</p>
                            </div>

                            {/* Card 5: Escalation Center */}
                            <div className="action-card-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/working'); } }} onClick={() => navigate('/working')}>
                                <div className="action-card-header">
                                    <div className="action-icon-box orange">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div className="action-arrow-btn">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                                <h3 className="action-card-title">Escalation Center</h3>
                                <p className="action-card-desc">Manage escalations and assign responsibilities</p>
                            </div>

                            {/* Card 6: Generate Reports */}
                            <div className="action-card-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExportModalOpen(true); } }} onClick={() => setIsExportModalOpen(true)}>
                                <div className="action-card-header">
                                    <div className="action-icon-box purple">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <div className="action-arrow-btn">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                                <h3 className="action-card-title">Generate Reports</h3>
                                <p className="action-card-desc">Create and download detailed reports</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Insight Card */}
                    <div className="ai-insight-banner">
                        <div className="ai-insight-left">
                            <div className="ai-insight-title">
                                <Sparkles size={18} className="sparkle-icon" />
                                <span>AI Insight</span>
                            </div>
                            <p className="ai-insight-text">
                                Water contamination reports in Lucknow have increased by 32% this week. Consider reviewing related alerts and taking preventive action.
                            </p>
                        </div>
                        <button className="ai-assistant-btn" onClick={() => navigate('/chatbot')}>
                            <Sparkles size={16} />
                            <span>Ask AI Assistant</span>
                        </button>
                    </div>

                    {/* Governance Report Summary Card */}
                    <div className="ai-insight-banner" style={{ marginTop: '20px', background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'block' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div className="ai-insight-title" style={{ color: '#f8fafc', marginBottom: 0 }}>
                                <FileText size={18} style={{ color: '#3b82f6' }} />
                                <span>Governance Intelligence Report</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                Auto-generated
                            </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Avg Risk Index (GRI)</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: data?.overall_gri > 60 ? '#f87171' : data?.overall_gri > 30 ? '#fbbf24' : '#4ade80' }}>
                                    {data?.overall_gri || 0}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Fake News Detected</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: data?.fake_news_percentage > 20 ? '#f87171' : '#f8fafc' }}>
                                    {data?.fake_news_percentage || 0}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Top Risk Category</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={data?.category_risk?.[0]?.category || 'None'}>
                                    {data?.category_risk?.[0]?.category || 'None'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <a 
                                href="/api/report/download" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                    flex: 1, padding: '10px 16px', background: 'rgba(59, 130, 246, 0.15)', 
                                    color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', 
                                    borderRadius: '10px', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', gap: '8px', fontSize: '0.85rem', 
                                    fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' 
                                }}
                            >
                                <Download size={16} /> Download Full PDF Report
                            </a>
                            <button 
                                onClick={() => navigate('/analytics')}
                                style={{ 
                                    padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)', 
                                    color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.1)', 
                                    borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, 
                                    cursor: 'pointer', transition: 'all 0.2s' 
                                }}
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                   RIGHT PANEL (Recent Alerts, Quick Actions, System Health)
                   ═══════════════════════════════════════════════════════════ */}
                <div className="dashboard-right-col">
                    
                    {/* Recent Alerts */}
                    <div className="panel-card">
                        <div className="panel-card-header">
                            <h3 className="panel-card-title">Recent Alerts</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>View All</button>
                        </div>

                        <div className="recent-alerts-list">
                            {/* Alert 1 */}
                            <div className="alert-list-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }} onClick={() => navigate('/alerts')}>
                                <div className="alert-item-icon red">
                                    <AlertTriangle size={16} />
                                </div>
                                <div className="alert-item-body">
                                    <div className="alert-item-title">High risk incident detected</div>
                                    <div className="alert-item-meta">Public Health • Delhi</div>
                                </div>
                                <div className="alert-item-right">
                                    <div className="alert-time">09:25 AM</div>
                                    <span className="badge badge-high">High</span>
                                </div>
                            </div>

                            {/* Alert 2 */}
                            <div className="alert-list-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }} onClick={() => navigate('/alerts')}>
                                <div className="alert-item-icon orange">
                                    <Wrench size={16} />
                                </div>
                                <div className="alert-item-body">
                                    <div className="alert-item-title">Infrastructure failure reported</div>
                                    <div className="alert-item-meta">Mumbai, Maharashtra</div>
                                </div>
                                <div className="alert-item-right">
                                    <div className="alert-time">09:10 AM</div>
                                    <span className="badge badge-moderate">Medium</span>
                                </div>
                            </div>

                            {/* Alert 3 */}
                            <div className="alert-list-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }} onClick={() => navigate('/alerts')}>
                                <div className="alert-item-icon orange">
                                    <Users size={16} />
                                </div>
                                <div className="alert-item-body">
                                    <div className="alert-item-title">Crowd gathering detected</div>
                                    <div className="alert-item-meta">Kolkata, West Bengal</div>
                                </div>
                                <div className="alert-item-right">
                                    <div className="alert-time">08:55 AM</div>
                                    <span className="badge badge-moderate">Medium</span>
                                </div>
                            </div>

                            {/* Alert 4 */}
                            <div className="alert-list-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }} onClick={() => navigate('/alerts')}>
                                <div className="alert-item-icon blue">
                                    <Droplets size={16} />
                                </div>
                                <div className="alert-item-body">
                                    <div className="alert-item-title">Water contamination reported</div>
                                    <div className="alert-item-meta">Lucknow, Uttar Pradesh</div>
                                </div>
                                <div className="alert-item-right">
                                    <div className="alert-time">08:30 AM</div>
                                    <span className="badge badge-high">High</span>
                                </div>
                            </div>

                            {/* Alert 5 */}
                            <div className="alert-list-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }} onClick={() => navigate('/alerts')}>
                                <div className="alert-item-icon blue">
                                    <Zap size={16} />
                                </div>
                                <div className="alert-item-body">
                                    <div className="alert-item-title">Power outage reported</div>
                                    <div className="alert-item-meta">Bangalore, Karnataka</div>
                                </div>
                                <div className="alert-item-right">
                                    <div className="alert-time">08:15 AM</div>
                                    <span className="badge badge-low">Low</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Social Mentions */}
                    <div className="panel-card">
                        <div className="panel-card-header">
                            <h3 className="panel-card-title">Recent Social Mentions</h3>
                        </div>

                        <div className="recent-alerts-list">
                            {data?.recent_social_mentions && data.recent_social_mentions.length > 0 ? (
                                data.recent_social_mentions.map((mention, index) => (
                                    <div key={mention.id || index} className="alert-list-item" style={{ cursor: 'default' }}>
                                        <div className="alert-item-icon blue">
                                            <MessageSquare size={16} />
                                        </div>
                                        <div className="alert-item-body">
                                            <div className="alert-item-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                                {mention.content}
                                            </div>
                                            <div className="alert-item-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <AtSign size={12} /> {mention.author} • {mention.platform}
                                            </div>
                                        </div>
                                        {mention.url && (
                                            <div className="alert-item-right">
                                                <a href={mention.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                                    View
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    No recent mentions found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="panel-card">
                        <div className="panel-card-header">
                            <h3 className="panel-card-title">Quick Actions</h3>
                        </div>

                        <div className="quick-actions-grid">
                            <button className="quick-action-btn red" onClick={() => navigate('/alerts')}>
                                <Bell size={18} />
                                <span>Create Alert</span>
                            </button>
                            <button className="quick-action-btn green" onClick={() => navigate('/citizen-reports')}>
                                <FileText size={18} />
                                <span>Add Report</span>
                            </button>
                            <button className="quick-action-btn blue" onClick={() => {
                                triggerPipeline(location.city || location.district).catch(console.error);
                                navigate('/signal-monitor');
                            }}>
                                <Play size={18} />
                                <span>Run Pipeline</span>
                            </button>
                            <button className="quick-action-btn purple" onClick={() => navigate('/analytics')}>
                                <BarChart2 size={18} />
                                <span>View Analytics</span>
                            </button>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="panel-card">
                        <div className="panel-card-header">
                            <h3 className="panel-card-title">System Health</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/system-monitoring')}>View Details</button>
                        </div>

                        <div className="system-health-list">
                            <div className="health-row">
                                <div className="health-left">
                                    <CheckCircle2 size={16} className="health-check-icon" />
                                    <span>Data Ingestion</span>
                                </div>
                                <span className="health-status operational">Operational</span>
                            </div>
                            <div className="health-row">
                                <div className="health-left">
                                    <CheckCircle2 size={16} className="health-check-icon" />
                                    <span>AI/ML Engine</span>
                                </div>
                                <span className="health-status operational">Operational</span>
                            </div>
                            <div className="health-row">
                                <div className="health-left">
                                    <CheckCircle2 size={16} className="health-check-icon" />
                                    <span>Alert Engine</span>
                                </div>
                                <span className="health-status operational">Operational</span>
                            </div>
                            <div className="health-row">
                                <div className="health-left">
                                    <CheckCircle2 size={16} className="health-check-icon" />
                                    <span>Database</span>
                                </div>
                                <span className="health-status operational">Operational</span>
                            </div>
                            <div className="health-row">
                                <div className="health-left">
                                    <CheckCircle2 size={16} className="health-check-icon" />
                                    <span>APIs</span>
                                </div>
                                <span className="health-status operational">Operational</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <ExportReportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
        </div>
    );
}
