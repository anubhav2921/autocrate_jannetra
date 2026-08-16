import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { TrendingUp, MapPin, Layers, Flame, Globe, BarChart2 } from 'lucide-react';
import { fetchSentimentTrend, fetchRiskSummary, fetchCategoryBreakdown } from '../services/api';
import { useLocation } from '../context/LocationContext';

const RISK_COLORS = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#ef4444' };

export default function Analytics() {
    const { location, hasLocation, locationLabel } = useLocation();
    const [sentiment, setSentiment] = useState([]);
    const [heatmap, setHeatmap] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchSentimentTrend(location),
            fetchRiskSummary(location),
            fetchCategoryBreakdown(location),
        ])
            .then(([sTrend, hMap, cBreak]) => {
                let trendData = sTrend.trend || [];
                if (trendData.length === 1) {
                    const single = trendData[0];
                    const prevDate = new Date(new Date(single.date).getTime() - 86400000).toISOString().split('T')[0];
                    trendData = [
                        { ...single, date: prevDate, avg_polarity: 0, avg_anger: 0, count: 0 },
                        single
                    ];
                }
                setSentiment(trendData);
                setHeatmap(hMap.heatmap || []);
                setCategories((cBreak.categories || []).slice(0, 15));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [location.state, location.district, location.city, location.ward]);

    if (loading) {
        return (
            <div className="dashboard-page-wrapper">
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading analytics engine...
                </div>
            </div>
        );
    }

    const tooltipStyle = {
        contentStyle: {
            background: '#131726',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '0.8rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        },
        itemStyle: { color: '#f8fafc' },
    };

    return (
        <div className="dashboard-page-wrapper animate-in">
            {/* Header Banner */}
            <div className="hero-banner-card" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.5rem' }}>Analytics & Intelligence</h1>
                    <p className="hero-subtext">Deep-dive into sentiment trends, risk patterns, and category intelligence</p>
                </div>
                <div className="navbar-location-pill" style={{ background: '#181c2e' }}>
                    <Globe size={14} className="location-icon" />
                    <span>{hasLocation ? locationLabel() : 'All India'}</span>
                </div>
            </div>

            {/* Charts Row 1: Sentiment & Anger Trends */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="panel-card">
                    <div className="panel-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#f8fafc' }}>
                            <TrendingUp size={18} style={{ color: '#60a5fa' }} />
                            <span>Sentiment Polarity Over Time</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={sentiment}>
                            <defs>
                                <linearGradient id="colorPolarity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                            <YAxis domain={[-1, 1]} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip {...tooltipStyle} />
                            <Area
                                type="monotone"
                                dataKey="avg_polarity"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPolarity)"
                                name="Polarity (-1 to +1)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="panel-card">
                    <div className="panel-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#f8fafc' }}>
                            <Flame size={18} style={{ color: '#f87171' }} />
                            <span>Anger Rating Dynamics</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={sentiment}>
                            <defs>
                                <linearGradient id="colorAnger" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                            <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip {...tooltipStyle} />
                            <Area
                                type="monotone"
                                dataKey="avg_anger"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorAnger)"
                                name="Anger Rating (0-10)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Breakdown Bar Chart */}
            <div className="panel-card" style={{ marginBottom: '20px' }}>
                <div className="panel-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#f8fafc' }}>
                        <BarChart2 size={18} style={{ color: '#c084fc' }} />
                        <span>Average Risk Score by Category</span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categories}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="avg_gri" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Average Risk Score" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Regional Heatmap Matrix */}
            <div className="panel-card">
                <div className="panel-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#f8fafc' }}>
                        <MapPin size={18} style={{ color: '#fbbf24' }} />
                        <span>Regional Risk Heatmap Matrix</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                    {heatmap.map((item) => {
                        const isHigh = item.risk_level === 'HIGH';
                        const isMod = item.risk_level === 'MODERATE';
                        return (
                            <div
                                key={item.location}
                                style={{
                                    background: '#181c2e',
                                    border: `1px solid ${isHigh ? 'rgba(239,68,68,0.3)' : isMod ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc', marginBottom: '6px' }}>
                                    {item.location}
                                </div>
                                <div style={{
                                    fontSize: '1.4rem', fontWeight: 700,
                                    color: isHigh ? '#f87171' : isMod ? '#fbbf24' : '#4ade80'
                                }}>
                                    {Math.round(item.avg_gri)}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                                    {item.signal_count} Signals Processed
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
