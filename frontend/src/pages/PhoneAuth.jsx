import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Phone, KeyRound, ArrowLeft, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { loginWithPhoneOTP, verifyOTP, verifySupabaseToken } from '../services/authService';
import api from '../services/apiClient';

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

export default function PhoneAuth({ onLogin }) {
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'success'
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const navigate = useNavigate();
    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Countdown timer
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

    // Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');

        const cleaned = phone.replace(/\D/g, '');
        const finalPhone = `${countryCode}${cleaned}`;

        if (!/^\+[1-9]\d{7,14}$/.test(finalPhone)) {
            setError('Enter a valid phone number');
            return;
        }

        setLoading(true);

        try {
            await loginWithPhoneOTP(finalPhone);
            setStep('otp');
            startResendTimer();
            setInfo('OTP sent successfully via SMS.');
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Supabase OTP Error:', err);
            
            // Fallback to backend
            try {
                const data = await api.post('/auth/send-phone-otp', { phone_number: finalPhone });
                if (data.success) {
                    setStep('otp');
                    startResendTimer();
                    setInfo(data.demo_otp ? `OTP sent! Dev OTP: ${data.demo_otp}` : 'OTP sent via backend.');
                    setTimeout(() => otpRefs.current[0]?.focus(), 100);
                    return;
                } else {
                    setError(data.error || 'Failed to send OTP.');
                }
            } catch (backendErr) {
                console.error('Backend OTP fallback error:', backendErr);
                setError('Service unavailable. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // OTP input handler
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

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

    // Verify OTP
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
        const cleaned = phone.replace(/\D/g, '');
        const finalPhone = `${countryCode}${cleaned}`;

        try {
            try {
                const { idToken } = await verifyOTP(finalPhone, code);
                if (idToken) {
                    const response = await verifySupabaseToken(idToken);
                    const { user, token } = response;
                    localStorage.setItem('user', JSON.stringify(user));
                    localStorage.setItem('token', token);
                    setStep('success');
                    setTimeout(() => {
                        onLogin(user);
                        navigate('/');
                    }, 1500);
                    return;
                }
            } catch (err) {
                console.error("Supabase verify failed, trying backend fallback", err);
            }

            // Backend fallback
            const data = await api.post('/auth/login-phone', { phone_number: finalPhone, otp: code });
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token || '');
                setStep('success');
                setTimeout(() => {
                    onLogin(data.user);
                    navigate('/');
                }, 1500);
            } else {
                if (data.error?.includes('No account found')) {
                    const regData = await api.post('/auth/register-phone', { phone_number: finalPhone, otp: code });
                    if (regData.success) {
                        localStorage.setItem('user', JSON.stringify(regData.user));
                        localStorage.setItem('token', regData.token || '');
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
        } catch (err) {
            console.error('Verify OTP Error:', err);
            setError(err?.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        setError('');
        setInfo('');
        setOtp(['', '', '', '', '', '']);
        const cleaned = phone.replace(/\D/g, '');
        const finalPhone = `${countryCode}${cleaned}`;

        setLoading(true);

        try {
            await loginWithPhoneOTP(finalPhone);
            startResendTimer();
            setInfo('OTP resent successfully.');
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            console.error('Resend OTP Error:', err);
            try {
                const data = await api.post('/auth/send-phone-otp', { phone_number: finalPhone });
                if (data.success) {
                    startResendTimer();
                    setInfo(data.demo_otp ? `OTP resent via backend! Dev OTP: ${data.demo_otp}` : 'OTP resent.');
                    setTimeout(() => otpRefs.current[0]?.focus(), 100);
                } else {
                    setError(data.error || 'Failed to resend OTP.');
                }
            } catch {
                setError('Failed to resend OTP.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card phone-auth-card">
                <div className="auth-brand">
                    <h1>JanNetra</h1>
                    <p>Governance Intelligence System</p>
                </div>

                {step === 'phone' && (
                    <>
                        <h2 className="auth-title">Phone Sign In</h2>
                        <p className="auth-subtitle">Enter your phone number to receive a verification code</p>
                        {error && <div className="auth-error"><AlertTriangle size={14} style={{ marginRight: 6 }} />{error}</div>}
                        <form onSubmit={handleSendOtp} className="auth-form">
                            <div className="auth-phone-row">
                                <div className="auth-field country-select-field">
                                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="country-select">
                                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="auth-field phone-input-field">
                                    <Phone size={16} className="auth-field-icon" />
                                    <input type="tel" placeholder="Enter Phone Number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} required autoFocus />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                                {loading ? <span className="btn-loading"><span className="auth-google-spinner" />Sending OTP…</span> : <><Phone size={16} />Send OTP</>}
                            </button>
                        </form>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <button className="otp-back-btn" onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); setInfo(''); }} type="button">
                            <ArrowLeft size={16} />Change number
                        </button>
                        <h2 className="auth-title">Verify OTP</h2>
                        <p className="auth-subtitle">Enter the 6-digit code sent to <strong>{countryCode} {phone}</strong></p>
                        {error && <div className="auth-error"><AlertTriangle size={14} style={{ marginRight: 6 }} />{error}</div>}
                        {info && <div className="auth-success"><CheckCircle size={14} style={{ marginRight: 6 }} />{info}</div>}
                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="otp-input-group" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input key={i} ref={(el) => (otpRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} className="otp-digit" />
                                ))}
                            </div>
                            <button type="submit" className="btn btn-primary auth-submit" disabled={loading || otp.join('').length !== 6}>
                                {loading ? <span className="btn-loading"><span className="auth-google-spinner" />Verifying…</span> : <><KeyRound size={16} />Verify & Sign In</>}
                            </button>
                            <div className="otp-resend">
                                {resendTimer > 0 ? <span className="otp-resend-timer">Resend OTP in <strong>{resendTimer}s</strong></span> : <button type="button" className="otp-resend-btn" onClick={handleResend} disabled={loading}><RefreshCw size={14} />Resend OTP</button>}
                            </div>
                        </form>
                    </>
                )}

                {step === 'success' && (
                    <div className="phone-auth-success">
                        <div className="phone-auth-success-icon"><CheckCircle size={40} /></div>
                        <h2 className="auth-title">Authenticated!</h2>
                        <p className="auth-subtitle">Redirecting to dashboard…</p>
                        <div className="phone-auth-success-spinner" />
                    </div>
                )}

                {step !== 'success' && (
                    <>
                        <div className="auth-divider"><span>or</span></div>
                        <p className="auth-footer">Sign in with email instead? <Link to="/login">Login</Link></p>
                        <p className="auth-footer" style={{ marginTop: '8px' }}>Don't have an account? <Link to="/signup">Create Account</Link></p>
                    </>
                )}
            </div>
        </div>
    );
}
