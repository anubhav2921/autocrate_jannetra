import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Phone, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

export default function PhoneAuth({ onLogin }) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState('phone');   // 'phone' | 'otp'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [confirmationResult, setConfirmationResult] = useState(null);

    const navigate = useNavigate();
    const recaptchaRef = useRef(null);
    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    // ── reCAPTCHA setup ──────────────────────────────────────
    useEffect(() => {
        if (!recaptchaRef.current) {
            recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => { },
                'expired-callback': () => {
                    setError('reCAPTCHA expired. Please try again.');
                },
            });
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
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

    // ── Send OTP ─────────────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        // Validate E.164 format
        const cleaned = phone.replace(/\s/g, '');
        if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
            setError('Enter a valid phone number in E.164 format (e.g. +919876543210)');
            return;
        }

        setLoading(true);
        try {
            const result = await signInWithPhoneNumber(auth, cleaned, recaptchaRef.current);
            setConfirmationResult(result);
            setStep('otp');
            startResendTimer();
            // Focus first OTP input
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Send OTP Error:', err);
            if (err?.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please wait a few minutes before trying again.');
            } else if (err?.code === 'auth/invalid-phone-number') {
                setError('Invalid phone number. Please use E.164 format (e.g. +919876543210).');
            } else if (err?.code === 'auth/captcha-check-failed') {
                setError('reCAPTCHA verification failed. Please refresh and try again.');
            } else {
                setError(err?.message || 'Failed to send OTP. Please try again.');
            }
            // Reset reCAPTCHA on failure
            try {
                recaptchaRef.current?.clear();
                recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible',
                    callback: () => { },
                });
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
        // Backspace: go to previous field
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

        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            // 1. Confirm OTP with Firebase
            const result = await confirmationResult.confirm(code);

            // 2. Get Firebase ID token
            const idToken = await result.user.getIdToken();

            // 3. Send to backend for verification + user upsert
            const response = await axios.post(
                '/api/auth/firebase-login',
                {},
                { headers: { Authorization: `Bearer ${idToken}` } }
            );

            const { user } = response.data;

            // 4. Store user and redirect
            localStorage.setItem('user', JSON.stringify(user));
            onLogin(user);
            navigate('/');
        } catch (err) {
            console.error('Verify OTP Error:', err);
            if (err?.code === 'auth/invalid-verification-code') {
                setError('Invalid OTP. Please check and try again.');
            } else if (err?.code === 'auth/code-expired') {
                setError('OTP has expired. Please request a new one.');
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
        setOtp(['', '', '', '', '', '']);
        setLoading(true);

        try {
            // Reset reCAPTCHA
            try {
                recaptchaRef.current?.clear();
            } catch { /* ignore */ }
            recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => { },
            });

            const cleaned = phone.replace(/\s/g, '');
            const result = await signInWithPhoneNumber(auth, cleaned, recaptchaRef.current);
            setConfirmationResult(result);
            startResendTimer();
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Resend OTP Error:', err);
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

                {step === 'phone' ? (
                    <>
                        <h2 className="auth-title">Phone Sign In</h2>
                        <p className="auth-subtitle">
                            Enter your phone number to receive a verification code via SMS
                        </p>

                        {error && <div className="auth-error">{error}</div>}

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
                                />
                            </div>
                            <p className="phone-hint">
                                Include country code (e.g. +91 for India, +1 for US)
                            </p>
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
                                    'Send OTP'
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <button
                            className="otp-back-btn"
                            onClick={() => {
                                setStep('phone');
                                setOtp(['', '', '', '', '', '']);
                                setError('');
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

                        {error && <div className="auth-error">{error}</div>}

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
                                    'Verify & Sign In'
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
            </div>

            {/* reCAPTCHA container — invisible, must be in DOM */}
            <div id="recaptcha-container" />
        </div>
    );
}
