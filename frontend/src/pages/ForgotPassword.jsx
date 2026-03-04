import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { resetPassword } from '../services/authService';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err) {
            console.error('[Reset Password] Error:', err?.code, err?.message);

            if (err?.code === 'auth/user-not-found') {
                setError('No account found with this email address.');
            } else if (err?.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (err?.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please wait a few minutes.');
            } else {
                setError(err?.message || 'Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <Shield size={36} style={{ color: '#3b82f6' }} />
                    <h1>JanNetra</h1>
                    <p>Governance Intelligence System</p>
                </div>

                {success ? (
                    /* ─── Success State ─── */
                    <div className="forgot-success">
                        <div className="forgot-success-icon">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="auth-title">Check Your Email</h2>
                        <p className="auth-subtitle" style={{ marginBottom: '8px' }}>
                            Password reset link sent to
                        </p>
                        <p className="forgot-email-highlight">{email}</p>
                        <p className="auth-subtitle" style={{ marginTop: '16px', fontSize: '0.78rem' }}>
                            Check your inbox (and spam folder) for the reset link.
                            The link expires in 1 hour.
                        </p>
                        <button
                            type="button"
                            className="btn btn-primary auth-submit"
                            onClick={() => { setSuccess(false); setEmail(''); }}
                        >
                            Send Another Link
                        </button>
                    </div>
                ) : (
                    /* ─── Form State ─── */
                    <>
                        <h2 className="auth-title">Forgot Password</h2>
                        <p className="auth-subtitle">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {error && <div className="auth-error">{error}</div>}

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="auth-field">
                                <Mail size={16} className="auth-field-icon" />
                                <input
                                    id="forgot-email"
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                            <button
                                id="forgot-submit-btn"
                                type="submit"
                                className="btn btn-primary auth-submit"
                                disabled={loading}
                            >
                                {loading ? 'Sending Reset Link…' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                )}

                <p className="auth-footer" style={{ marginTop: '24px' }}>
                    <Link to="/login" className="forgot-back-link">
                        <ArrowLeft size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Back to Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
