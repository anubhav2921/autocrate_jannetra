import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Inbox, Search, Filter, AlertTriangle, Plus, Clock, MapPin, 
    ArrowRight, User, ShieldAlert, CheckCircle, RefreshCw
} from 'lucide-react';
import { fetchGovernanceProblems, createGovernanceProblemDirect } from '../services/api';

export default function GovernanceInbox() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProblem, setNewProblem] = useState({
        title: '',
        description: '',
        category: 'Civil Infrastructure',
        priority: 'MEDIUM',
        latitude: '',
        longitude: '',
        address: ''
    });
    
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('user')) || { id: '', role: 'CITIZEN' };

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (priorityFilter !== 'ALL') params.priority = priorityFilter;
            const data = await fetchGovernanceProblems(params);
            setProblems(data || []);
        } catch (err) {
            console.error("Failed to load governance problems", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [statusFilter, priorityFilter]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newProblem,
                latitude: newProblem.latitude ? parseFloat(newProblem.latitude) : null,
                longitude: newProblem.longitude ? parseFloat(newProblem.longitude) : null
            };
            await createGovernanceProblemDirect(payload);
            setShowCreateModal(false);
            setNewProblem({
                title: '',
                description: '',
                category: 'Civil Infrastructure',
                priority: 'MEDIUM',
                latitude: '',
                longitude: '',
                address: ''
            });
            loadData();
        } catch (err) {
            console.error("Error creating direct problem", err);
            alert("Error registering problem. Please verify details.");
        }
    };

    const getStatusStyle = (status) => {
        const s = status?.toUpperCase();
        switch (s) {
            case 'DETECTED': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
            case 'PENDING_VERIFICATION': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
            case 'VERIFIED': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
            case 'ASSIGNED': return { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
            case 'ACCEPTED': return { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' };
            case 'IN_PROGRESS': return { bg: 'rgba(20, 184, 166, 0.1)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.3)' };
            case 'RESOLUTION_SUBMITTED': return { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' };
            case 'RESOLVED': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
            case 'ESCALATED': return { bg: 'rgba(220, 38, 38, 0.15)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.4)' };
            default: return { bg: 'rgba(156, 163, 175, 0.1)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
        }
    };

    const getPriorityColor = (p) => {
        const pr = p?.toUpperCase();
        if (pr === 'CRITICAL') return '#dc2626';
        if (pr === 'HIGH') return '#ef4444';
        if (pr === 'MEDIUM') return '#f59e0b';
        return '#10b981';
    };

    const filtered = problems.filter(p => 
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.problem_id.toLowerCase().includes(search.toLowerCase()) ||
        (p.location?.address || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-container" style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <Inbox size={32} style={{ color: 'var(--accent-blue)' }} /> Governance Problem Inbox
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.95rem' }}>
                        Verifying, routing, and solving official administrative problems inside your jurisdiction boundary.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={loadData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    {currentUser.role === 'ADMIN' || currentUser.role === 'CITIZEN' ? (
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                            <Plus size={18} /> Register Problem
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                {/* Search */}
                <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Search by ID, title, or address..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 16px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.9rem' }}
                    />
                </div>
                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status:</span>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="DETECTED">Detected</option>
                        <option value="PENDING_VERIFICATION">Pending Verification</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="ESCALATED">Escalated</option>
                    </select>
                </div>
                {/* Priority Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Priority:</span>
                    <select 
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                    >
                        <option value="ALL">All Priorities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                </div>
            </div>

            {/* List Table */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                    Loading governance database...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ padding: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                    <AlertTriangle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>No problems found</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>There are no official problems matching your current filter criteria.</p>
                </div>
            ) : (
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Problem</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Priority</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Jurisdiction</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>SLA Timer</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((prob) => {
                                const st = getStatusStyle(prob.status);
                                const isOverdue = new Date(prob.due_at) < new Date() && prob.status !== 'RESOLVED';
                                return (
                                    <tr key={prob.problem_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover-row">
                                        <td style={{ padding: '20px', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent-blue)' }}>
                                            {prob.problem_id}
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{prob.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={12} /> {prob.location?.address || 'Prayagraj'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: getPriorityColor(prob.priority) }}>
                                                <ShieldAlert size={14} /> {prob.priority}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px', fontSize: '0.9rem' }}>
                                            {prob.location?.village || prob.location?.ward || prob.location?.panchayat || prob.location?.district || 'Prayagraj'}
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                                                {prob.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px', fontSize: '0.85rem' }}>
                                            {prob.status === 'RESOLVED' ? (
                                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle size={14} /> Resolved
                                                </span>
                                            ) : isOverdue ? (
                                                <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <AlertTriangle size={14} /> Breached
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={14} /> {new Date(prob.due_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => navigate(`/governance-problems/${prob.problem_id}`)}
                                                className="btn-link"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Details <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Problem Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#121214', width: '500px', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px', position: 'relative' }}>
                        <h2 style={{ fontSize: '1.4rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={20} /> Register Government Problem
                        </h2>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Problem Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={newProblem.title} 
                                    onChange={(e) => updateField('title', e.target.value)}
                                    placeholder="e.g. Broken water pipe leaking"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Description</label>
                                <textarea 
                                    required 
                                    rows={3}
                                    value={newProblem.description} 
                                    onChange={(e) => updateField('description', e.target.value)}
                                    placeholder="Describe the issue in detail..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff', resize: 'vertical' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Category</label>
                                    <select
                                        value={newProblem.category}
                                        onChange={(e) => updateField('category', e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                    >
                                        <option value="Civil Infrastructure">Civil Infrastructure</option>
                                        <option value="Water Supply">Water Supply</option>
                                        <option value="Electricity">Electricity</option>
                                        <option value="Public Health">Public Health</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Priority</label>
                                    <select
                                        value={newProblem.priority}
                                        onChange={(e) => updateField('priority', e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Street Address / Location Info</label>
                                <input 
                                    type="text" 
                                    value={newProblem.address} 
                                    onChange={(e) => updateField('address', e.target.value)}
                                    placeholder="e.g. Near School gate, Demo Village"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Latitude (Optional)</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        value={newProblem.latitude} 
                                        onChange={(e) => updateField('latitude', e.target.value)}
                                        placeholder="25.43"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Longitude (Optional)</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        value={newProblem.longitude} 
                                        onChange={(e) => updateField('longitude', e.target.value)}
                                        placeholder="81.84"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                    Submit Problem
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );

    function updateField(field, value) {
        setNewProblem(prev => ({ ...prev, [field]: value }));
    }
}
