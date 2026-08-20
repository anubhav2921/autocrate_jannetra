import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Trash2, UserCheck, Eye, X } from 'lucide-react';
import api from '../services/api';

export default function ProblemActionMenu({ problem, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTakeCustody = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIsProcessing(true);
        try {
            const currentUser = JSON.parse(localStorage.getItem('user')) || { uid: 'u-1', name: 'Assigned Officer' };
            const res = await api.post(`/workflows/${problem.id}/assign`, {
                assignee_id: currentUser.uid || currentUser.id || "u-1",
                assignee_name: currentUser.name || "Assigned Officer"
            });
            setIsOpen(false);
            setShowDetailsModal(false);
            if (onUpdate) onUpdate(problem.id, 'assigned', res);
        } catch (err) {
            console.error("Assignment failed:", err);
            alert(err.response?.data?.detail || "Failed to take custody.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!deleteReason.trim()) {
            alert("Please provide a reason for deletion.");
            return;
        }
        setIsProcessing(true);
        try {
            const res = await api.post(`/workflows/${problem.id}/delete`, { reason: deleteReason });
            setShowDeleteModal(false);
            setIsOpen(false);
            if (onUpdate) onUpdate(problem.id, 'deleted', res);
        } catch (err) {
            console.error("Deletion failed:", err);
            alert("Failed to delete the report.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{ position: 'relative', zIndex: isOpen ? 9999 : 1 }} ref={menuRef}>
            <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
                style={{
                    background: 'transparent', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
                    borderRadius: '4px'
                }}
                className="hover-bg"
            >
                <MoreVertical size={18} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                    background: '#1e1e2e', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '8px', zIndex: 99999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.8)', minWidth: '180px'
                }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                            setShowDetailsModal(true);
                        }}
                        style={{
                            width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent',
                            border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                            borderRadius: '4px'
                        }}
                        className="hover-bg"
                    >
                        <Eye size={14} /> View Details
                    </button>

                    <button
                        type="button"
                        onClick={handleTakeCustody}
                        disabled={isProcessing}
                        style={{
                            width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent',
                            border: 'none', color: '#10b981', cursor: isProcessing ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                            borderRadius: '4px', opacity: isProcessing ? 0.5 : 1
                        }}
                        className="hover-bg"
                    >
                        <UserCheck size={14} /> Take Custody
                    </button>

                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(false); setShowDeleteModal(true); }}
                        style={{
                            width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent',
                            border: 'none', color: '#ef4444', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                            borderRadius: '4px'
                        }}
                        className="hover-bg"
                    >
                        <Trash2 size={14} /> Delete Report
                    </button>
                </div>
            )}

            {/* View Details Modal */}
            {showDetailsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 100000, padding: '20px'
                }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    <div className="glass-card" style={{
                        width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
                        padding: '24px', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.3)',
                        background: '#131726', boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 700, background: 'rgba(99,102,241,0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                    ID: {problem.id}
                                </span>
                                <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', fontWeight: 700, marginTop: '8px', lineHeight: 1.4 }}>
                                    {problem.title}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetailsModal(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>SEVERITY</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: problem.severity === 'Critical' || problem.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>
                                    {problem.severity || 'Medium'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CATEGORY</div>
                                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>{problem.category || 'General'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>PRIORITY SCORE</div>
                                <div style={{ fontSize: '0.9rem', color: '#60a5fa', fontWeight: 800 }}>{problem.priority_score || problem.priorityScore || problem.riskScore || 75}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>STATUS</div>
                                <div style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 600 }}>{problem.status || 'Pending'}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>LOCATION</div>
                            <div style={{ fontSize: '0.88rem', color: '#f8fafc' }}>
                                {typeof problem.location === 'string' ? problem.location : problem.city || 'Unknown Location'}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>DESCRIPTION & INTELLIGENCE</div>
                            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {problem.description || problem.title || 'Governance intelligence signal detected and aggregated by JanNetra AI.'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    navigate(`/signal-monitor/${problem.id}`);
                                }}
                                style={{ padding: '9px 16px', background: '#181c2e', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                            >
                                Full Report Page
                            </button>
                            <button
                                type="button"
                                onClick={handleTakeCustody}
                                disabled={isProcessing}
                                style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                            >
                                {isProcessing ? 'Assigning...' : 'Take Custody'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 100000
                }}>
                    <div className="glass-card" style={{
                        width: '400px', padding: '24px', borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.3)', background: '#181824'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Trash2 size={20} /> Delete Problem
                            </h3>
                            <button type="button" onClick={() => setShowDeleteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Please provide a mandatory reason for deleting this report to maintain full audit logs.
                        </p>
                        <textarea
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="Reason for deletion..."
                            style={{
                                width: '100%', height: '80px', padding: '12px', borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
                                color: 'white', marginBottom: '16px', fontSize: '0.85rem'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                Cancel
                            </button>
                            <button type="button" onClick={handleDelete} disabled={isProcessing} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.7 : 1 }}>
                                {isProcessing ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
