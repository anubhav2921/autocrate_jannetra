import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    fetchGovernanceProblem, fetchProblemHistory,
    acceptProblem, startProblem, resolveProblem, assignProblem,
    searchUsers, escalateProblem
} from '../services/api';
import { ArrowLeft, CheckCircle, Play, AlertTriangle, UserPlus } from 'lucide-react';

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
    return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function AssignModal({ problemId, onClose, onDone }) {
    const [q, setQ] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [err, setErr] = useState('');

    const search = () => {
        setLoading(true);
        searchUsers(q).then(r => setUsers(r.users || r || [])).catch(() => {}).finally(() => setLoading(false));
    };

    const doAssign = (user) => {
        setAssigning(true);
        assignProblem(problemId, { assignee_user_id: user.id || user.user_id, notes: note })
            .then(() => { onDone(); onClose(); })
            .catch(e => setErr(e?.response?.data?.detail || 'Failed to assign'))
            .finally(() => setAssigning(false));
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Assign Problem</h3>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {err && <div className="alert alert-error">{err}</div>}
                    <div className="form-group">
                        <label className="form-label">Search User</label>
                        <div style={{ display:'flex', gap:8 }}>
                            <input className="form-control" value={q} onChange={e=>setQ(e.target.value)} placeholder="Name or email..." />
                            <button className="btn btn-secondary" onClick={search} disabled={loading}>Search</button>
                        </div>
                    </div>
                    {users.length > 0 && (
                        <div style={{ border:'1px solid var(--border)', borderRadius:6, overflow:'hidden', marginBottom:12 }}>
                            {users.map(u => (
                                <div key={u.id||u.user_id} style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
                                    onClick={() => doAssign(u)}>
                                    <div>
                                        <div style={{ fontWeight:600, fontSize:'0.83rem' }}>{u.name}</div>
                                        <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{u.role} &bull; {u.email}</div>
                                    </div>
                                    <button className="btn btn-primary btn-sm" disabled={assigning}>Assign</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Note (optional)</label>
                        <textarea className="form-control" value={note} onChange={e=>setNote(e.target.value)} rows={2} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResolveModal({ problemId, onClose, onDone }) {
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const submit = () => {
        if (!note.trim()) { setErr('Please enter resolution notes.'); return; }
        setSaving(true);
        resolveProblem(problemId, { resolution_notes: note })
            .then(() => { onDone(); onClose(); })
            .catch(e => setErr(e?.response?.data?.detail || 'Failed'))
            .finally(() => setSaving(false));
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Resolve Problem</h3>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {err && <div className="alert alert-error">{err}</div>}
                    <div className="form-group">
                        <label className="form-label">Resolution Notes *</label>
                        <textarea className="form-control" value={note} onChange={e=>setNote(e.target.value)} rows={4} placeholder="Describe how the problem was resolved..." />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-success" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Mark Resolved'}</button>
                </div>
            </div>
        </div>
    );
}

export default function ProblemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [problem, setProblem]   = useState(null);
    const [history, setHistory]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [acting, setActing]     = useState(false);
    const [modal, setModal]       = useState(null); // 'assign' | 'resolve'

    const load = () => {
        setLoading(true);
        Promise.all([
            fetchGovernanceProblem(id),
            fetchProblemHistory(id).catch(() => ({ history: [] }))
        ]).then(([p, h]) => {
            setProblem(p.problem || p);
            setHistory(h.history || h || []);
        }).catch(e => setError(e?.response?.data?.detail || 'Failed to load problem'))
          .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const action = async (fn, label) => {
        if (!window.confirm(`Are you sure you want to: ${label}?`)) return;
        setActing(true);
        try { await fn(); load(); }
        catch (e) { alert(e?.response?.data?.detail || `Failed: ${label}`); }
        finally { setActing(false); }

    };

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;
    if (error)   return <div className="alert alert-error" style={{ marginTop:20 }}>{error}</div>;
    if (!problem) return null;

    const p = problem;
    const loc = [p.location?.ward, p.location?.city, p.location?.district, p.location?.state].filter(Boolean).join(', ');

    return (
        <div>
            {modal === 'assign'  && <AssignModal  problemId={id} onClose={() => setModal(null)} onDone={load} />}
            {modal === 'resolve' && <ResolveModal problemId={id} onClose={() => setModal(null)} onDone={load} />}

            <div className="page-header">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/problems')} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div>
                        <h1 style={{ fontSize:'1.1rem' }}>{p.title}</h1>
                        <div style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap' }}>
                            <StatusBadge status={p.status} />
                            <PriorityBadge priority={p.priority} />
                        </div>
                    </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {['DETECTED','VERIFIED','ASSIGNED'].includes(p.status) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal('assign')} disabled={acting}>
                            <UserPlus size={14} /> Assign
                        </button>
                    )}
                    {p.status === 'ASSIGNED' && (
                        <button className="btn btn-primary btn-sm" onClick={() => action(() => acceptProblem(id), 'Accept')} disabled={acting}>
                            <CheckCircle size={14} /> Accept
                        </button>
                    )}
                    {p.status === 'ACCEPTED' && (
                        <button className="btn btn-primary btn-sm" onClick={() => action(() => startProblem(id), 'Start Work')} disabled={acting}>
                            <Play size={14} /> Start Work
                        </button>
                    )}
                    {p.status === 'IN_PROGRESS' && (
                        <button className="btn btn-success btn-sm" onClick={() => setModal('resolve')} disabled={acting}>
                            <CheckCircle size={14} /> Resolve
                        </button>
                    )}
                    {!['RESOLVED','CLOSED','ESCALATED'].includes(p.status) && (
                        <button className="btn btn-secondary btn-sm" style={{ color:'var(--danger)' }} onClick={() => action(() => escalateProblem(id, { reason: 'Manual escalation' }), 'Escalate')} disabled={acting}>
                            <AlertTriangle size={14} /> Escalate
                        </button>
                    )}
                </div>
            </div>

            <div className="detail-layout">
                <div>
                    <div className="detail-section">
                        <h3>Details</h3>
                        <div className="detail-row"><label>ID</label><span style={{ fontFamily:'monospace', fontSize:'0.8rem' }}>{p.problem_id || id}</span></div>
                        <div className="detail-row"><label>Category</label><span>{p.category || '—'}</span></div>
                        <div className="detail-row"><label>Department</label><span>{p.department || p.jurisdiction_name || '—'}</span></div>
                        <div className="detail-row"><label>Location</label><span>{loc || '—'}</span></div>
                        <div className="detail-row"><label>Assigned To</label><span>{p.current_owner_name || '—'}</span></div>
                        <div className="detail-row"><label>Reported By</label><span>{p.reporter_name || p.source || '—'}</span></div>
                        <div className="detail-row"><label>Source</label><span>{p.source_type || p.source || '—'}</span></div>
                        <div className="detail-row"><label>Created</label><span>{fmt(p.created_at)}</span></div>
                        {p.due_at && <div className="detail-row"><label>Due Date</label><span>{fmt(p.due_at)}</span></div>}
                    </div>

                    {p.description && (
                        <div className="detail-section">
                            <h3>Description</h3>
                            <p style={{ fontSize:'0.85rem', lineHeight:1.6, color:'var(--text-secondary)', whiteSpace:'pre-wrap' }}>{p.description}</p>
                        </div>
                    )}

                    {p.resolution_notes && (
                        <div className="detail-section">
                            <h3>Resolution Notes</h3>
                            <p style={{ fontSize:'0.85rem', color:'var(--success)', lineHeight:1.6 }}>{p.resolution_notes}</p>
                        </div>
                    )}
                </div>

                <div>
                    <div className="detail-section">
                        <h3>Timeline</h3>
                        {history.length === 0 ? (
                            <p style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>No history yet.</p>
                        ) : (
                            <div className="timeline">
                                {history.map((h, i) => (
                                    <div className="timeline-item" key={i}>
                                        <div className="timeline-dot" />
                                        <div className="timeline-body">
                                            <div className="timeline-action">{h.action || h.event || h.status}</div>
                                            <div className="timeline-meta">
                                                {h.actor_name || h.by || '—'} &bull; {fmt(h.created_at || h.timestamp)}
                                            </div>
                                            {h.notes && <div className="timeline-note">{h.notes}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
