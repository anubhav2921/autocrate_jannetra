import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGovernanceProblems } from '../services/api';
import { Search, Plus } from 'lucide-react';

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

const STATUS_OPTIONS  = ['', 'DETECTED','VERIFIED','ASSIGNED','ACCEPTED','IN_PROGRESS','RESOLUTION_SUBMITTED','RESOLVED','CLOSED','ESCALATED','REJECTED'];
const PRIORITY_OPTIONS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function Problems() {
    const [items, setItems]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [search, setSearch]     = useState('');
    const [status, setStatus]     = useState('');
    const [priority, setPriority] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        setError(null);
        const params = {};
        if (status)   params.status   = status;
        if (priority) params.priority = priority;
        fetchGovernanceProblems(params)
            .then(res => setItems(res.problems || res.items || []))
            .catch(e  => setError(e?.response?.data?.detail || e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, [status, priority]);

    const filtered = items.filter(p => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (p.title  || '').toLowerCase().includes(q) ||
            (p.problem_id || p.id || '').toLowerCase().includes(q) ||
            (p.location?.district || p.location?.city || '').toLowerCase().includes(q)
        );
    });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Problems</h1>
                    <p>All governance problems — citizen reported &amp; AI detected</p>
                </div>
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                    <input
                        className="form-control search-input"
                        style={{ paddingLeft: 30 }}
                        placeholder="Search by title, ID or location..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
                <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="">All Priorities</option>
                    {PRIORITY_OPTIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="table-wrapper">
                <div className="table-header">
                    <h2>
                        {loading ? 'Loading...' : ${filtered.length} problem}
                    </h2>
                </div>
                {loading ? (
                    <div className="loading-container"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><p>No problems match the current filters.</p></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Assigned To</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const id = p.problem_id || p.id;
                                return (
                                    <tr key={id} onClick={() => navigate(`/problems/${id}`)}>
                                        <td className="td-id">{id}</td>
                                        <td className="td-title" title={p.title}>{p.title}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {[p.location?.ward, p.location?.city, p.location?.district, p.location?.state].filter(Boolean).join(', ') || '—'}
                                        </td>
                                        <td><StatusBadge status={p.status} /></td>
                                        <td><PriorityBadge priority={p.priority} /></td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {p.current_owner_name || p.assigned_to_name || '—'}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt(p.created_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
