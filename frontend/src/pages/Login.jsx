import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield, Mail, Lock, Phone, KeyRound, RefreshCw,
} from 'lucide-react';
import { supabase } from '../supabase';
import {
    loginWithEmail,
    loginWithPhoneOTP,
    verifyOTP,
    loginWithGoogle,
    verifySupabaseToken,
} from '../services/authService';
import api from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

const COUNTRY_CODES = [
    { code: '+91', label: '🇮🇳 +91' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+971', label: '🇦🇪 +971' },
    { code: '+61', label: '🇦🇺 +61' },
    { code: '+65', label: '🇸🇬 +65' },
    { code: '+49', label: '🇩🇪 +49' },
    { code: '+33', label: '🇫🇷 +33' },
    { code: '+81', label: '🇯🇵 +81' },
];

export default function Login({ onLogin }) {
    const { loginWithLocalUser } = useAuth();
    const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState('input'); // 'input' | 'otp'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [gLoading, setGLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const navigate = useNavigate();
    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    // AuthContext handles global session listening now.
    // If user successfully logs in via Supabase, AuthContext will update
    // and App.jsx will automatically redirect them out of the Login page.
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

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const cleanEmail = email.trim();

        // 1. Try Supabase Auth
        let supabaseFailed = false;
        try {
            const res = await loginWithEmail(cleanEmail, password);
            if (res?.user) {
                if (onLogin) onLogin(res.user);
                return;
            }
        } catch (err) {
            console.warn('[Supabase Login Notice]:', err?.message);
            supabaseFailed = true;
            const msg = (err?.message || '').toLowerCase();
            if (msg.includes('email not confirmed')) {
                setError('Email not confirmed. Please verify your email inbox, or sign in using a verified account.');
                setLoading(false);
                return;
            }
        }

        // 2. Fallback to Backend Database Login
        try {
            const data = await api.post('/auth/login', { email: cleanEmail, password });
            if (data && data.success && data.user) {
                loginWithLocalUser(data.user, data.token);
                if (onLogin) onLogin(data.user);
                navigate('/');
                return;
            } else {
                setError(data?.error || 'Invalid email or password');
            }
        } catch (backendErr) {
            console.error('[Backend Login Error]:', backendErr);
            setError(
                backendErr?.response?.data?.error || 
                backendErr?.response?.data?.detail || 
                'Invalid email or password'
            );
        } finally {
            setLoading(false);
        }
    };

    // Phone OTP Send
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        const cleaned = phone.replace(/\D/g, '');
        const finalPhone = `${countryCode}${cleaned}`;
        
        if (!/^\+[1-9]\d{7,14}$/.test(finalPhone)) {
            setError('Enter a valid phone number');
            return;
        }

        setLoading(true);
        try {
            // Try Supabase phone auth first
            await loginWithPhoneOTP(finalPhone);
            setStep('otp');
            startResendTimer();
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Send OTP Error:', err);

            // Fallback to backend OTP
            try {
                const data = await api.post('/auth/send-phone-otp', { phone_number: finalPhone });
                if (data.success) {
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
        const cleaned = phone.replace(/\D/g, '');
        const finalPhone = `${countryCode}${cleaned}`;
        try {
            // Try Supabase OTP verification
            try {
                const { idToken } = await verifyOTP(finalPhone, code);
                if (idToken) {
                    const response = await verifySupabaseToken(idToken);
                    const { user, token } = response;
                    loginWithLocalUser(user, token);
                    if (onLogin) onLogin(user);
                    navigate('/');
                    return;
                }
            } catch (err) {
                console.error("Supabase OTP failed, trying backend", err);
            }

            // Backend OTP verification fallback
            const data = await api.post('/auth/login-phone', { phone_number: finalPhone, otp: code });
            if (data.success) {
                loginWithLocalUser(data.user, data.token || '');
                if (onLogin) onLogin(data.user);
                navigate('/');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            console.error('Verify OTP Error:', err);
            setError(err?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        setError('');
        setOtp(['', '', '', '', '', '']);
        setLoading(true);

        const cleaned = phone.replace(/\D/g, '');
        const finalPhone = `${countryCode}${cleaned}`;
        try {
            await loginWithPhoneOTP(finalPhone);
            startResendTimer();
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch {
            // Fallback to backend
            try {
                const data = await api.post('/auth/send-phone-otp', { phone_number: finalPhone });
                if (data.success) {
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
            await loginWithGoogle();
            // Supabase handles the redirect automatically
        } catch (err) {
            console.error('[Google Auth] Error:', err?.message);
            setError(`Google sign-in failed: ${err?.message || 'Unknown error'}`);
            setGLoading(false);
        }
    };

    // Render
    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                {/* Brand */}
                <div className="auth-brand">
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
                                placeholder="Enter Email"
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
                                placeholder="Enter Password"
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
                        <div className="auth-phone-row">
                            <div className="auth-field country-select-field">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="country-select"
                                >
                                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="auth-field phone-input-field">
                                <Phone size={16} className="auth-field-icon" />
                                <input
                                    id="phone-login-input"
                                    type="tel"
                                    placeholder="Enter Phone Number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    required
                                    autoComplete="tel"
                                />
                            </div>
                        </div>
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
                            Enter the 6-digit code sent to <strong>{countryCode} {phone}</strong>
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
        </div>
    );
}
