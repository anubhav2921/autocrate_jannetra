import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGovernanceProblems } from '../services/api';


function StatusBadge({ status }) {
    const s = (status || 'new').toLowerCase().replace(/ /g, '_');
    return <span className={`badge badge-${s}`}>{status || 'NEW'}</span>;
}

function PriorityBadge({ priority }) {
    const p = (priority || 'low').toLowerCase();
    return <span className={`badge badge-${p}`}>{priority || 'LOW'}</span>;
}

function fmt(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        fetchGovernanceProblems({ limit: 10 })
            .then(res => {
                const items = res.problems || res.items || [];
                setProblems(items);
                setStats({
                    total:    items.length,
                    open:     items.filter(p => ['DETECTED','VERIFIED','ASSIGNED','ACCEPTED'].includes(p.status)).length,
                    inProg:   items.filter(p => p.status === 'IN_PROGRESS').length,
                    resolved: items.filter(p => ['RESOLVED','CLOSED'].includes(p.status)).length,
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);


    if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading...</span></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Overview of governance problems</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/problems')}>View All Problems</button>
            </div>

            <div className="stats-grid">
                {[
                    { label: 'Total Problems',  value: stats?.total    ?? 0, color: 'var(--text)' },
                    { label: 'Open',            value: stats?.open     ?? 0, color: 'var(--info)' },
                    { label: 'In Progress',     value: stats?.inProg   ?? 0, color: 'var(--warning)' },
                    { label: 'Resolved',        value: stats?.resolved ?? 0, color: 'var(--success)' },
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className="stat-card-label">{s.label}</div>
                        <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="table-wrapper">
                <div className="table-header">
                    <h2>Recent Problems</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/problems')}>See all</button>
                </div>
                {problems.length === 0 ? (
                    <div className="empty-state"><p>No problems found.</p></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {problems.map(p => (
                                <tr key={p.problem_id || p.id} onClick={() => navigate(`/problems/${p.problem_id || p.id}`)}>
                                    <td className="td-id">{p.problem_id || p.id}</td>
                                    <td className="td-title">{p.title}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        {p.location?.district || p.location?.city || p.location?.state || '—'}
                                    </td>
                                    <td><StatusBadge status={p.status} /></td>
                                    <td><PriorityBadge priority={p.priority} /></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmt(p.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
