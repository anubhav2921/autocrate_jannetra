import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, FileText, BarChart3, Lock, Scale, Info, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import '../assets/styles/landing.css';

const Legal = () => {
    const { theme, toggleTheme } = useTheme();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const section = pathname.split('/').pop(); // 'privacy', 'terms', 'transparency'

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const renderContent = () => {
        switch (section) {
            case 'privacy':
                return (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <h1 style={{ color: 'var(--text-primary)' }}><Lock className="legal-icon" /> Privacy Policy</h1>
                        <p className="last-updated" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Last Updated: March 20, 2026</p>
                        <section>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>1. Data Collection</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>JanNetra collects location data and civic reports to facilitate city-wide monitoring. We do not sell your personal identification data to third parties.</p>
                        </section>
                        <section>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>2. AI Processing</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your reports are processed by AI to categorize and verify civic issues. Image data is used solely for verification purposes.</p>
                        </section>
                        <section>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>3. User Rights</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>You have the right to request the deletion of your reports and account data at any time via the Account Settings.</p>
                        </section>
                    </motion.div>
                );
            case 'terms':
                return (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <h1 style={{ color: 'var(--text-primary)' }}><FileText className="legal-icon" /> Terms of Service</h1>
                        <p className="last-updated" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Last Updated: March 20, 2026</p>
                        <section>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>1. Acceptable Use</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Users must provide accurate civic reports. False reporting or spamming the AI system may lead to account suspension.</p>
                        </section>
                        <section>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>2. Community Verification</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>By participating in community verification, you agree to act in good faith and provide honest ground-level feedback.</p>
                        </section>
                    </motion.div>
                );
            case 'transparency':
                return (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <h1 style={{ color: 'var(--text-primary)' }}><BarChart3 className="legal-icon" /> Transparency Report</h1>
                        <p className="last-updated" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Real-time System Stats</p>
                        <div className="transparency-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                            <div className="t-card glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>AI Confidence</h4>
                                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--landing-accent)', marginBottom: '8px' }}>92.4%</span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average model precision across all categories.</p>
                            </div>
                            <div className="t-card glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>Data Handling</h4>
                                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-teal)', marginBottom: '8px' }}>End-to-End</span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Encrypted transmission of all civic signals.</p>
                            </div>
                            <div className="t-card glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>Resolutions</h4>
                                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--risk-low)', marginBottom: '8px' }}>1,240+</span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified issues pushed to municipal departments.</p>
                            </div>
                        </div>
                        <section>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>Our Commitment</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>JanNetra is committed to open data and civic accountability. Every signal processed is archived for public audit (excluding private user data).</p>
                        </section>
                    </motion.div>
                );
            default:
                return <div style={{ color: 'var(--text-primary)' }}>Please select a section.</div>;
        }
    };

    return (
        <div className="landing-root" style={{ background: 'var(--landing-bg-start)', minHeight: '100vh', color: 'var(--text-primary)', transition: 'background var(--transition-base)' }}>
            <nav className="landing-nav nav-scrolled" style={{ background: 'var(--navbar-bg)', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                <div className="nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 40px' }}>
                    <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <span className="logo-brand" style={{ color: 'var(--landing-text-main)', fontWeight: 700 }}>Jan<span className="highlight" style={{ color: 'var(--landing-accent)' }}>Netra</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="cta-btn cta-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-glass)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => navigate('/')}>
                            <ArrowLeft size={18} /> Back to Home
                        </button>
                    </div>
                </div>
            </nav>

            <div className="legal-container" style={{ maxWidth: '1200px', margin: '140px auto 100px', display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px', padding: '0 40px' }}>
                <div className="legal-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className={`legal-nav-item ${section === 'privacy' ? 'active' : ''}`} style={{ padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: section === 'privacy' ? 'var(--accent-blue-bg)' : 'transparent', color: section === 'privacy' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: section === 'privacy' ? 600 : 500 }} onClick={() => navigate('/legal/privacy')}>
                        <Lock size={18} /> Privacy Policy
                    </div>
                    <div className={`legal-nav-item ${section === 'terms' ? 'active' : ''}`} style={{ padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: section === 'terms' ? 'var(--accent-blue-bg)' : 'transparent', color: section === 'terms' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: section === 'terms' ? 600 : 500 }} onClick={() => navigate('/legal/terms')}>
                        <Scale size={18} /> Terms of Service
                    </div>
                    <div className={`legal-nav-item ${section === 'transparency' ? 'active' : ''}`} style={{ padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: section === 'transparency' ? 'var(--accent-blue-bg)' : 'transparent', color: section === 'transparency' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: section === 'transparency' ? 600 : 500 }} onClick={() => navigate('/legal/transparency')}>
                        <Info size={18} /> Transparency
                    </div>
                </div>
                <div className="legal-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Legal;
