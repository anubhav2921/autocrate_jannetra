import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield, Mail, Lock, User, Phone, Building2, ArrowLeft, RefreshCw,
} from 'lucide-react';

const DEPARTMENTS = [
    'health', 'police', 'municipal', 'electricity', 'water', 'education', 'transport'
];

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

export default function Signup({ onLogin }) {
    const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'
    const [step, setStep] = useState('form'); // 'form' | 'otp'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        countryCode: '+91',
        password: '',
        confirm: '',
        department: '',
    });

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    
    const navigate = useNavigate();
    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    const update = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

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

    //  STEP 1: SEND OTP
    const handleSendSignupOtp = async (e) => {
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

        const endpoint = activeTab === 'email' ? '/api/auth/signup' : '/api/auth/send-phone-otp';
        const cleanedPhone = form.phone.replace(/\D/g, ''); // just numbers
        const finalPhone = activeTab === 'phone' ? `${form.countryCode}${cleanedPhone}` : '';

        const payload = activeTab === 'email'
            ? { 
                name: form.name, 
                email: form.email, 
                password: form.password, 
                department: form.department,
                role: 'LEADER' 
            }
            : { 
                phone_number: finalPhone, 
                name: form.name, 
                password: form.password, 
                department: form.department 
            };

        if (activeTab === 'phone') {
            if (!/^\+[1-9]\d{7,14}$/.test(payload.phone_number)) {
                setError('Enter valid phone number (e.g. +919876543210)');
                return;
            }
        }

        setLoading(true);
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setStep('otp');
                startResendTimer();
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
                setSuccess(data.message || 'OTP sent! Check your ' + activeTab);
            } else {
                setError(data.error || 'Failed to send OTP.');
            }
        } catch (err) {
            setError('Server connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    //  STEP 2: VERIFY OTP
    const handleVerifySignupOtp = async (e) => {
        e.preventDefault();
        setError('');
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }

        setLoading(true);
        const endpoint = activeTab === 'email' ? '/api/auth/verify-otp' : '/api/auth/register-phone';
        const cleanedPhone = form.phone.replace(/\D/g, ''); // just numbers
        const finalPhone = activeTab === 'phone' ? `${form.countryCode}${cleanedPhone}` : '';

        const payload = activeTab === 'email'
            ? { email: form.email, otp: code }
            : { 
                phone_number: finalPhone, 
                otp: code, 
                name: form.name, 
                password: form.password, 
                department: form.department 
            };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                navigate('/');
            } else {
                setError(data.error || 'Verification failed.');
            }
        } catch (err) {
            setError('Server connection error.');
        } finally {
            setLoading(false);
        }
    };

    // OTP Handlers
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                <div className="auth-brand">
                    <h1>JanNetra</h1>
                    <p>Governance Intelligence System</p>
                </div>

                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">Register to start monitoring governance risks</p>

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <div className="auth-tabs">
                    <button
                        type="button"
                        className={`auth-tab ${activeTab === 'email' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('email'); setError(''); setSuccess(''); setStep('form'); }}
                    >
                        <Mail size={15} /> Email Signup
                    </button>
                    <button
                        type="button"
                        className={`auth-tab ${activeTab === 'phone' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('phone'); setError(''); setSuccess(''); setStep('form'); }}
                    >
                        <Phone size={15} /> Phone Signup
                    </button>
                </div>

                {step === 'otp' ? (
                    <>
                        <button
                            className="otp-back-btn"
                            onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); setError(''); }}
                            type="button"
                        >
                            <ArrowLeft size={14} /> Change Info
                        </button>
                        <p className="auth-subtitle" style={{ marginBottom: '12px' }}>
                            Enter calculation code sent to <strong>{activeTab === 'email' ? form.email : `${form.countryCode} ${form.phone}`}</strong>
                        </p>
                        <form onSubmit={handleVerifySignupOtp} className="auth-form">
                            <div className="otp-input-group" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
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
                                type="submit"
                                className="btn btn-primary auth-submit"
                                disabled={loading || otp.join('').length !== 6}
                            >
                                {loading ? 'Verifying…' : 'Verify & Create Account'}
                            </button>
                            <div className="otp-resend">
                                {resendTimer > 0 ? (
                                    <span className="otp-resend-timer">Resend OTP in <strong>{resendTimer}s</strong></span>
                                ) : (
                                    <button
                                        type="button"
                                        className="otp-resend-btn"
                                        onClick={handleSendSignupOtp}
                                        disabled={loading}
                                    >
                                        <RefreshCw size={14} /> Resend OTP
                                    </button>
                                )}
                            </div>
                        </form>
                    </>
                ) : (
                    <form onSubmit={handleSendSignupOtp} className="auth-form">
                        <div className="auth-field">
                            <User size={16} className="auth-field-icon" />
                            <input
                                type="text"
                                placeholder="Enter Full Name"
                                value={form.name}
                                onChange={(e) => update('name', e.target.value)}
                                required
                            />
                        </div>

                        {activeTab === 'email' ? (
                            <div className="auth-field">
                                <Mail size={16} className="auth-field-icon" />
                                <input
                                    type="email"
                                    placeholder="Enter Email"
                                    value={form.email}
                                    onChange={(e) => update('email', e.target.value)}
                                    required
                                />
                            </div>
                        ) : (
                            <div className="auth-phone-row">
                                <div className="auth-field country-select-field">
                                    <select
                                        value={form.countryCode}
                                        onChange={(e) => update('countryCode', e.target.value)}
                                        className="country-select"
                                    >
                                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="auth-field phone-input-field">
                                    <Phone size={16} className="auth-field-icon" />
                                    <input
                                        type="tel"
                                        placeholder="Enter Phone Number"
                                        value={form.phone}
                                        onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                </div>
                            </div>
                        )}

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
                                type="password"
                                placeholder="Enter Password"
                                value={form.password}
                                onChange={(e) => update('password', e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <Lock size={16} className="auth-field-icon" />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={form.confirm}
                                onChange={(e) => update('confirm', e.target.value)}
                                required
                            />
                        </div>


                        <button
                            id="signup-submit-btn"
                            type="submit"
                            className="btn btn-primary auth-submit"
                            disabled={loading}
                        >
                            {loading ? 'Sending OTP…' : 'Send OTP'}
                        </button>
                    </form>
                )}

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
