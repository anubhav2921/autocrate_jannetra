import { useParams, useNavigate } from 'react-router-dom'
import { useProblems } from '../context/ProblemContext'

function fmtDate(iso) {
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    })
}

export default function ProblemDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { problems, loading, error, getStatus, resolveProblem } = useProblems()

    if (loading) {
        return (
            <div className="dashboard detail-page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p className="loading-text">Loading Signal Data…</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="dashboard detail-page">
                <div className="panel float-drift center-msg">
                    <h2>⚠ Connection Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    const problem = problems.find((p) => p.id === id)
    if (!problem) {
        return (
            <div className="dashboard detail-page">
                <div className="panel float-drift center-msg">
                    <h2>Signal Not Found</h2>
                    <p>No signal with ID <strong>{id}</strong> exists in the database.</p>
                    <button className="btn-back" onClick={() => navigate('/')}>← Return to Console</button>
                </div>
            </div>
        )
    }

    const status = getStatus(problem.id)
    const isResolved = status === 'Problem Resolved'

    const handleResolve = async () => {
        await resolveProblem(problem.id)
    }

    const severityColor =
        problem.severity === 'Critical' ? '#ff2a6d' :
            problem.severity === 'High' ? '#ff6f3c' :
                problem.severity === 'Medium' ? '#ffc13b' : '#05d9e8'

    return (
        <div className="dashboard detail-page">
            {/* Back nav */}
            <button className="btn-back float-drift" onClick={() => navigate('/')}>
                ← Back to Console
            </button>

            {/* Main detail card */}
            <div className="detail-card float-drift" style={{ animationDelay: '0.3s' }}>
                <div className="panel-glow" />

                {/* Top bar */}
                <div className="detail-topbar">
                    <span className="mono detail-id">{problem.id}</span>
                    <span
                        className="detail-severity"
                        style={{ color: severityColor, borderColor: severityColor, boxShadow: `0 0 12px ${severityColor}44` }}
                    >
                        {problem.severity}
                    </span>
                </div>

                <h1 className="detail-title">{problem.title}</h1>

                {/* Meta grid */}
                <div className="detail-meta-grid">
                    <div className="meta-item">
                        <span className="meta-label">Category</span>
                        <span className="meta-value">{problem.category}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Location</span>
                        <span className="meta-value">{problem.location}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Detected At</span>
                        <span className="meta-value mono">{fmtDate(problem.detectedAt)}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Source</span>
                        <span className="meta-value">{problem.source}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Risk Score</span>
                        <span className="meta-value">
                            <span className="detail-risk-score">{problem.riskScore}</span>
                            <span className="detail-risk-max"> / 100</span>
                        </span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Current Status</span>
                        <span className={`status-pill ${isResolved ? 'pill-resolved' : 'pill-pending'}`}>
                            {isResolved ? '🟢 Problem Resolved' : '🟠 Pending'}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <div className="detail-desc-section">
                    <h2 className="detail-desc-heading">Signal Intelligence Report</h2>
                    <p className="detail-desc-text">{problem.description}</p>
                </div>

                {/* Risk Bar */}
                <div className="detail-risk-bar-section">
                    <span className="meta-label">Threat Level</span>
                    <div className="detail-risk-track">
                        <div
                            className="detail-risk-fill"
                            style={{ width: `${problem.riskScore}%` }}
                        />
                    </div>
                </div>

                {/* Action */}
                <div className="detail-actions">
                    {isResolved ? (
                        <div className="resolved-banner">
                            <span className="resolved-icon">✓</span>
                            <div>
                                <strong>Problem Resolved</strong>
                                <p>This signal has been confirmed as resolved by the Lead Operator.</p>
                            </div>
                        </div>
                    ) : (
                        <button className="btn-resolve" onClick={handleResolve}>
                            <span className="resolve-pulse" />
                            Confirm Problem Resolved
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
