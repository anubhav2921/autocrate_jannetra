import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

const SampleIssueCard = ({ location, type, confidence, delay, source, onVerify }) => (
    <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.02 }}
        className="sample-issue-card"
    >
        <div className="issue-meta">
            <div className="issue-loc"><MapPin size={14} /> {location}</div>
            <div className="confidence-score">{confidence}% AI Match</div>
        </div>
        <div className="issue-type">{type}</div>
        <div className="issue-footer">
            <span className="status-badge" style={{ fontSize: '0.65rem' }}>{source || 'Flagged'}</span>
            <button className="verify-btn" onClick={onVerify}>Verify Now</button>
        </div>
    </motion.div>
);

export default SampleIssueCard;
