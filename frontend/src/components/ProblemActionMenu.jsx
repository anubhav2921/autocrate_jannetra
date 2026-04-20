import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Trash2, UserCheck, Eye, X } from 'lucide-react';
import api from '../services/api';

export default function ProblemActionMenu({ problem, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
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

    const handleTakeCustody = async () => {
        setIsProcessing(true);
        try {
            // Mocking current user ID (in real app, get from Context)
            const currentUser = JSON.parse(localStorage.getItem('user')) || { uid: 'u-1', name: 'Leader' };
            await api.post(`/workflows/${problem.id}/assign`, {
                assignee_id: currentUser.uid || currentUser.id,
                assignee_name: currentUser.name || "Assigned Leader"
            });
            setIsOpen(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Assignment failed:", err);
            alert("Failed to take custody.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteReason.trim()) {
            alert("Please provide a reason for deletion.");
            return;
        }
        setIsProcessing(true);
        try {
            await api.post(`/workflows/${problem.id}/delete`, { reason: deleteReason });
            setShowDeleteModal(false);
            if (onUpdate) onUpdate();
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
                onClick={() => setIsOpen(!isOpen)}
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
                        onClick={() => navigate(`/signal-monitor/${problem.id}`, { state: { readonly: true } })}
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
                        onClick={() => { setIsOpen(false); setShowDeleteModal(true); }}
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

            {showDeleteModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card" style={{
                        width: '400px', padding: '24px', borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.3)', background: '#181824'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Trash2 size={20} /> Delete Problem
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
                            <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={isProcessing} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.7 : 1 }}>
                                {isProcessing ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
