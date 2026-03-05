import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield, Phone, KeyRound, ArrowLeft, RefreshCw, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

// ── Firebase Test Phone Numbers (development only) ──────────
// Add these in Firebase Console → Authentication → Sign-in method
// → Phone → Phone numbers for testing
const TEST_PHONES = {
    '+911234567890': '123456',
};

export default function PhoneAuth({ onLogin }) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState('phone');        // 'phone' | 'otp' | 'success'
    const [authMode, setAuthMode] = useState(null);   // 'firebase' | 'backend'
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [confirmationResult, setConfirmationResult] = useState(null);

    const navigate = useNavigate();
    const recaptchaRef = useRef(null);
    const otpRefs = useRef([]);
    const timerRef = useRef(null);
    const recaptchaContainerRef = useRef(null);

    // ── Initialize reCAPTCHA ─────────────────────────────────
    const initRecaptcha = useCallback(() => {
        try {
            // Clear any existing verifier
            if (recaptchaRef.current) {
                try { recaptchaRef.current.clear(); } catch { /* ignore */ }
                recaptchaRef.current = null;
            }

            recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => {
                    // reCAPTCHA solved — allow signInWithPhoneNumber
                },
                'expired-callback': () => {
                    setError('reCAPTCHA expired. Please try again.');
                    recaptchaRef.current = null;
                },
            });

            return recaptchaRef.current;
        } catch (err) {
            console.error('reCAPTCHA init error:', err);
            return null;
        }
    }, []);

    // ── Cleanup on unmount ───────────────────────────────────
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            try {
                if (recaptchaRef.current) {
                    recaptchaRef.current.clear();
                    recaptchaRef.current = null;
                }
            } catch { /* ignore */ }
        };
    }, []);

    // ── Countdown timer ──────────────────────────────────────
    const startResendTimer = () => {
        setResendTimer(60);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // ── Format & validate phone number ───────────────────────
    const validatePhone = (phoneNumber) => {
        const cleaned = phoneNumber.replace(/\s/g, '');
        if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
            return { valid: false, cleaned: '' };
        }
        return { valid: true, cleaned };
    };

    // ── Get user-friendly error message ──────────────────────
    const getErrorMessage = (err) => {
        const code = err?.code || '';
        switch (code) {
            case 'auth/invalid-phone-number':
                return 'Invalid phone number. Please use international format (e.g., +919876543210).';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please wait a few minutes before trying again.';
            case 'auth/captcha-check-failed':
                return 'reCAPTCHA verification failed. Please refresh the page and try again.';
            case 'auth/invalid-verification-code':
                return 'Invalid OTP. Please check the code and try again.';
            case 'auth/code-expired':
                return 'OTP has expired. Please request a new one.';
            case 'auth/billing-not-enabled':
            case 'auth/operation-not-allowed':
                return 'Phone authentication is not enabled. Trying alternative method...';
            case 'auth/quota-exceeded':
                return 'SMS quota exceeded. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your internet connection.';
            default:
                return err?.message || 'An unexpected error occurred. Please try again.';
        }
    };

    // ── Send OTP (Firebase-first with backend fallback) ──────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');

        const { valid, cleaned } = validatePhone(phone);
        if (!valid) {
            setError('Enter a valid phone number in E.164 format (e.g., +919876543210)');
            return;
        }

        setLoading(true);

        // Try Firebase Phone Auth first
        try {
            const appVerifier = initRecaptcha();
            if (!appVerifier) {
                throw new Error('reCAPTCHA initialization failed');
            }

            const result = await signInWithPhoneNumber(auth, cleaned, appVerifier);
            setConfirmationResult(result);
            setAuthMode('firebase');
            setStep('otp');
            startResendTimer();
            setInfo('OTP sent successfully via SMS.');
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Firebase OTP Error:', err);

            // If Firebase phone auth is blocked (billing, not enabled, etc.)
            // fallback to backend-managed OTP
            if (
                err?.code === 'auth/billing-not-enabled' ||
                err?.code === 'auth/operation-not-allowed' ||
                err?.code === 'auth/internal-error' ||
                err?.message?.includes('reCAPTCHA')
            ) {
                try {
                    const res = await fetch('/api/auth/send-phone-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone_number: cleaned }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setConfirmationResult(null);
                        setAuthMode('backend');
                        setStep('otp');
                        startResendTimer();
                        setInfo('OTP sent! Check your phone or backend console.');
                        // Show demo OTP in dev
                        if (data.demo_otp) {
                            setInfo(`OTP sent! Dev OTP: ${data.demo_otp}`);
                        }
                        setTimeout(() => otpRefs.current[0]?.focus(), 100);
                        return;
                    } else {
                        setError(data.error || 'Failed to send OTP.');
                        return;
                    }
                } catch (backendErr) {
                    console.error('Backend OTP fallback error:', backendErr);
                    setError('Server unavailable. Please start the backend server and try again.');
                    return;
                }
            }

            setError(getErrorMessage(err));

            // Reset reCAPTCHA on failure
            try {
                if (recaptchaRef.current) {
                    recaptchaRef.current.clear();
                    recaptchaRef.current = null;
                }
            } catch { /* ignore */ }
        } finally {
            setLoading(false);
        }
    };

    // ── OTP input handler (auto-advance) ─────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto-advance to next field
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
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

    // ── Verify OTP ───────────────────────────────────────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');

        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }

        setLoading(true);
        const cleaned = phone.replace(/\s/g, '');

        try {
            if (authMode === 'firebase' && confirmationResult) {
                // ── Firebase OTP verification ────────────────
                const result = await confirmationResult.confirm(code);
                const user = result.user;

                // Get Firebase ID token
                const idToken = await user.getIdToken();

                // Send to backend for user upsert
                const response = await axios.post(
                    '/api/auth/firebase-login',
                    {},
                    { headers: { Authorization: `Bearer ${idToken}` } }
                );

                const { user: userData } = response.data;
                localStorage.setItem('user', JSON.stringify(userData));
                setStep('success');
                setTimeout(() => {
                    onLogin(userData);
                    navigate('/');
                }, 1500);
            } else {
                // ── Backend OTP verification ─────────────────
                const res = await fetch('/api/auth/login-phone', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: cleaned, otp: code }),
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setStep('success');
                    setTimeout(() => {
                        onLogin(data.user);
                        navigate('/');
                    }, 1500);
                } else {
                    // If user not found, try register instead
                    if (data.error?.includes('No account found')) {
                        const regRes = await fetch('/api/auth/register-phone', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone_number: cleaned, otp: code }),
                        });
                        const regData = await regRes.json();
                        if (regData.success) {
                            localStorage.setItem('user', JSON.stringify(regData.user));
                            setStep('success');
                            setTimeout(() => {
                                onLogin(regData.user);
                                navigate('/');
                            }, 1500);
                        } else {
                            setError(regData.error || 'Registration failed.');
                        }
                    } else {
                        setError(data.error || 'Verification failed.');
                    }
                }
            }
        } catch (err) {
            console.error('Verify OTP Error:', err);
            if (err?.code) {
                setError(getErrorMessage(err));
            } else if (err?.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError(err?.message || 'Verification failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ───────────────────────────────────────────
    const handleResend = async () => {
        setError('');
        setInfo('');
        setOtp(['', '', '', '', '', '']);
        setLoading(true);

        const cleaned = phone.replace(/\s/g, '');

        try {
            if (authMode === 'firebase') {
                // Reset reCAPTCHA and resend via Firebase
                const appVerifier = initRecaptcha();
                if (!appVerifier) throw new Error('reCAPTCHA failed');

                const result = await signInWithPhoneNumber(auth, cleaned, appVerifier);
                setConfirmationResult(result);
                startResendTimer();
                setInfo('OTP resent successfully.');
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            } else {
                // Resend via backend
                const res = await fetch('/api/auth/send-phone-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: cleaned }),
                });
                const data = await res.json();
                if (data.success) {
                    startResendTimer();
                    setInfo(data.demo_otp
                        ? `OTP resent! Dev OTP: ${data.demo_otp}`
                        : 'OTP resent successfully.'
                    );
                    setTimeout(() => otpRefs.current[0]?.focus(), 100);
                } else {
                    setError(data.error || 'Failed to resend OTP.');
                }
            }
        } catch (err) {
            console.error('Resend OTP Error:', err);
            // If Firebase resend fails, try backend
            if (authMode === 'firebase') {
                try {
                    const res = await fetch('/api/auth/send-phone-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone_number: cleaned }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setAuthMode('backend');
                        setConfirmationResult(null);
                        startResendTimer();
                        setInfo(data.demo_otp
                            ? `OTP resent via backend! Dev OTP: ${data.demo_otp}`
                            : 'OTP resent via alternative method.'
                        );
                        setTimeout(() => otpRefs.current[0]?.focus(), 100);
                        return;
                    }
                } catch { /* ignore */ }
            }
            setError(err?.message || 'Failed to resend OTP.');
        } finally {
            setLoading(false);
        }
    };

    // ── UI ───────────────────────────────────────────────────
    return (
        <div className="auth-page">
            <div className="auth-card phone-auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <Shield size={36} style={{ color: '#3b82f6' }} />
                    <h1>JanNetra</h1>
                    <p>Governance Intelligence System</p>
                </div>

                {/* ─── Step: Phone Number Input ─── */}
                {step === 'phone' && (
                    <>
                        <h2 className="auth-title">Phone Sign In</h2>
                        <p className="auth-subtitle">
                            Enter your phone number to receive a verification code via SMS
                        </p>

                        {error && (
                            <div className="auth-error">
                                <AlertTriangle size={14} style={{ marginRight: 6, flexShrink: 0 }} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSendOtp} className="auth-form">
                            <div className="auth-field">
                                <Phone size={16} className="auth-field-icon" />
                                <input
                                    id="phone-input"
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    autoComplete="tel"
                                    autoFocus
                                />
                            </div>
                            <p className="phone-hint">
                                Include country code (e.g. +91 for India, +1 for US)
                            </p>

                            {/* Test number hint for development */}
                            <div className="phone-test-hint">
                                <KeyRound size={12} />
                                <span>
                                    Dev test: <strong>+911234567890</strong> / OTP: <strong>123456</strong>
                                </span>
                            </div>

                            <button
                                id="send-otp-btn"
                                type="submit"
                                className="btn btn-primary auth-submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="btn-loading">
                                        <span className="auth-google-spinner" />
                                        Sending OTP…
                                    </span>
                                ) : (
                                    <>
                                        <Phone size={16} />
                                        Send OTP
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}

                {/* ─── Step: OTP Verification ─── */}
                {step === 'otp' && (
                    <>
                        <button
                            className="otp-back-btn"
                            onClick={() => {
                                setStep('phone');
                                setOtp(['', '', '', '', '', '']);
                                setError('');
                                setInfo('');
                                setAuthMode(null);
                                setConfirmationResult(null);
                            }}
                            type="button"
                        >
                            <ArrowLeft size={16} />
                            Change number
                        </button>

                        <h2 className="auth-title">Verify OTP</h2>
                        <p className="auth-subtitle">
                            Enter the 6-digit code sent to{' '}
                            <strong>{phone}</strong>
                        </p>

                        {authMode === 'backend' && (
                            <div className="auth-info-badge">
                                Using backend OTP verification
                            </div>
                        )}

                        {error && (
                            <div className="auth-error">
                                <AlertTriangle size={14} style={{ marginRight: 6, flexShrink: 0 }} />
                                {error}
                            </div>
                        )}

                        {info && (
                            <div className="auth-success">
                                <CheckCircle size={14} style={{ marginRight: 6, flexShrink: 0 }} />
                                {info}
                            </div>
                        )}

                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="otp-input-group" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        id={`otp-input-${i}`}
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
                                id="verify-otp-btn"
                                type="submit"
                                className="btn btn-primary auth-submit"
                                disabled={loading || otp.join('').length !== 6}
                            >
                                {loading ? (
                                    <span className="btn-loading">
                                        <span className="auth-google-spinner" />
                                        Verifying…
                                    </span>
                                ) : (
                                    <>
                                        <KeyRound size={16} />
                                        Verify & Sign In
                                    </>
                                )}
                            </button>

                            {/* Resend timer */}
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

                {/* ─── Step: Success ─── */}
                {step === 'success' && (
                    <div className="phone-auth-success">
                        <div className="phone-auth-success-icon">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="auth-title">Authenticated!</h2>
                        <p className="auth-subtitle">
                            Redirecting to dashboard…
                        </p>
                        <div className="phone-auth-success-spinner" />
                    </div>
                )}

                {step !== 'success' && (
                    <>
                        <div className="auth-divider">
                            <span>or</span>
                        </div>

                        <p className="auth-footer">
                            Sign in with email instead?{' '}
                            <Link to="/login">Login</Link>
                        </p>
                        <p className="auth-footer" style={{ marginTop: '8px' }}>
                            Don't have an account?{' '}
                            <Link to="/signup">Create Account</Link>
                        </p>
                    </>
                )}
            </div>

            {/* reCAPTCHA container — invisible, must be in DOM */}
            <div id="recaptcha-container" ref={recaptchaContainerRef} />
        </div>
    );
}
