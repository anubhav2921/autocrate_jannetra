import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Trash2, UserCheck, Eye, X } from 'lucide-react';
import api from '../services/api';

export default function ProblemActionMenu({ problem, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [dropdownStyles, setDropdownStyles] = useState({ opacity: 0, transform: 'scale(0.95)' });
    const [isMobile, setIsMobile] = useState(false);
    
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const calculatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const isMobileView = viewportWidth < 768;
        setIsMobile(isMobileView);

        if (isMobileView) {
            setDropdownStyles({
                position: 'fixed',
                bottom: '0',
                left: '0',
                width: '100%',
                paddingBottom: 'env(safe-area-inset-bottom, 24px)',
                background: 'rgba(24, 24, 36, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                zIndex: 999999,
                padding: '20px',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                transform: 'translateY(100%)',
                opacity: 0,
            });
            // trigger entrance animation shortly after mount
            setTimeout(() => {
                setDropdownStyles(prev => ({ ...prev, transform: 'translateY(0)', opacity: 1 }));
            }, 10);
            return;
        }

        // Desktop positioning logic
        const dropdownWidth = 200;
        const dropdownHeight = 160;

        let top = rect.bottom + 8;
        let left = rect.right - dropdownWidth;

        // Auto-adjust if it overflows bottom
        if (top + dropdownHeight > viewportHeight) {
            top = rect.top - dropdownHeight - 8;
        }
        
        // Auto-adjust if it overflows left
        if (left < 10) {
            left = rect.left;
        }

        setDropdownStyles({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${dropdownWidth}px`,
            background: 'rgba(30, 30, 46, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '8px',
            zIndex: 999999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
            transform: 'scale(0.95) translateY(-10px)',
            opacity: 0,
        });

        // Trigger entrance
        setTimeout(() => {
            setDropdownStyles(prev => ({ ...prev, transform: 'scale(1) translateY(0)', opacity: 1 }));
        }, 10);
    }, []);

    const toggleMenu = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            calculatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        const handleScrollOrResize = () => {
            // To prevent jitter, just close the menu on layout changes
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen]);

    const handleTakeCustody = async (e) => {
        e.stopPropagation();
        setIsProcessing(true);
        try {
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

    const handleDelete = async (e) => {
        e.stopPropagation();
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

    const actionButtonStyle = {
        width: '100%', textAlign: 'left', padding: isMobile ? '16px' : '10px 12px', background: 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '12px', fontSize: isMobile ? '1rem' : '0.85rem',
        borderRadius: '8px', transition: 'background 0.2s',
        marginBottom: '4px'
    };

    return (
        <div style={{ position: 'relative' }}>
            <button 
                ref={buttonRef}
                onClick={toggleMenu}
                style={{
                    background: isOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center',
                    borderRadius: '6px', transition: 'background 0.2s'
                }}
                className="hover-bg"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && createPortal(
                <div 
                    ref={dropdownRef} 
                    style={dropdownStyles}
                    onKeyDown={(e) => {
                        // extremely basic focus trapping
                        if (e.key === 'Tab') {
                            e.preventDefault();
                        }
                    }}
                >
                    {isMobile && (
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px', borderRadius: '4px' }} />
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/signal-monitor/${problem.id}`); setIsOpen(false); }}
                        style={{ ...actionButtonStyle, color: 'var(--text-primary)' }}
                        className="hover-bg"
                    >
                        <Eye size={18} /> View Details
                    </button>
                    
                    <button 
                        onClick={handleTakeCustody}
                        disabled={isProcessing}
                        style={{ ...actionButtonStyle, color: '#10b981', opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                        className="hover-bg"
                        aria-label="Take Custody"
                    >
                        <UserCheck size={18} /> Take Custody
                    </button>
                    
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); setShowDeleteModal(true); }}
                        style={{ ...actionButtonStyle, color: '#ef4444', marginBottom: 0 }}
                        className="hover-bg"
                    >
                        <Trash2 size={18} /> Delete Report
                    </button>
                </div>,
                document.body
            )}

            {/* Delete Modal uses standard absolute/fixed approach as it is relatively centered and easy to maintain */}
            {showDeleteModal && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div className="glass-card" style={{
                        width: '90%', maxWidth: '400px', padding: '24px', borderRadius: '16px',
                        border: '1px solid rgba(239, 68, 68, 0.3)', background: '#181824',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Trash2 size={20} /> Delete Problem
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                            Please provide a mandatory reason for deleting this report to maintain full audit logs.
                        </p>
                        <textarea 
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="Reason for deletion..."
                            autoFocus
                            style={{
                                width: '100%', height: '100px', padding: '12px', borderRadius: '8px',
                                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
                                color: 'white', marginBottom: '20px', fontSize: '0.9rem',
                                resize: 'none', outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px' }}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={isProcessing} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.7 : 1, transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isProcessing ? 'Deleting...' : <><Trash2 size={16}/> Confirm Delete</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {/* Extremely basic global styles injection just for animation ease */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}} />
        </div>
    );
}
