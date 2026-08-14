import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AlertTriangle, ShieldAlert, ArrowRight, UserCheck, Clock, RefreshCw
} from 'lucide-react';
import { fetchEscalations } from '../services/api';

export default function EscalationCenter() {
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchEscalations();
            setEscalations(data || []);
        } catch (err) {
            console.error("Failed to load escalations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getOverdueHours = (escalatedAt) => {
        const diff = new Date() - new Date(escalatedAt);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        return hours > 0 ? `${hours} hours` : 'Just now';
    };

    return (
        <div className="page-container" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', margin: 0, color: '#ef4444' }}>
                        <AlertTriangle size={32} /> SLA Escalation Center
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.95rem' }}>
                        Overview of problems that have breached SLA thresholds and been escalated to supervising authorities.
                    </p>
                </div>
                <button onClick={loadData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                    Loading escalation records...
                </div>
            ) : escalations.length === 0 ? (
                <div style={{ padding: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>No active escalations</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>All problems are currently complying with their configured SLAs.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {escalations.map((esc) => (
                        <div 
                            key={esc.escalation_id} 
                            style={{ 
                                background: 'rgba(239, 68, 68, 0.02)', 
                                border: '1px solid rgba(239, 68, 68, 0.2)', 
                                borderRadius: '16px', 
                                padding: '24px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                flexWrap: 'wrap', 
                                gap: '20px' 
                            }}
                        >
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                        LEVEL {esc.level} ESCALATION
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID: {esc.problem_id}</span>
                                </div>
                                
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 12px 0' }}>
                                    {esc.problem_title || 'Escalated Governance Incident'}
                                </h3>

                                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    <strong>Escalation Reason:</strong> {esc.reason}
                                </p>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={14} style={{ color: '#ef4444' }} /> 
                                        Overdue for: <strong style={{ color: '#ef4444' }}>{getOverdueHours(esc.escalated_at)}</strong>
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <UserCheck size={14} /> 
                                        Next Authority ID: <strong>{esc.escalated_to_user_id || 'Supervisor'}</strong>
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => navigate(`/governance-problems/${esc.problem_id}`)}
                                style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid var(--border-color)', 
                                    color: '#fff', 
                                    padding: '10px 20px', 
                                    borderRadius: '8px', 
                                    fontWeight: 600, 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-highlight"
                            >
                                Investigate Problem <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
