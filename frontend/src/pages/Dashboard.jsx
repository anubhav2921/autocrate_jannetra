import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
    AlertTriangle, Activity, Newspaper, Shield, TrendingUp, MapPin, Flame, Globe, Users,
} from 'lucide-react';
import { fetchLocationDashboard } from '../services/api';
import { useLocation } from '../context/LocationContext';
import RiskHeatmapMap from '../components/RiskHeatmapMap';

const RISK_COLORS = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#ef4444' };
const PIE_COLORS = ['#10b981', '#3b82f6', '#ef4444'];

export default function Dashboard() {
    const { location, hasLocation, locationLabel, setLocation } = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        fetchLocationDashboard(location)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [location.state, location.district, location.city, location.ward]);

    const handleDrillDown = (name) => {
        if (!location.state) {
            setLocation({ ...location, state: name });
        } else if (!location.district) {
            setLocation({ ...location, district: name, city: '', ward: '' });
        } else if (!location.city) {
            setLocation({ ...location, city: name, ward: '' });
        } else if (!location.ward) {
            setLocation({ ...location, ward: name });
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <span style={{ color: 'var(--text-muted)' }}>Loading intelligence data...</span>
            </div>
        );
    }

    if (!data) return null;

    const griColor = data.overall_gri > 60 ? '#ef4444' : data.overall_gri > 30 ? '#f59e0b' : '#10b981';
    const sentimentData = Object.entries(data.sentiment_distribution || {}).map(
        ([label, count]) => ({ name: label, value: count })
    );

    return (
        <div className="page-container">
            {/* Alert Banner */}
            {data.critical_alerts?.length > 0 && (
                <div className="alert-banner animate-in">
                    <AlertTriangle size={20} className="alert-icon" />
                    <span className="alert-text">
                        ⚠️ {data.critical_alerts.length} critical alert{data.critical_alerts.length > 1 ? 's' : ''} active — {data.critical_alerts[0]?.recommendation?.substring(0, 120)}...
                    </span>
                </div>
            )}

            {/* Page Header */}
            <div className="page-header animate-in">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1>Governance Intelligence Dashboard</h1>
                        <p>Real-time predictive risk monitoring &amp; decision support</p>
                    </div>
                    {/* Active Location Breadcrumb */}
                    <div className={`location-breadcrumb ${hasLocation ? 'location-breadcrumb-active' : ''}`}>
                        {hasLocation ? (
                            <>
                                <span className="location-breadcrumb-dot" />
                                <MapPin size={13} />
                                <span>{locationLabel()}</span>
                            </>
                        ) : (
                            <>
                                <Globe size={13} />
                                <span>All India</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="glass-card stat-card blue animate-in" onClick={() => navigate('/signal-monitor')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><Newspaper size={22} /></div>
                    <div className="stat-value">{data.total_articles}</div>
                    <div className="stat-label">Total Signals Processed</div>
                </div>
                <div className="glass-card stat-card blue animate-in" onClick={() => navigate('/signal-monitor')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><Flame size={22} /></div>
                    <div className="stat-value">{data.active_problems_count || 0}</div>
                    <div className="stat-label">Problem Clusters</div>
                </div>
                <div className="glass-card stat-card amber animate-in" onClick={() => navigate('/scanner')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><AlertTriangle size={22} /></div>
                    <div className="stat-value" style={{ color: data.fake_news_percentage > 30 ? '#ef4444' : '#f59e0b' }}>
                        {data.fake_news_percentage}%
                    </div>
                    <div className="stat-label">Fake News Detected</div>
                </div>
                <div className="glass-card stat-card green animate-in" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><Activity size={22} /></div>
                    <div className="stat-value">{data.active_alerts}</div>
                    <div className="stat-label">Active Alerts</div>
                </div>
                <div className="glass-card stat-card blue animate-in" onClick={() => navigate('/citizen-reports')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><Users size={22} /></div>
                    <div className="stat-value" style={{ color: '#8b5cf6' }}>
                        {data.citizen_reports_count || 0}
                    </div>
                    <div className="stat-label">Citizen Reports</div>
                </div>
            </div>

            {/* Heatmap + Sentiment */}
            <div className="grid-2-1">
                <div className="glass-card chart-card animate-in">
                    <div className="section-title">
                        <MapPin size={18} /> Risk Heatmap by Location
                    </div>
                    <RiskHeatmapMap filters={location} />
                </div>

                <div className="glass-card chart-card animate-in">
                    <div className="section-title">
                        <Activity size={18} /> Sentiment Split
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={sentimentData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                            >
                                {sentimentData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.8rem' }}
                                itemStyle={{ color: '#f1f5f9' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                        {sentimentData.map((s, i) => (
                            <span key={s.name} style={{ fontSize: '0.75rem', color: PIE_COLORS[i], fontWeight: 600 }}>
                                ● {s.name}: {s.value}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Category Risk Bar Chart */}
            <div className="glass-card chart-card animate-in" style={{ marginBottom: '24px' }}>
                <div className="section-title">
                    <TrendingUp size={18} /> Risk by Category
                </div>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.category_risk || []} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis type="category" dataKey="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                        <Tooltip
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#f1f5f9' }}
                            formatter={(value) => [`${value}`, 'Avg GRI']}
                        />
                        <Bar dataKey="avg_gri" radius={[0, 6, 6, 0]} maxBarSize={28}>
                            {(data.category_risk || []).map((entry) => (
                                <Cell key={entry.category} fill={RISK_COLORS[entry.avg_gri > 60 ? 'HIGH' : entry.avg_gri > 30 ? 'MODERATE' : 'LOW']} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Priority Rankings Table */}
            <div className="glass-card animate-in">
                <div className="section-title">
                    <Shield size={18} /> Priority Rankings — Top Risk Signals
                    {hasLocation && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 500, marginLeft: '8px', background: 'rgba(59,130,246,0.12)', padding: '2px 8px', borderRadius: '12px' }}>
                            {locationLabel()}
                        </span>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Signal Title</th>
                                <th>Category</th>
                                <th>Location</th>
                                <th>GRI Score</th>
                                <th>Veracity</th>
                                <th>Anger</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.top_risks?.map((r, i) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>#{i + 1}</td>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '280px' }}>
                                        {r.title}
                                    </td>
                                    <td>{r.category}</td>
                                    <td>{r.location || (r.city ? [r.city, r.district, r.state].filter(Boolean).join(', ') : '—')}</td>
                                    <td>
                                        <span style={{
                                            color: RISK_COLORS[r.risk_level] || '#94a3b8',
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                        }}>
                                            {r.gri_score}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${r.label?.toLowerCase()}`}>
                                            {r.label}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="anger-bar-container">
                                            <div className="anger-bar">
                                                <div
                                                    className="anger-bar-fill"
                                                    style={{
                                                        width: `${(r.anger_rating / 10) * 100}%`,
                                                        background: r.anger_rating > 7 ? '#ef4444' : r.anger_rating > 4 ? '#f59e0b' : '#10b981',
                                                    }}
                                                />
                                            </div>
                                            <span className="anger-bar-label" style={{
                                                color: r.anger_rating > 7 ? '#ef4444' : r.anger_rating > 4 ? '#f59e0b' : '#10b981',
                                            }}>
                                                {r.anger_rating}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!data.top_risks || data.top_risks.length === 0) && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No signals found for the selected location.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
