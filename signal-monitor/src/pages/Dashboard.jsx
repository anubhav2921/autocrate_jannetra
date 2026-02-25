import { useNavigate } from 'react-router-dom'
import { useProblems } from '../context/ProblemContext'

/* ───── helpers ───── */
function fmtDate(iso) {
    const d = new Date(iso)
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    })
}

function severityClass(s) {
    return s === 'Critical' ? 'sev-critical' : s === 'High' ? 'sev-high' : s === 'Medium' ? 'sev-medium' : 'sev-low'
}

/* ───── Stars background component ───── */
function Stars() {
    const stars = Array.from({ length: 120 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2,
    }))

    return (
        <div className="stars-field" aria-hidden>
            {stars.map((s) => (
                <span
                    key={s.id}
                    className="star"
                    style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animationDelay: `${s.delay}s`,
                        animationDuration: `${s.duration}s`,
                    }}
                />
            ))}
        </div>
    )
}

/* ═══════════════════════════════════════════════════════ */
export default function Dashboard() {
    const { problems, loading, error, getStatus } = useProblems()
    const navigate = useNavigate()

    const pending = problems.filter((p) => getStatus(p.id) === 'Pending')
    const resolved = problems.filter((p) => getStatus(p.id) === 'Problem Resolved')

    if (loading) {
        return (
            <div className="dashboard">
                <Stars />
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p className="loading-text">Establishing Signal Link…</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="dashboard">
                <Stars />
                <div className="panel float-drift center-msg">
                    <h2>⚠ Connection Error</h2>
                    <p>{error}</p>
                    <p className="dim">Make sure the backend server is running on port 8000.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard">
            <Stars />

            {/* ── Header ── */}
            <header className="console-header float-drift">
                <div className="header-glow" />
                <div className="header-content">
                    <span className="header-icon">◈</span>
                    <div>
                        <h1>Signal Monitor</h1>
                        <p className="header-sub">Deep-Space Governance Operations Console</p>
                    </div>
                    <div className="header-stats">
                        <div className="stat">
                            <span className="stat-value">{problems.length}</span>
                            <span className="stat-label">Total Signals</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value stat-pending">{pending.length}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value stat-resolved">{resolved.length}</span>
                            <span className="stat-label">Resolved</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Signal Table ── */}
            <section className="panel float-drift" style={{ animationDelay: '0.5s' }}>
                <div className="panel-glow" />
                <h2 className="panel-title"><span className="blink-dot" /> Active Signal Feed</h2>
                <div className="table-wrap">
                    <table className="signal-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Signal Title</th>
                                <th>Severity</th>
                                <th>Category</th>
                                <th>Risk</th>
                                <th>Detected</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {problems.map((p) => {
                                const status = getStatus(p.id)
                                return (
                                    <tr key={p.id} className="table-row-hover">
                                        <td className="mono">{p.id}</td>
                                        <td className="title-cell">{p.title}</td>
                                        <td>
                                            <span className={`badge-severity ${severityClass(p.severity)}`}>
                                                {p.severity}
                                            </span>
                                        </td>
                                        <td>{p.category}</td>
                                        <td>
                                            <div className="risk-bar-wrap">
                                                <div className="risk-bar" style={{ width: `${p.riskScore}%` }}>
                                                    <span className="risk-val">{p.riskScore}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="mono dim">{fmtDate(p.detectedAt)}</td>
                                        <td>
                                            <span className={`status-badge ${status === 'Problem Resolved' ? 'status-resolved' : 'status-pending'}`}>
                                                {status === 'Problem Resolved' ? '● Resolved' : '◌ Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-action"
                                                onClick={() => navigate(`/problem/${p.id}`)}
                                            >
                                                Take Action ›
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── Resolved Issues ── */}
            <section className="panel float-drift" style={{ animationDelay: '1s' }}>
                <div className="panel-glow" />
                <h2 className="panel-title"><span className="blink-dot dot-green" /> Signal Resolution Log</h2>

                {problems.length === 0 ? (
                    <p className="empty-msg">No signals recorded.</p>
                ) : (
                    <div className="resolved-grid">
                        {problems.map((p) => {
                            const status = getStatus(p.id)
                            const isResolved = status === 'Problem Resolved'
                            return (
                                <div key={p.id} className={`resolved-card ${isResolved ? 'card-resolved' : 'card-pending'}`}>
                                    <div className="rc-header">
                                        <span className="mono rc-id">{p.id}</span>
                                        <span className={`status-pill ${isResolved ? 'pill-resolved' : 'pill-pending'}`}>
                                            {isResolved ? '🟢 Problem Resolved' : '🟠 Pending'}
                                        </span>
                                    </div>
                                    <h3 className="rc-title">{p.title}</h3>
                                    <div className="rc-meta">
                                        <span>{p.category}</span>
                                        <span className={`badge-severity small ${severityClass(p.severity)}`}>{p.severity}</span>
                                        <span>Risk: {p.riskScore}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <footer className="console-footer">
                <span>◈ Signal Monitor v1.0 — Governance Deep-Space Operations</span>
            </footer>
        </div>
    )
}
