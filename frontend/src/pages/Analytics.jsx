import { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area,
} from 'recharts';
import { TrendingUp, MapPin, Layers, Flame } from 'lucide-react';
import { fetchSentimentTrend, fetchRiskHeatmap, fetchCategoryBreakdown } from '../services/api';
import { useLocation } from '../context/LocationContext';

const RISK_COLORS = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#ef4444' };

export default function Analytics() {
    const { location } = useLocation();
    const [sentiment, setSentiment] = useState([]);
    const [heatmap, setHeatmap] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchSentimentTrend(location),
            fetchRiskHeatmap(location),
            fetchCategoryBreakdown(location),
        ])
            .then(([sTrend, hMap, cBreak]) => {
                let trendData = sTrend.trend || [];
                // If only 1 data point, Recharts AreaChart draws a confusing flat line or doesn't render the area properly.
                // We fake a previous day if there's exactly 1 day.
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
                // Limit category breakdown to top 15 to prevent the bar chart from breaking/disappearing when there are too many (e.g. 50+)
                setCategories((cBreak.categories || []).slice(0, 15));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [location.state, location.district, location.city, location.ward]);

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    const tooltipStyle = {
        contentStyle: {
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '0.8rem',
        },
        itemStyle: { color: '#f1f5f9' },
    };

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Analytics & Trends</h1>
                <p>Deep-dive into sentiment trends, risk patterns, and category intelligence</p>
            </div>

            {/* Sentiment Trend + Anger Trend */}
            <div className="grid-2">
                <div className="glass-card chart-card animate-in">
                    <div className="section-title">
                        <TrendingUp size={18} /> Sentiment Polarity Over Time
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
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
                                fill="url(#colorPolarity)"
                                name="Avg Polarity"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card chart-card animate-in">
                    <div className="section-title">
                        <Flame size={18} /> Anger Rating Trend
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
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
                                fill="url(#colorAnger)"
                                name="Avg Anger"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Risk Heatmap Table */}
            <div className="glass-card animate-in" style={{ marginBottom: '24px' }}>
                <div className="section-title">
                    <MapPin size={18} /> Location Risk Intelligence
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>Avg GRI</th>
                                <th>Max GRI</th>
                                <th>Signals</th>
                                <th>Avg Anger</th>
                                <th>Risk Level</th>
                                <th>Risk Meter</th>
                            </tr>
                        </thead>
                        <tbody>
                            {heatmap.map((h) => (
                                <tr key={h.location}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={13} style={{ color: RISK_COLORS[h.risk_level] }} />
                                            {h.location ? h.location.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>') : 'Unknown'}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 700, color: RISK_COLORS[h.risk_level] }}>
                                        {h.avg_gri}
                                    </td>
                                    <td>{h.max_gri}</td>
                                    <td>{h.signal_count}</td>
                                    <td>
                                        <span style={{
                                            color: h.avg_anger > 5 ? '#ef4444' : h.avg_anger > 3 ? '#f59e0b' : '#10b981',
                                            fontWeight: 600,
                                        }}>
                                            {h.avg_anger}/10
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${h.risk_level?.toLowerCase()}`}>
                                            {h.risk_level}
                                        </span>
                                    </td>
                                    <td style={{ minWidth: '120px' }}>
                                        <div className="score-bar">
                                            <div
                                                className="score-bar-fill"
                                                style={{
                                                    width: `${h.avg_gri}%`,
                                                    background: RISK_COLORS[h.risk_level],
                                                }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="glass-card chart-card animate-in">
                <div className="section-title">
                    <Layers size={18} /> Category Risk Breakdown
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categories} margin={{ bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="category"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            angle={-15}
                            textAnchor="end"
                            height={50}
                        />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="avg_gri" name="Avg GRI" radius={[6, 6, 0, 0]} maxBarSize={40}>
                            {categories.map((entry) => (
                                <Cell key={entry.category} fill={RISK_COLORS[entry.risk_level] || '#3b82f6'} />
                            ))}
                        </Bar>
                        <Bar dataKey="fake_count" name="Fake News" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
