import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight } from 'lucide-react';

const VerifiedAlertCard = ({ complaint, onReview }) => (
    <motion.div
        layout
        className="sample-issue-card"
        style={{ padding: '24px', background: 'var(--bg-glass)' }}
        whileHover={{ scale: 1.02, backgroundColor: 'var(--bg-glass-hover)' }}
    >
        <div className="issue-meta">
            <div className="issue-loc"><MapPin size={14} /> {complaint.location || 'Unknown'}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <span className="status-badge" style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low)', borderColor: 'var(--border-color)' }}>Verified</span>
            </div>
        </div>
        <div className="issue-type" style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-primary)' }}>{complaint.title || 'Civic Issue'}</div>
        <div className="issue-footer">
            <div className="confidence-score" style={{ color: 'var(--risk-low)', background: 'var(--risk-low-bg)' }}>{complaint.confidence_score}% Accuracy</div>
            <button className="cta-btn cta-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => onReview(complaint)}>
                Details <ArrowRight size={16} />
            </button>
        </div>
    </motion.div>
);

export default VerifiedAlertCard;
