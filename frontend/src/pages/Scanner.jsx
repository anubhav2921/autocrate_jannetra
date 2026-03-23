import { useState } from 'react';
import {
    Search, Instagram, Twitter, Facebook, MessageCircle, Globe, AlertTriangle,
    Shield, Flame, CheckCircle2, XCircle, HelpCircle, Zap, FileText,
} from 'lucide-react';
import api from '../services/apiClient';

const PLATFORMS = [
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C' },
    { id: 'twitter', label: 'Twitter / X', icon: Twitter, color: '#1DA1F2' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
    { id: 'news', label: 'News Site', icon: Globe, color: '#3b82f6' },
    { id: 'complaint', label: 'Complaint', icon: FileText, color: '#f59e0b' },
];

const RISK_COLORS = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#ef4444' };
const LABEL_ICONS = {
    REAL: <CheckCircle2 size={16} style={{ color: '#10b981' }} />,
    FAKE: <XCircle size={16} style={{ color: '#ef4444' }} />,
    UNCERTAIN: <HelpCircle size={16} style={{ color: '#f59e0b' }} />,
};

export default function Scanner() {
    const [text, setText] = useState('');
    const [platform, setPlatform] = useState('instagram');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleScan = async () => {
        if (text.trim().length < 10) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await api.post('/scan', { text, platform, source_url: url });
            if (data.success) setResult(data.analysis);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Social Media Scanner</h1>
                <p>Paste any social media post for instant NLP, fake news detection, and risk scoring</p>
            </div>

            {/* Platform Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }} className="animate-in">
                {PLATFORMS.map((p) => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                        className={`btn ${platform === p.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            ...(platform === p.id ? { background: p.color, borderColor: p.color } : {}),
                        }}>
                        <p.icon size={14} /> {p.label}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="glass-card animate-in" style={{ marginBottom: '20px' }}>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Paste a ${PLATFORMS.find(p => p.id === platform)?.label || ''} post here...\n\nExample: "BREAKING: Major water crisis in Delhi! Officials hiding contamination reports. 5000 families affected. Government doing NOTHING! Share this before they take it down! #WaterCrisis #Corruption"`}
                    rows={5}
                    style={{
                        width: '100%', padding: '14px', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-color)', borderRadius: '8px',
                        color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'var(--font-family)',
                        resize: 'vertical', lineHeight: '1.6',
                    }}
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
                    <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                        placeholder="Source URL (optional)"
                        style={{
                            flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-color)', borderRadius: '8px',
                            color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-family)',
                        }} />
                    <button onClick={handleScan} className="btn btn-primary" disabled={loading || text.trim().length < 10}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px' }}>
                        <Zap size={16} />
                        {loading ? 'Analyzing...' : 'Analyze Post'}
                    </button>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    {text.length} characters · {text.split(/\s+/).filter(Boolean).length} words
                </div>
            </div>

            {/* Results */}
            {result && (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {/* Overview Cards */}
                    <div className="stats-grid">
                        <div className={`glass-card stat-card ${result.fake_news.label === 'FAKE' ? 'red' : result.fake_news.label === 'REAL' ? 'green' : 'amber'} animate-in`}>
                            <div className="stat-icon">{LABEL_ICONS[result.fake_news.label]}</div>
                            <div className="stat-value" style={{
                                color: result.fake_news.label === 'FAKE' ? '#ef4444' : result.fake_news.label === 'REAL' ? '#10b981' : '#f59e0b',
                                fontSize: '1.4rem',
                            }}>
                                {result.fake_news.label}
                            </div>
                            <div className="stat-label">Veracity Assessment</div>
                        </div>
                        <div className={`glass-card stat-card ${result.gri.risk_level === 'HIGH' ? 'red' : result.gri.risk_level === 'MODERATE' ? 'amber' : 'green'} animate-in`}>
                            <div className="stat-icon"><Shield size={22} /></div>
                            <div className="stat-value" style={{ color: RISK_COLORS[result.gri.risk_level] }}>
                                {result.gri.score}
                            </div>
                            <div className="stat-label">GRI Score / 100</div>
                        </div>
                        <div className="glass-card stat-card red animate-in">
                            <div className="stat-icon"><Flame size={22} /></div>
                            <div className="stat-value" style={{
                                color: result.nlp.anger_rating > 5 ? '#ef4444' : '#f59e0b',
                            }}>
                                {result.nlp.anger_rating}
                            </div>
                            <div className="stat-label">Anger Rating / 10</div>
                        </div>
                        <div className="glass-card stat-card blue animate-in">
                            <div className="stat-icon"><Search size={22} /></div>
                            <div className="stat-value" style={{ fontSize: '1.3rem' }}>
                                {(result.fake_news.confidence * 100).toFixed(0)}%
                            </div>
                            <div className="stat-label">Detection Confidence</div>
                        </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="grid-2">
                        {/* NLP Analysis */}
                        <div className="glass-card animate-in">
                            <div className="section-title"><Search size={18} /> NLP Analysis</div>
                            <div style={{ display: 'grid', gap: '10px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Sentiment</span>
                                    <span className={`badge badge-${result.nlp.sentiment?.toLowerCase()}`}>{result.nlp.sentiment}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Polarity</span>
                                    <span style={{ fontWeight: 600, color: result.nlp.polarity > 0 ? '#10b981' : '#ef4444' }}>{result.nlp.polarity}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Subjectivity</span>
                                    <span style={{ fontWeight: 600 }}>{result.nlp.subjectivity}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Word Count</span>
                                    <span>{result.nlp.word_count}</span>
                                </div>
                                {result.nlp.entities?.locations?.length > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Locations Found</span>
                                        <span style={{ color: 'var(--accent-blue)' }}>{result.nlp.entities.locations.join(', ')}</span>
                                    </div>
                                )}
                            </div>
                            {result.nlp.claims?.length > 0 && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Claims Detected:</div>
                                    {result.nlp.claims.slice(0, 3).map((c, i) => (
                                        <div key={i} style={{
                                            fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '6px 10px',
                                            background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '4px',
                                            borderLeft: '3px solid var(--accent-blue)',
                                        }}>
                                            "{c}"
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Fake News Signals */}
                        <div className="glass-card animate-in">
                            <div className="section-title"><AlertTriangle size={18} /> Detection Signals</div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {Object.entries(result.fake_news.signals || {}).map(([signal, value]) => {
                                    const score = typeof value === 'number' ? value : (value ? 1 : 0);
                                    return (
                                        <div key={signal} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {signal.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="score-bar" style={{ width: '80px' }}>
                                                    <div className="score-bar-fill" style={{
                                                        width: `${Math.min(score * 100, 100)}%`,
                                                        background: score > 0.6 ? '#ef4444' : score > 0.3 ? '#f59e0b' : '#10b981',
                                                    }} />
                                                </div>
                                                <span style={{
                                                    fontSize: '0.75rem', fontWeight: 600, minWidth: '32px',
                                                    color: score > 0.6 ? '#ef4444' : score > 0.3 ? '#f59e0b' : '#10b981',
                                                }}>
                                                    {(score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* GRI Components */}
                    <div className="glass-card animate-in">
                        <div className="section-title"><Shield size={18} /> GRI Dimension Breakdown</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            {Object.entries(result.gri.components || {}).map(([dim, score]) => (
                                <div key={dim} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'capitalize' }}>
                                        {dim.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto' }}>
                                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.9" fill="none"
                                                stroke={score > 60 ? '#ef4444' : score > 30 ? '#f59e0b' : '#10b981'}
                                                strokeWidth="3" strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
                                        </svg>
                                        <div style={{
                                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.8rem', fontWeight: 700,
                                            color: score > 60 ? '#ef4444' : score > 30 ? '#f59e0b' : '#10b981',
                                        }}>
                                            {score.toFixed(0)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alert (if generated) */}
                    {result.alert && (
                        <div className={`alert-card severity-${result.alert.severity?.toLowerCase()} animate-in`}>
                            <div className="alert-card-header">
                                <span className={`badge badge-${result.alert.severity?.toLowerCase()}`}>
                                    <AlertTriangle size={11} style={{ marginRight: '4px' }} />
                                    {result.alert.severity} ALERT
                                </span>
                            </div>
                            <div className="alert-card-body">
                                <p><strong>Department:</strong> {result.alert.department}</p>
                                <p><strong>Recommendation:</strong> {result.alert.recommendation}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <strong>Response Strategy:</strong> {result.alert.response_strategy}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
