import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Clock, MapPin, ShieldAlert, AlertTriangle, ArrowLeft, CheckCircle, 
    Check, Play, Send, ShieldCheck, UserPlus, HelpCircle, History, MessageSquare
} from 'lucide-react';
import { 
    fetchGovernanceProblem, fetchProblemHistory, acceptProblem, startProblem, 
    resolveProblem, verifyResolution, escalateProblem, assignProblem, searchUsers,
    getRoutingRecommendation
} from '../services/api';

export default function GovernanceProblemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [problem, setProblem] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Actions overlays/modals
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    
    // Action inputs
    const [assigneeQuery, setAssigneeQuery] = useState('');
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [assignReason, setAssignReason] = useState('');
    
    const [resolutionSummary, setResolutionSummary] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    
    const [verifyApproved, setVerifyApproved] = useState(true);
    const [verifyRemarks, setVerifyRemarks] = useState('');
    
    const [escalateReason, setEscalateReason] = useState('');
    const [routingRec, setRoutingRec] = useState(null);

    const currentUser = JSON.parse(localStorage.getItem('user')) || { id: '', role: 'CITIZEN', name: '' };

    const loadProblemData = async () => {
        try {
            const data = await fetchGovernanceProblem(id);
            setProblem(data);
            
            const logs = await fetchProblemHistory(id);
            setHistory(logs || []);
            
            // Fetch AI routing recommendation if pending assignment
            if (data.status === 'VERIFIED' || data.status === 'ROUTED') {
                const rec = await getRoutingRecommendation(id);
                setRoutingRec(rec);
            }
        } catch (err) {
            console.error("Error loading governance problem details", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProblemData();
    }, [id]);

    useEffect(() => {
        if (assigneeQuery.length > 1) {
            const delayDebounceFn = setTimeout(async () => {
                try {
                    const users = await searchUsers(assigneeQuery);
                    setEligibleUsers(users || []);
                } catch (err) {
                    console.error(err);
                }
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setEligibleUsers([]);
        }
    }, [assigneeQuery]);

    const handleAccept = async () => {
        try {
            await acceptProblem(id);
            loadProblemData();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to accept problem.");
        }
    };

    const handleStart = async () => {
        try {
            await startProblem(id);
            loadProblemData();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to start work.");
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!selectedUser) {
            alert("Please select a user to assign.");
            return;
        }
        try {
            await assignProblem(id, {
                assigned_to_user_id: selectedUser.id,
                assigned_to_organization_id: selectedUser.organization_id,
                assigned_to_jurisdiction_id: selectedUser.jurisdiction_id,
                reason: assignReason,
                priority: problem.priority,
                due_days: 2
            });
            setShowAssignModal(false);
            setSelectedUser(null);
            setAssignReason('');
            setAssigneeQuery('');
            loadProblemData();
        } catch (err) {
            alert(err.response?.data?.detail || "Assignment failed.");
        }
    };

    const handleResolve = async (e) => {
        e.preventDefault();
        try {
            await resolveProblem(id, {
                resolution_summary: resolutionSummary,
                evidence_url: evidenceUrl
            });
            setShowResolveModal(false);
            setResolutionSummary('');
            setEvidenceUrl('');
            loadProblemData();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to submit resolution.");
        }
    };

    const handleVerifyResolution = async (e) => {
        e.preventDefault();
        try {
            await verifyResolution(id, {
                approved: verifyApproved,
                remarks: verifyRemarks
            });
            setShowVerifyModal(false);
            setVerifyRemarks('');
            loadProblemData();
        } catch (err) {
            alert(err.response?.data?.detail || "Verification failed.");
        }
    };

    const handleEscalate = async (e) => {
        e.preventDefault();
        try {
            await escalateProblem(id, { reason: escalateReason });
            setShowEscalateModal(false);
            setEscalateReason('');
            loadProblemData();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to escalate problem.");
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
                <Clock className="animate-spin" size={36} />
                <span style={{ marginLeft: '12px' }}>Loading problem details...</span>
            </div>
        );
    }

    if (!problem) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
                <h3>Problem not found</h3>
                <button onClick={() => navigate('/governance-inbox')} className="btn-secondary">
                    Back to Inbox
                </button>
            </div>
        );
    }

    const isOverdue = new Date(problem.due_at) < new Date() && problem.status !== 'RESOLVED';
    const isOwner = problem.current_owner_user_id === currentUser.id;

    // Render Timeline Status Indicators
    const workflowStages = ["DETECTED", "VERIFIED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "RESOLUTION_SUBMITTED", "RESOLVED"];
    const currentStageIndex = workflowStages.indexOf(problem.status);

    return (
        <div className="page-container" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
            
            {/* Top Navigation */}
            <button 
                onClick={() => navigate('/governance-inbox')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px', fontSize: '0.95rem' }}
            >
                <ArrowLeft size={16} /> Back to Problem Inbox
            </button>

            {/* Title & Basic Status Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        GOVERNANCE INCIDENT #{problem.problem_id}
                    </span>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 12px 0' }}>{problem.title}</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <MapPin size={16} style={{ color: 'var(--accent-blue)' }} /> {problem.location?.address}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: problem.priority === 'CRITICAL' || problem.priority === 'HIGH' ? '#ef4444' : '#f59e0b' }}>
                            <ShieldAlert size={16} /> Priority: {problem.priority}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        Status: {problem.status}
                    </span>
                    {isOverdue && (
                        <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={14} /> Overdue SLA breach!
                        </span>
                    )}
                </div>
            </div>

            {/* Workflow Progress Timeline */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '32px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Workflow Timeline</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    {/* Horizontal Line connector */}
                    <div style={{ position: 'absolute', top: '15px', left: '5%', right: '5%', height: '2px', background: 'var(--border-color)', zIndex: 1 }} />
                    
                    {workflowStages.map((stage, idx) => {
                        const isCompleted = idx <= currentStageIndex;
                        const isActive = idx === currentStageIndex;
                        return (
                            <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%', zIndex: 2, position: 'relative' }}>
                                <div style={{ 
                                    width: '32px', height: '32px', borderRadius: '50%', 
                                    background: isActive ? 'var(--accent-blue)' : isCompleted ? 'rgba(16, 185, 129, 0.2)' : '#1e1e24',
                                    border: isActive ? '4px solid #fff' : isCompleted ? '2px solid #10b981' : '2px solid var(--border-color)',
                                    color: isCompleted ? '#10b981' : 'var(--text-muted)',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.8rem' 
                                }}>
                                    {isCompleted && !isActive ? <Check size={14} /> : idx + 1}
                                </div>
                                <span style={{ fontSize: '0.68rem', textAlign: 'center', marginTop: '8px', color: isActive ? '#fff' : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isActive || isCompleted ? 600 : 400 }}>
                                    {stage.replace('_', ' ')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '32px' }}>
                {/* Left Side Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Description */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Problem Description</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{problem.description}</p>
                    </div>

                    {/* Geocode Jurisdiction Breakdown */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Jurisdiction Boundary Location</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>State</span>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>{problem.location?.state || 'Uttar Pradesh'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>District</span>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>{problem.location?.district || 'Prayagraj'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Block</span>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>{problem.location?.block || 'Demo Block'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Panchayat / Village</span>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                                    {problem.location?.panchayat || 'ABC Panchayat'} / {problem.location?.village || 'Demo Village'}
                                </div>
                            </div>
                            {problem.location?.ward && (
                                <div>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ward</span>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>{problem.location?.ward}</div>
                                </div>
                            )}
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Coordinates</span>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                                    {problem.location?.latitude || 25.4358}, {problem.location?.longitude || 81.8463}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Routing recommendation box (visible for assignment users) */}
                    {routingRec && (
                        <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px dashed var(--accent-blue)', padding: '24px', borderRadius: '16px' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                💡 AI Routing Engine Recommendation (Confidence: {(routingRec.confidence * 100).toFixed(0)}%)
                            </h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                The routing AI has recommended the following assignments based on problem category and geographic boundaries.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommended Org</span>
                                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{routingRec.organization?.name || 'ABC Panchayat'}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommended Jurisdiction</span>
                                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{routingRec.jurisdiction?.name || 'ABC Panchayat'} ({routingRec.jurisdiction?.level})</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suggested Officer</span>
                                    <div style={{ fontWeight: 600, marginTop: '2px' }}>
                                        {routingRec.users?.[0]?.name || 'Rahul Kumar'} ({routingRec.users?.[0]?.role})
                                    </div>
                                </div>
                            </div>
                            {currentUser.role !== 'CITIZEN' && (
                                <button 
                                    onClick={() => {
                                        if (routingRec.users?.[0]) setSelectedUser(routingRec.users[0]);
                                        setAssignReason("AI Recommended Routing Approval.");
                                        setShowAssignModal(true);
                                    }} 
                                    style={{ marginTop: '20px', background: 'var(--accent-blue)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Approve Routing Recommendation
                                </button>
                            )}
                        </div>
                    )}

                    {/* Resolution Proof (If submitted or resolved) */}
                    {problem.resolution_summary && (
                        <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid #10b981', padding: '24px', borderRadius: '16px' }}>
                            <h3 style={{ margin: '0 0 12px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={20} /> Resolution Details
                            </h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                {problem.resolution_summary}
                            </p>
                            {problem.evidence_url && (
                                <div>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Evidence Attachment:</span>
                                    <div style={{ marginTop: '6px' }}>
                                        <a href={problem.evidence_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                                            🔗 View Evidence Photo
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Right Side Owner / Deadlines Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Owner Card */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Ownership & Custody</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Responsible Organization</span>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>
                                    {problem.organization_id === 'ORG-ABC-PCT' ? 'ABC Panchayat' : 'Demo Municipality'}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Assigned Officer</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {problem.current_owner_user_id ? 'R' : '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {problem.current_owner_user_id ? 'Rahul Kumar' : 'Unassigned'}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {problem.current_owner_user_id ? 'Panchayat Officer' : 'Awaiting Routing'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deadline SLA Box */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>SLA deadlines</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Assigned At:</span>
                                <span>{problem.assigned_at ? new Date(problem.assigned_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Due Date:</span>
                                <span>{new Date(problem.due_at).toLocaleDateString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Time Status:</span>
                                {problem.status === 'RESOLVED' ? (
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>Closed</span>
                                ) : isOverdue ? (
                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>SLA BREACHED</span>
                                ) : (
                                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>Active</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS BUTTONS PANEL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* 1. Verify Problem (Detected status) */}
                        {problem.status === 'DETECTED' && currentUser.role !== 'CITIZEN' && (
                            <button 
                                onClick={async () => {
                                    try {
                                        const res = await verifyProblem(id, { remarks: "Incident verified." });
                                        loadProblemData();
                                    } catch (err) {
                                        alert("Verification failed.");
                                    }
                                }} 
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--accent-blue)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <ShieldCheck size={18} /> Verify Signal Problem
                            </button>
                        )}

                        {/* 2. Assign Problem (Verified/Routed status) */}
                        {(problem.status === 'VERIFIED' || problem.status === 'ROUTED') && currentUser.role !== 'CITIZEN' && (
                            <button 
                                onClick={() => setShowAssignModal(true)} 
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--accent-blue)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <UserPlus size={18} /> Assign Official Owner
                            </button>
                        )}

                        {/* 3. Accept Problem (Assigned status) */}
                        {problem.status === 'ASSIGNED' && (currentUser.role === 'ADMIN' || isOwner) && (
                            <button 
                                onClick={handleAccept} 
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: '#ec4899', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <Check size={18} /> Accept Problem Task
                            </button>
                        )}

                        {/* 4. Start Work (Accepted status) */}
                        {problem.status === 'ACCEPTED' && (currentUser.role === 'ADMIN' || isOwner) && (
                            <button 
                                onClick={handleStart} 
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <Play size={18} /> Start Work In Progress
                            </button>
                        )}

                        {/* 5. Submit Resolution (In Progress status) */}
                        {problem.status === 'IN_PROGRESS' && (currentUser.role === 'ADMIN' || isOwner) && (
                            <button 
                                onClick={() => setShowResolveModal(true)} 
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <Send size={18} /> Submit Work Resolution
                            </button>
                        )}

                        {/* 6. Verify Resolution (Resolution Submitted status) */}
                        {problem.status === 'RESOLUTION_SUBMITTED' && currentUser.role !== 'CITIZEN' && !isOwner && (
                            <button 
                                onClick={() => setShowVerifyModal(true)} 
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <ShieldCheck size={18} /> Verify Resolved Proof
                            </button>
                        )}

                        {/* 7. Reassign / Escalate Option (Gov users manual) */}
                        {problem.status !== 'RESOLVED' && currentUser.role !== 'CITIZEN' && (
                            <button 
                                onClick={() => setShowEscalateModal(true)} 
                                className="btn-secondary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <AlertTriangle size={16} /> Escalate to Supervisor
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* Audit History Timeline Log */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={18} style={{ color: 'var(--accent-blue)' }} /> Immutable Audit Trail
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px' }}>
                    {/* Vertical line connection */}
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '7px', width: '2px', background: 'var(--border-color)' }} />
                    
                    {history.map((log) => (
                        <div key={log.history_id} style={{ position: 'relative' }}>
                            {/* Circle bullet */}
                            <div style={{ position: 'absolute', left: '-22px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-blue)', border: '2px solid #121214' }} />
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.action}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px' }}>
                                    <span>Actor: {log.actor_id === 'USR-CITIZEN' ? 'Demo Citizen' : log.actor_id === 'USR-PANCHAYAT' ? 'Rahul Kumar' : 'System'} ({log.actor_role})</span>
                                    {log.remarks && <span>Remarks: {log.remarks}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            {/* ASSIGNMENT MODAL */}
            {showAssignModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#121214', width: '480px', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserPlus size={20} /> Assign Official Action Owner
                        </h3>
                        <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Search Official by Name/Username/Phone</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Type official name (e.g. Rahul)..."
                                    value={assigneeQuery}
                                    onChange={(e) => setAssigneeQuery(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                />
                                {eligibleUsers.length > 0 && (
                                    <div style={{ background: '#1e1e24', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {eligibleUsers.map(u => (
                                            <div 
                                                key={u.id}
                                                onClick={() => { setSelectedUser(u); setAssigneeQuery(u.name); setEligibleUsers([]); }}
                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}
                                                className="hover-highlight"
                                            >
                                                <strong>{u.name}</strong> ({u.role}) - {u.phone}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {selectedUser && (
                                <div style={{ background: 'rgba(59,130,246,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-blue)', fontSize: '0.85rem' }}>
                                    <strong>Selected Assignee:</strong> {selectedUser.name} ({selectedUser.role})
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Reason for Assignment</label>
                                <textarea 
                                    rows={2}
                                    value={assignReason}
                                    onChange={(e) => setAssignReason(e.target.value)}
                                    placeholder="Provide any instructions or explanation..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => { setShowAssignModal(false); setSelectedUser(null); }} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                    Assign Problem
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RESOLUTION MODAL */}
            {showResolveModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#121214', width: '480px', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Send size={20} /> Submit Work Resolution
                        </h3>
                        <form onSubmit={handleResolve} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Resolution Summary</label>
                                <textarea 
                                    required
                                    rows={4}
                                    value={resolutionSummary}
                                    onChange={(e) => setResolutionSummary(e.target.value)}
                                    placeholder="Describe actions taken, resources used, and benefits delivered..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff', resize: 'vertical' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Evidence Image URL (Optional)</label>
                                <input 
                                    type="text"
                                    value={evidenceUrl}
                                    onChange={(e) => setEvidenceUrl(e.target.value)}
                                    placeholder="https://example.com/photo.jpg"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setShowResolveModal(false)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                    Submit Resolution
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VERIFY RESOLUTION MODAL */}
            {showVerifyModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#121214', width: '480px', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={20} /> Verify Incident Resolution
                        </h3>
                        <form onSubmit={handleVerifyResolution} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Verification Decision</label>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="decision" 
                                            checked={verifyApproved === true}
                                            onChange={() => setVerifyApproved(true)}
                                        /> Approve & Close Problem
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="decision"
                                            checked={verifyApproved === false}
                                            onChange={() => setVerifyApproved(false)}
                                        /> Reject (Reopen Problem)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Verification Remarks / Feedback</label>
                                <textarea 
                                    required
                                    rows={3}
                                    value={verifyRemarks}
                                    onChange={(e) => setVerifyRemarks(e.target.value)}
                                    placeholder="Enter comments about resolution audit..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setShowVerifyModal(false)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                    Submit Verification
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ESCALATE MODAL */}
            {showEscalateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#121214', width: '480px', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                            <AlertTriangle size={20} /> Escalate to Higher Authority
                        </h3>
                        <form onSubmit={handleEscalate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Reason for Escalation</label>
                                <textarea 
                                    required
                                    rows={4}
                                    value={escalateReason}
                                    onChange={(e) => setEscalateReason(e.target.value)}
                                    placeholder="Explain why this problem requires supervisor attention..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#1e1e24', color: '#fff', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setShowEscalateModal(false)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                    Escalate Incident
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
