import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, AlertTriangle, MapPin, Download, CheckCircle2, Search } from 'lucide-react';
import api from '../services/api';

const SEVERITY_COLORS = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#f59e0b',
    Low: '#10b981',
};

export default function ExportReportModal({ isOpen, onClose }) {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/signal-problems')
                .then((data) => {
                    // Filter for active issues only
                    const active = data.filter(p => 
                        !p.status || 
                        !['resolved', 'closed', 'archived', 'problem resolved'].includes(p.status.toLowerCase())
                    );
                    setIssues(active);
                })
                .catch(err => console.error('Failed to fetch issues:', err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const handleExport = async () => {
        if (!selectedId) {
            setError('Please select an issue to continue');
            return;
        }

        setGenerating(true);
        setError('');
        try {
            // We use standard window.location or a direct fetch trick for downloads to handle headers/streams
            const response = await api.get(`/export-report?issue_id=${selectedId}`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Issue_Report_${selectedId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
            setError('Failed to generate report. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const filteredIssues = issues.filter(i => 
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={onClose}>
                    <motion.div 
                        className="glass-card modal-content"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: '540px', background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)', borderRadius: '20px',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            maxHeight: '90vh'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '24px', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FileText className="text-blue" size={24} /> Export Issue Report
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Select a specific issue to generate a detailed professional report
                                </p>
                            </div>
                            <button onClick={onClose} className="btn-icon">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search & List */}
                        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                            <div className="auth-field" style={{ marginBottom: '16px' }}>
                                <Search size={16} className="auth-field-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search issues by title or ID..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ padding: '12px 14px 12px 40px', width: '100%', borderRadius: '10px' }}
                                />
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading active issues...</p>
                                </div>
                            ) : filteredIssues.length > 0 ? (
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    {filteredIssues.map((issue) => (
                                        <div 
                                            key={issue.id}
                                            onClick={() => { setSelectedId(issue.id); setError(''); }}
                                            style={{
                                                padding: '14px', borderRadius: '12px', cursor: 'pointer',
                                                background: selectedId === issue.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                                                border: selectedId === issue.id ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                transition: 'all 0.2s ease',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ flex: 1, marginRight: '12px' }}>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {issue.title}
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <MapPin size={12} /> {issue.location || 'Unknown'}
                                                    </span>
                                                    <span>ID: {issue.id}</span>
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                                                background: `${SEVERITY_COLORS[issue.severity] || '#94a3b8'}22`,
                                                color: SEVERITY_COLORS[issue.severity] || '#94a3b8',
                                                border: `1px solid ${SEVERITY_COLORS[issue.severity] || '#94a3b8'}44`
                                            }}>
                                                {issue.severity || 'Medium'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                    <p>No active issues found matching your search.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.05)' }}>
                            {error && (
                                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px', textAlign: 'center' }}>
                                    {error}
                                </div>
                            )}
                            <button 
                                className="btn btn-primary" 
                                onClick={handleExport}
                                disabled={generating || !selectedId}
                                style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                {generating ? (
                                    <>
                                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                                        Generating Professional PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} /> Generate Issue Report
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
