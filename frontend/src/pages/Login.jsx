import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield, Mail, Lock, Phone, KeyRound, RefreshCw,
} from 'lucide-react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import {
    loginWithEmail,
    loginWithPhoneOTP,
    verifyOTP,
    setupRecaptcha,
    verifyFirebaseToken,
} from '../services/authService';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:8000/api';

export default function Login({ onLogin }) {
    const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState('input'); // 'input' | 'otp'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [gLoading, setGLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [resendTimer, setResendTimer] = useState(0);

    const navigate = useNavigate();
    const recaptchaRef = useRef(null);
    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    // Handle Google redirect result
    useEffect(() => {
        getRedirectResult(auth)
            .then(async (result) => {
                if (!result) return;
                setGLoading(true);
                try {
                    const idToken = await result.user.getIdToken();
                    const response = await axios.post(
                        `${API_BASE}/auth/google`,
                        {},
                        { headers: { Authorization: `Bearer ${idToken}` } }
                    );
                    const { user } = response.data;
                    localStorage.setItem('user', JSON.stringify(user));
                    onLogin(user);
                    navigate('/');
                } catch (err) {
                    console.error('[Google Redirect] Backend error:', err);
                    setError('Google sign-in succeeded but backend verification failed.');
                } finally {
                    setGLoading(false);
                }
            })
            .catch((err) => {
                if (err?.code !== 'auth/popup-closed-by-user') {
                    console.error('[Google Redirect] Error:', err?.code);
                }
            });
    }, []);

    // Cleanup timer
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Resend countdown
    const startResendTimer = () => {
        setResendTimer(60);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // Email Login
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Try Firebase Auth first
            const { idToken } = await loginWithEmail(email, password);

            // Verify with backend
            const response = await verifyFirebaseToken(idToken, '/api/auth/firebase-login');
            const { user } = response;
            localStorage.setItem('user', JSON.stringify(user));
            onLogin(user);
            navigate('/');
        } catch (err) {
            console.error('[Email Login] Error:', err?.code, err?.message);

            if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
                // Fallback to backend-only auth
                try {
                    const res = await fetch(`${API_BASE}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        onLogin(data.user);
                        navigate('/');
                        return;
                    } else {
                        setError(data.error || 'Invalid email or password');
                        return;
                    }
                } catch {
                    setError('Invalid email or password');
                    return;
                }
            }

            if (err?.code === 'auth/user-not-found') {
                // Try backend-only auth
                try {
                    const res = await fetch(`${API_BASE}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        onLogin(data.user);
                        navigate('/');
                        return;
                    } else {
                        setError(data.error || 'No account found with this email');
                        return;
                    }
                } catch {
                    setError('No account found with this email');
                    return;
                }
            }

            if (err?.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please wait a few minutes.');
                return;
            }

            if (err?.code === 'auth/network-request-failed') {
                setError('Network error. Check your internet connection.');
                return;
            }

            // Final fallback: try backend-only
            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    onLogin(data.user);
                    navigate('/');
                    return;
                } else {
                    setError(data.error || 'Login failed');
                    return;
                }
            } catch {
                setError('Server unavailable. Please start the backend server.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Phone OTP Send
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        const cleaned = phone.replace(/\s/g, '');
        if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
            setError('Enter a valid phone number (e.g. +919876543210)');
            return;
        }

        setLoading(true);
        try {
            // Try Firebase phone auth first
            if (!recaptchaRef.current) {
                recaptchaRef.current = setupRecaptcha('recaptcha-container');
            }
            const result = await loginWithPhoneOTP(cleaned, recaptchaRef.current);
            setConfirmationResult(result);
            setStep('otp');
            startResendTimer();
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Send OTP Error:', err);

            // Fallback to backend OTP
            if (
                err?.code === 'auth/billing-not-enabled' ||
                err?.code === 'auth/operation-not-allowed' ||
                err?.code === 'auth/internal-error'
            ) {
                try {
                    const res = await fetch(`${API_BASE}/auth/send-phone-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone_number: cleaned }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setConfirmationResult(null); // Mark as backend OTP
                        setStep('otp');
                        startResendTimer();
                        setTimeout(() => otpRefs.current[0]?.focus(), 100);
                        return;
                    } else {
                        setError(data.error || 'Failed to send OTP');
                        return;
                    }
                } catch {
                    setError('Server unavailable. Please try again.');
                    return;
                }
            }

            if (err?.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please wait a few minutes.');
            } else if (err?.code === 'auth/invalid-phone-number') {
                setError('Invalid phone number. Use E.164 format.');
            } else {
                setError(err?.message || 'Failed to send OTP.');
            }

            // Reset reCAPTCHA on failure
            try {
                recaptchaRef.current?.clear?.();
                recaptchaRef.current = null;
            } catch { /* ignore */ }
        } finally {
            setLoading(false);
        }
    };

    // OTP Input handlers
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    // Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            if (confirmationResult) {
                // Firebase OTP verification
                const { idToken } = await verifyOTP(confirmationResult, code);
                const response = await verifyFirebaseToken(idToken);
                const { user } = response;
                localStorage.setItem('user', JSON.stringify(user));
                onLogin(user);
                navigate('/');
            } else {
                // Backend OTP verification (login)
                const cleaned = phone.replace(/\s/g, '');
                const res = await fetch(`${API_BASE}/auth/login-phone`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: cleaned, otp: code }),
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    onLogin(data.user);
                    navigate('/');
                } else {
                    setError(data.error || 'Login failed');
                }
            }
        } catch (err) {
            console.error('Verify OTP Error:', err);
            if (err?.code === 'auth/invalid-verification-code') {
                setError('Invalid OTP. Please check and try again.');
            } else if (err?.code === 'auth/code-expired') {
                setError('OTP has expired. Please request a new one.');
            } else if (err?.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError(err?.message || 'Verification failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        setError('');
        setOtp(['', '', '', '', '', '']);
        setLoading(true);

        const cleaned = phone.replace(/\s/g, '');
        try {
            // Try reCAPTCHA reset + Firebase
            try { recaptchaRef.current?.clear?.(); } catch { /* ignore */ }
            recaptchaRef.current = setupRecaptcha('recaptcha-container');

            const result = await loginWithPhoneOTP(cleaned, recaptchaRef.current);
            setConfirmationResult(result);
            startResendTimer();
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch {
            // Fallback to backend
            try {
                const res = await fetch(`${API_BASE}/auth/send-phone-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: cleaned }),
                });
                const data = await res.json();
                if (data.success) {
                    setConfirmationResult(null);
                    startResendTimer();
                    setTimeout(() => otpRefs.current[0]?.focus(), 100);
                } else {
                    setError(data.error || 'Failed to resend OTP');
                }
            } catch {
                setError('Server unavailable.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In
    const handleGoogleLogin = async () => {
        setError('');
        setGLoading(true);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            const response = await axios.post(
                `${API_BASE}/auth/google`,
                {},
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            const { user } = response.data;
            localStorage.setItem('user', JSON.stringify(user));
            onLogin(user);
            navigate('/');
        } catch (err) {
            console.error('[Google Auth] Error:', err?.code, err?.message);

            if (err?.code === 'auth/popup-closed-by-user') {
                setError('');
                setGLoading(false);
                return;
            }
            if (err?.code === 'auth/popup-blocked') {
                setError('Popup was blocked. Redirecting to Google sign-in...');
                try { await signInWithRedirect(auth, googleProvider); } catch {
                    setError('Sign-in failed. Please allow popups for this site.');
                }
                return;
            }
            if (err?.code === 'auth/unauthorized-domain') {
                setError('This domain is not authorized in Firebase. Add "localhost" to Firebase Console → Auth → Settings → Authorized Domains.');
                return;
            }
            if (err?.response?.data?.detail) {
                setError(err.response.data.detail);
                return;
            }
            if (err?.code === 'ERR_NETWORK') {
                setError('Backend server is not running.');
                return;
            }
            setError(`Google sign-in failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setGLoading(false);
        }
    };

    // Render
    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                {/* Brand */}
                <div className="auth-brand">
                    <Shield size={36} style={{ color: '#3b82f6' }} />
                    <h1>JanNetra</h1>
                    <p>Governance Intelligence System</p>
                </div>

                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to access governance insights</p>

                {error && <div className="auth-error">{error}</div>}

                {/* Google Sign-In */}
                <button
                    id="google-signin-btn"
                    className="auth-google-btn"
                    onClick={handleGoogleLogin}
                    disabled={gLoading || loading}
                    type="button"
                >
                    {gLoading ? (
                        <span className="auth-google-spinner" />
                    ) : (
                        <svg className="auth-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    )}
                    <span>{gLoading ? 'Signing in…' : 'Continue with Google'}</span>
                </button>

                {/* Divider */}
                <div className="auth-divider">
                    <span>or sign in with</span>
                </div>

                {/* Tabs */}
                <div className="auth-tabs">
                    <button
                        type="button"
                        className={`auth-tab ${activeTab === 'email' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('email'); setError(''); setStep('input'); }}
                    >
                        <Mail size={15} />
                        Email Login
                    </button>
                    <button
                        type="button"
                        className={`auth-tab ${activeTab === 'phone' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('phone'); setError(''); setStep('input'); }}
                    >
                        <Phone size={15} />
                        Phone Login
                    </button>
                </div>

                {/* Email Tab */}
                {activeTab === 'email' && (
                    <form onSubmit={handleEmailLogin} className="auth-form">
                        <div className="auth-field">
                            <Mail size={16} className="auth-field-icon" />
                            <input
                                id="login-email"
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="auth-field">
                            <Lock size={16} className="auth-field-icon" />
                            <input
                                id="login-password"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <div className="auth-forgot-link">
                            <Link to="/forgot-password">Forgot Password?</Link>
                        </div>
                        <button
                            id="login-submit-btn"
                            type="submit"
                            className="btn btn-primary auth-submit"
                            disabled={loading || gLoading}
                        >
                            {loading ? 'Signing in…' : 'Login'}
                        </button>
                    </form>
                )}

                {/* Phone Tab */}
                {activeTab === 'phone' && step === 'input' && (
                    <form onSubmit={handleSendOtp} className="auth-form">
                        <div className="auth-field">
                            <Phone size={16} className="auth-field-icon" />
                            <input
                                id="phone-login-input"
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                autoComplete="tel"
                            />
                        </div>
                        <p className="phone-hint">
                            Include country code (e.g. +91 for India, +1 for US)
                        </p>
                        <button
                            id="login-send-otp-btn"
                            type="submit"
                            className="btn btn-primary auth-submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="btn-loading">
                                    <span className="auth-google-spinner" />
                                    Sending OTP…
                                </span>
                            ) : 'Send OTP'}
                        </button>
                    </form>
                )}

                {activeTab === 'phone' && step === 'otp' && (
                    <>
                        <button
                            className="otp-back-btn"
                            onClick={() => {
                                setStep('input');
                                setOtp(['', '', '', '', '', '']);
                                setError('');
                            }}
                            type="button"
                        >
                            ← Change number
                        </button>
                        <p className="auth-subtitle" style={{ marginBottom: '12px' }}>
                            Enter the 6-digit code sent to <strong>{phone}</strong>
                        </p>
                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="otp-input-group" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        id={`login-otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        className="otp-digit"
                                        autoComplete="one-time-code"
                                    />
                                ))}
                            </div>
                            <button
                                id="login-verify-otp-btn"
                                type="submit"
                                className="btn btn-primary auth-submit"
                                disabled={loading || otp.join('').length !== 6}
                            >
                                {loading ? (
                                    <span className="btn-loading">
                                        <span className="auth-google-spinner" />
                                        Verifying…
                                    </span>
                                ) : 'Verify & Sign In'}
                            </button>
                            <div className="otp-resend">
                                {resendTimer > 0 ? (
                                    <span className="otp-resend-timer">
                                        Resend OTP in <strong>{resendTimer}s</strong>
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="otp-resend-btn"
                                        onClick={handleResend}
                                        disabled={loading}
                                    >
                                        <RefreshCw size={14} />
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </form>
                    </>
                )}

                <p className="auth-footer">
                    Don't have an account? <Link to="/signup">Sign Up</Link>
                </p>
            </div>

            {/* reCAPTCHA container — invisible, must be in DOM */}
            <div id="recaptcha-container" />
        </div>
    );
}
