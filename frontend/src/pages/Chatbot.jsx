import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import api from '../services/apiClient';

export default function Chatbot() {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: "👋 Hello! I'm your **Governance Intelligence Assistant**. I can query real-time data from the system.\n\nTry asking:\n• \"What are the top risks?\"\n• \"Risk in Mumbai\"\n• \"Fake news stats\"\n• \"Alert summary\"\n• \"Category breakdown\"\n• \"GRI overview\"",
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEnd = useRef(null);

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const data = await api.post('/chatbot', { message: userMsg });
            setMessages((prev) => [...prev, { role: 'bot', text: data.response }]);
        } catch {
            setMessages((prev) => [...prev, { role: 'bot', text: '❌ Server unavailable. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Simple markdown-like rendering
    const renderText = (text) => {
        return text.split('\n').map((line, i) => {
            const formatted = line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/• /g, '<span style="color:var(--accent-blue)">•</span> ');
            return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} style={{ marginBottom: '2px' }} />;
        });
    };

    return (
        <div className="page-container" style={{ height: 'calc(100vh - var(--navbar-height) - 56px)', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header animate-in" style={{ marginBottom: '16px' }}>
                <h1>AI Governance Assistant</h1>
                <p>Ask questions about risks, alerts, and governance data in natural language</p>
            </div>

            {/* Chat Container */}
            <div className="glass-card animate-in" style={{
                flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden',
            }}>
                {/* Messages */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px',
                    display: 'flex', flexDirection: 'column', gap: '14px',
                }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            display: 'flex', gap: '10px',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                background: msg.role === 'bot' ? 'var(--gradient-primary)' : 'var(--gradient-success)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {msg.role === 'bot' ? <Sparkles size={14} color="white" /> : <User size={14} color="white" />}
                            </div>
                            <div style={{
                                maxWidth: '75%', padding: '12px 16px', borderRadius: '12px',
                                background: msg.role === 'bot'
                                    ? 'rgba(255,255,255,0.04)'
                                    : 'rgba(59,130,246,0.12)',
                                border: `1px solid ${msg.role === 'bot' ? 'var(--border-color)' : 'rgba(59,130,246,0.2)'}`,
                                fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)',
                            }}>
                                {renderText(msg.text)}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                background: 'var(--gradient-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Sparkles size={14} color="white" />
                            </div>
                            <div style={{
                                padding: '12px 16px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                            }}>
                                <div className="typing-dots">
                                    <span /><span /><span />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEnd} />
                </div>

                {/* Input */}
                <div style={{
                    padding: '16px 20px', borderTop: '1px solid var(--border-color)',
                    display: 'flex', gap: '10px', alignItems: 'center',
                }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Ask about risks, alerts, fake news, locations..."
                        style={{
                            flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-color)', borderRadius: '10px',
                            color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)',
                        }}
                    />
                    <button onClick={sendMessage} disabled={loading || !input.trim()}
                        className="btn btn-primary" style={{
                            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
