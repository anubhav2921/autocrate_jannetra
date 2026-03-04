import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield, Mail, Lock, User, Phone, KeyRound, Building2, ArrowLeft, RefreshCw,
} from 'lucide-react';
import {
    signUpWithEmail,
    loginWithPhoneOTP,
    verifyOTP,
    setupRecaptcha,
    createUserProfile,
    verifyFirebaseToken,
} from '../services/authService';

const DEPARTMENTS = [
    'Water Supply Department', 'Public Works Department', 'Health Department',
    'Education Department', 'Police Department', 'Municipal Corporation',
    'Transport Department', 'Anti-Corruption Bureau', 'General Administration',
];

export default function Signup({ onLogin }) {
    const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'

    // ── Email form state ─────────────────────────────────────
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', department: '' });

    // ── Phone form state ─────────────────────────────────────
    const [phoneName, setPhoneName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState('form'); // 'form' | 'otp'
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [resendTimer, setResendTimer] = useState(0);

    // ── Shared state ─────────────────────────────────────────
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const recaptchaRef = useRef(null);
    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    const update = (field, value) => setForm({ ...form, [field]: value });

    // Cleanup timer
    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

    // ══════════════════════════════════════════════════════════
    //  EMAIL SIGNUP
    // ══════════════════════════════════════════════════════════
    const handleEmailSignup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (form.password !== form.confirm) {
            setError('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Firebase Auth account
            const { user: firebaseUser, idToken } = await signUpWithEmail(form.email, form.password);

            // 2. Create user profile in backend
            const profileRes = await createUserProfile({
                name: form.name,
                email: form.email,
                phone: '',
                firebase_uid: firebaseUser.uid,
            });

            if (profileRes.success) {
                localStorage.setItem('user', JSON.stringify(profileRes.user));
                onLogin(profileRes.user);
                navigate('/');
            } else {
                // Fallback: still log them in via Firebase token
                const fbRes = await verifyFirebaseToken(idToken);
                const { user } = fbRes;
                localStorage.setItem('user', JSON.stringify(user));
                onLogin(user);
                navigate('/');
            }
        } catch (err) {
            console.error('[Email Signup] Error:', err?.code, err?.message);

            if (err?.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please login instead.');
                return;
            }
            if (err?.code === 'auth/weak-password') {
                setError('Password is too weak. Use at least 6 characters.');
                return;
            }
            if (err?.code === 'auth/invalid-email') {
                setError('Invalid email address format.');
                return;
            }

            // Fallback to backend-only signup
            try {
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: form.name,
                        email: form.email,
                        password: form.password,
                        role: 'LEADER',
                        department: form.department,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    if (data.otp_sent) {
                        setSuccess('Account created! Check backend console for OTP.');
                    } else {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        onLogin(data.user);
                        navigate('/');
                    }
                } else {
                    setError(data.error || 'Signup failed.');
                }
            } catch {
                setError(err?.message || 'Signup failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ══════════════════════════════════════════════════════════
    //  PHONE SIGNUP — Send OTP
    // ══════════════════════════════════════════════════════════
    const handlePhoneSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        if (!phoneName.trim()) {
            setError('Please enter your name');
            return;
        }

        const cleaned = phone.replace(/\s/g, '');
        if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
            setError('Enter a valid phone number (e.g. +919876543210)');
            return;
        }

        setLoading(true);
        try {
            // Try Firebase phone auth first
            if (!recaptchaRef.current) {
                recaptchaRef.current = setupRecaptcha('signup-recaptcha-container');
            }
            const result = await loginWithPhoneOTP(cleaned, recaptchaRef.current);
            setConfirmationResult(result);
            setStep('otp');
            startResendTimer();
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Phone Signup OTP Error:', err);

            // Fallback to backend OTP
            if (
                err?.code === 'auth/billing-not-enabled' ||
                err?.code === 'auth/operation-not-allowed' ||
                err?.code === 'auth/internal-error'
            ) {
                try {
                    const res = await fetch('/api/auth/send-phone-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone_number: cleaned, name: phoneName }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setConfirmationResult(null);
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
                setError('Invalid phone number.');
            } else {
                setError(err?.message || 'Failed to send OTP.');
            }

            try { recaptchaRef.current?.clear?.(); recaptchaRef.current = null; } catch { /* ignore */ }
        } finally {
            setLoading(false);
        }
    };

    // ── OTP handlers ─────────────────────────────────────────
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

    // ══════════════════════════════════════════════════════════
    //  PHONE SIGNUP — Verify OTP
    // ══════════════════════════════════════════════════════════
    const handleVerifyPhoneOtp = async (e) => {
        e.preventDefault();
        setError('');
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }

        setLoading(true);
        const cleaned = phone.replace(/\s/g, '');

        try {
            if (confirmationResult) {
                // Firebase OTP verification
                const { user: firebaseUser, idToken } = await verifyOTP(confirmationResult, code);

                // Create user profile in backend
                try {
                    const profileRes = await createUserProfile({
                        name: phoneName,
                        email: '',
                        phone: cleaned,
                        firebase_uid: firebaseUser.uid,
                    });

                    if (profileRes.success) {
                        localStorage.setItem('user', JSON.stringify(profileRes.user));
                        onLogin(profileRes.user);
                        navigate('/');
                        return;
                    }
                } catch { /* fallback below */ }

                // Fallback: verify via firebase-login endpoint
                const fbRes = await verifyFirebaseToken(idToken);
                const { user } = fbRes;
                localStorage.setItem('user', JSON.stringify(user));
                onLogin(user);
                navigate('/');
            } else {
                // Backend OTP verification (register)
                const res = await fetch('/api/auth/register-phone', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: cleaned, otp: code, name: phoneName }),
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    onLogin(data.user);
                    navigate('/');
                } else {
                    setError(data.error || 'Registration failed');
                }
            }
        } catch (err) {
            console.error('Phone Signup Verify Error:', err);
            if (err?.code === 'auth/invalid-verification-code') {
                setError('Invalid OTP. Please try again.');
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

    // ── Resend OTP ───────────────────────────────────────────
    const handleResend = async () => {
        setError('');
        setOtp(['', '', '', '', '', '']);
        setLoading(true);
        const cleaned = phone.replace(/\s/g, '');

        try {
            try { recaptchaRef.current?.clear?.(); } catch { /* ignore */ }
            recaptchaRef.current = setupRecaptcha('signup-recaptcha-container');
            const result = await loginWithPhoneOTP(cleaned, recaptchaRef.current);
            setConfirmationResult(result);
            startResendTimer();
        } catch {
            try {
                const res = await fetch('/api/auth/send-phone-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: cleaned, name: phoneName }),
                });
                const data = await res.json();
                if (data.success) {
                    setConfirmationResult(null);
                    startResendTimer();
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

    // ══════════════════════════════════════════════════════════
    //  RENDER
    // ══════════════════════════════════════════════════════════
    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                {/* Brand */}
                <div className="auth-brand">
                    <Shield size={36} style={{ color: '#3b82f6' }} />
                    <h1>JanNetra</h1>
                    <p>Governance Intelligence System</p>
                </div>

                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">Register to start monitoring governance risks</p>

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                {/* Tabs */}
                <div className="auth-tabs">
                    <button
                        type="button"
                        className={`auth-tab ${activeTab === 'email' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('email'); setError(''); setSuccess(''); setStep('form'); }}
                    >
                        <Mail size={15} />
                        Email Signup
                    </button>
                    <button
                        type="button"
                        className={`auth-tab ${activeTab === 'phone' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('phone'); setError(''); setSuccess(''); setStep('form'); }}
                    >
                        <Phone size={15} />
                        Phone Signup
                    </button>
                </div>

                {/* ═══ Email Signup Tab ═══ */}
                {activeTab === 'email' && (
                    <form onSubmit={handleEmailSignup} className="auth-form">
                        <div className="auth-field">
                            <User size={16} className="auth-field-icon" />
                            <input
                                id="signup-name"
                                type="text"
                                placeholder="Full name"
                                value={form.name}
                                onChange={(e) => update('name', e.target.value)}
                                required
                                autoComplete="name"
                            />
                        </div>
                        <div className="auth-field">
                            <Mail size={16} className="auth-field-icon" />
                            <input
                                id="signup-email"
                                type="email"
                                placeholder="Email address"
                                value={form.email}
                                onChange={(e) => update('email', e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="auth-field">
                            <Building2 size={16} className="auth-field-icon" />
                            <select
                                id="signup-department"
                                value={form.department}
                                onChange={(e) => update('department', e.target.value)}
                            >
                                <option value="">Select Department (optional)</option>
                                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="auth-field">
                            <Lock size={16} className="auth-field-icon" />
                            <input
                                id="signup-password"
                                type="password"
                                placeholder="Password (min 6 characters)"
                                value={form.password}
                                onChange={(e) => update('password', e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="auth-field">
                            <Lock size={16} className="auth-field-icon" />
                            <input
                                id="signup-confirm"
                                type="password"
                                placeholder="Confirm password"
                                value={form.confirm}
                                onChange={(e) => update('confirm', e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <button
                            id="signup-submit-btn"
                            type="submit"
                            className="btn btn-primary auth-submit"
                            disabled={loading}
                        >
                            {loading ? 'Creating Account…' : 'Create Account'}
                        </button>
                    </form>
                )}

                {/* ═══ Phone Signup Tab ═══ */}
                {activeTab === 'phone' && step === 'form' && (
                    <form onSubmit={handlePhoneSendOtp} className="auth-form">
                        <div className="auth-field">
                            <User size={16} className="auth-field-icon" />
                            <input
                                id="signup-phone-name"
                                type="text"
                                placeholder="Full name"
                                value={phoneName}
                                onChange={(e) => setPhoneName(e.target.value)}
                                required
                                autoComplete="name"
                            />
                        </div>
                        <div className="auth-field">
                            <Phone size={16} className="auth-field-icon" />
                            <input
                                id="signup-phone-input"
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
                            id="signup-send-otp-btn"
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
                                setStep('form');
                                setOtp(['', '', '', '', '', '']);
                                setError('');
                            }}
                            type="button"
                        >
                            <ArrowLeft size={14} />
                            Change number
                        </button>
                        <p className="auth-subtitle" style={{ marginBottom: '12px' }}>
                            Enter the 6-digit code sent to <strong>{phone}</strong>
                        </p>
                        <form onSubmit={handleVerifyPhoneOtp} className="auth-form">
                            <div className="otp-input-group" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        id={`signup-otp-${i}`}
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
                                id="signup-verify-otp-btn"
                                type="submit"
                                className="btn btn-primary auth-submit"
                                disabled={loading || otp.join('').length !== 6}
                            >
                                {loading ? (
                                    <span className="btn-loading">
                                        <span className="auth-google-spinner" />
                                        Verifying…
                                    </span>
                                ) : 'Verify & Create Account'}
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
                    Already have an account? <Link to="/login">Sign In</Link>
                </p>
            </div>

            {/* reCAPTCHA container */}
            <div id="signup-recaptcha-container" />
        </div>
    );
}
