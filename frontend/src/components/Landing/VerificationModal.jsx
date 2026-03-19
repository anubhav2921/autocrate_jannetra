import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const VerificationModal = ({ isOpen, onClose, complaint, onVerify }) => {
    const [comment, setComment] = useState('');

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <motion.div
                className="modal-content glass-card"
                style={{
                    background: 'var(--bg-secondary)', width: '90%', maxWidth: '500px',
                    padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-lg)'
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--text-primary)' }}>Verify Issue</h3>
                    <button className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    <div className="modal-issue-info" style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                        <p style={{ color: 'var(--text-secondary)' }}><strong>Location:</strong> {complaint.location}</p>
                        <p style={{ color: 'var(--text-secondary)' }}><strong>Issue:</strong> {complaint.type || complaint.title}</p>
                    </div>
                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Add your verification comment:</label>
                    <textarea
                        className="modal-textarea"
                        style={{
                            width: '100%', minHeight: '100px', padding: '12px',
                            background: 'var(--bg-glass)', border: '1px solid var(--border-color)',
                            borderRadius: '8px', color: 'var(--text-primary)',
                            fontFamily: 'inherit', marginBottom: '20px'
                        }}
                        placeholder="Describe what you see on the ground..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => {
                        onVerify(complaint.id, comment);
                        onClose();
                        setComment('');
                    }}>Confirm Verification</button>
                </div>
            </motion.div>
        </div>
    );
};

export default VerificationModal;
