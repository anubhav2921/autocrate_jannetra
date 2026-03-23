import { useState, useEffect } from 'react';
import { Trophy, Award, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import Ballpit from '../components/Ballpit/Ballpit';
import api from '../services/apiClient';

export default function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/leaderboard')
            .then((data) => setLeaders(data.leaderboard || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    const rankColors = { 1: '#fbbf24', 2: '#94a3b8', 3: '#cd7f32' };

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Leader Leaderboard</h1>
                <p>Top-performing leaders ranked by governance resolutions</p>
            </div>

            {/* Ballpit Background + Podium */}
            <div style={{ position: 'relative', minHeight: '340px', marginBottom: '32px' }} className="animate-in">
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '16px',
                    overflow: 'hidden', zIndex: 0, opacity: 0.6,
                }}>
                    <Ballpit
                        count={80}
                        gravity={0.3}
                        friction={0.995}
                        wallBounce={0.9}
                        maxVelocity={0.12}
                        followCursor={true}
                        colors={[0xfbbf24, 0x94a3b8, 0xcd7f32, 0x3b82f6, 0x8b5cf6]}
                        minSize={0.4}
                        maxSize={0.9}
                    />
                </div>

                {/* Podium - Top 3 */}
                {leaders.length >= 1 && (
                    <div style={{
                        position: 'relative', zIndex: 1,
                        display: 'flex', justifyContent: 'center', gap: '20px',
                        alignItems: 'flex-end', flexWrap: 'wrap',
                        paddingTop: '40px', paddingBottom: '40px',
                    }}>
                        {[1, 0, 2].map((idx) => {
                            const l = leaders[idx];
                            if (!l) return null;
                            const isFirst = l.rank === 1;
                            return (
                                <div key={l.id} className="glass-card" style={{
                                    textAlign: 'center', padding: '24px 28px',
                                    width: isFirst ? '220px' : '180px',
                                    transform: isFirst ? 'scale(1.08)' : 'none',
                                    border: `1px solid ${rankColors[l.rank] || 'var(--border-color)'}40`,
                                }}>
                                    <div style={{ fontSize: isFirst ? '2.5rem' : '2rem', marginBottom: '8px' }}>
                                        {l.badge}
                                    </div>
                                    <div style={{
                                        width: isFirst ? 64 : 52, height: isFirst ? 64 : 52, borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${rankColors[l.rank] || '#3b82f6'}80, ${rankColors[l.rank] || '#3b82f6'})`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: isFirst ? '1.5rem' : '1.2rem', fontWeight: 800, color: '#1e293b',
                                        margin: '0 auto 10px',
                                    }}>
                                        {l.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                        {l.name}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                        {l.department}
                                    </div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: rankColors[l.rank] || '#3b82f6' }}>
                                        {l.score}
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        points
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#10b981' }}>
                                            <CheckCircle2 size={11} /> {l.resolved}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
                                            <Clock size={11} /> {l.in_progress}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Full Rankings Table */}
            <div className="glass-card animate-in">
                <div className="section-title">
                    <TrendingUp size={18} /> Full Rankings
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Leader</th>
                            <th>Department</th>
                            <th>Resolved</th>
                            <th>In Progress</th>
                            <th>Total</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaders.map((l) => (
                            <tr key={l.id}>
                                <td>
                                    <span style={{
                                        fontSize: '1.1rem',
                                        color: rankColors[l.rank] || 'var(--text-secondary)',
                                        fontWeight: 700,
                                    }}>
                                        {l.badge} #{l.rank}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</td>
                                <td>{l.department}</td>
                                <td style={{ color: '#10b981', fontWeight: 600 }}>{l.resolved}</td>
                                <td style={{ color: '#f59e0b', fontWeight: 600 }}>{l.in_progress}</td>
                                <td style={{ fontWeight: 700 }}>{l.total_resolutions}</td>
                                <td>
                                    <span style={{
                                        fontWeight: 800, fontSize: '1rem',
                                        color: l.rank <= 3 ? rankColors[l.rank] : 'var(--accent-blue)',
                                    }}>
                                        {l.score}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {leaders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <Trophy size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p>No leaders registered yet. Sign up and start resolving issues!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

