import { useState, useEffect } from 'react';
import {
    User, Mail, Building2, Lock, Trash2, Camera, Award, CheckCircle2,
    Clock, Shield, Save, Moon, Sun, Monitor, Palette
} from 'lucide-react';
import api from '../services/api';

export default function Account({ user, onLogin, onLogout }) {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [msg, setMsg] = useState({ text: '', type: '' });
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'default');

    // Edit states
    const [editName, setEditName] = useState('');
    const [editDept, setEditDept] = useState('');
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [deletePwd, setDeletePwd] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        api.get(`/account/profile/${user.id}`)
            .then((data) => {
                if (data.success) {
                    setProfile(data.profile);
                    setStats(data.stats);
                    setEditName(data.profile.name);
                    setEditDept(data.profile.department || '');
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    const showMsg = (text, type = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    };

    const handleUpdateProfile = async () => {
        try {
            const data = await api.post('/account/update-profile', {
                user_id: user.id, name: editName, department: editDept
            });
            if (data.success) {
                showMsg('Profile updated!');
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                onLogin(data.user);
            } else showMsg(data.error, 'error');
        } catch (err) {
            showMsg('Update failed', 'error');
        }
    };

    const handleChangePassword = async () => {
        if (newPwd !== confirmPwd) { showMsg('Passwords do not match', 'error'); return; }
        try {
            const data = await api.post('/account/update-password', {
                user_id: user.id, current_password: currentPwd, new_password: newPwd
            });
            if (data.success) {
                showMsg('Password changed!');
                setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
            } else showMsg(data.error, 'error');
        } catch (err) {
            showMsg('Password change failed', 'error');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const data = await api.post('/account/delete', {
                user_id: user.id, password: deletePwd
            });
            if (data.success) onLogout();
            else showMsg(data.error, 'error');
        } catch (err) {
            showMsg('Delete failed', 'error');
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setProfile({ ...profile, profile_picture: ev.target.result });
        };
        reader.readAsDataURL(file);
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('app-theme', newTheme);
        if (newTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    };

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'password', label: 'Password', icon: Lock },
        { id: 'danger', label: 'Delete Account', icon: Trash2 },
    ];

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Account Settings</h1>
                <p>Manage your profile, security, and account preferences</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="glass-card stat-card green animate-in">
                    <div className="stat-icon"><Award size={22} /></div>
                    <div className="stat-value" style={{ color: '#10b981' }}>{stats.total_resolutions || 0}</div>
                    <div className="stat-label">Total Resolutions</div>
                </div>
                <div className="glass-card stat-card blue animate-in">
                    <div className="stat-icon"><CheckCircle2 size={22} /></div>
                    <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.resolved || 0}</div>
                    <div className="stat-label">Fully Resolved</div>
                </div>
                <div className="glass-card stat-card amber animate-in">
                    <div className="stat-icon"><Clock size={22} /></div>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.in_progress || 0}</div>
                    <div className="stat-label">In Progress</div>
                </div>
            </div>

            {/* Message */}
            {msg.text && (
                <div style={{
                    background: msg.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                    border: `1px solid ${msg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    color: msg.type === 'error' ? '#ef4444' : '#10b981',
                    padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem',
                }}>{msg.text}</div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }} className="animate-in">
                {tabs.map((t) => (
                    <button key={t.id} className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab(t.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="glass-card animate-in">
                    <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* Avatar */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: '50%', background: 'var(--gradient-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.2rem', fontWeight: 800, color: 'white', margin: '0 auto 10px',
                                overflow: 'hidden', position: 'relative',
                            }}>
                                {profile?.profile_picture ? (
                                    <img src={profile.profile_picture} alt="Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    user?.name?.charAt(0)?.toUpperCase() || 'L'
                                )}
                            </div>
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600,
                            }}>
                                <Camera size={13} /> Change Photo
                                <input type="file" accept="image/*" onChange={handleAvatarChange}
                                    style={{ display: 'none' }} />
                            </label>
                        </div>

                        {/* Form */}
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Full Name</label>
                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                        style={{
                                            width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid var(--border-color)', borderRadius: '8px',
                                            color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                        }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Email</label>
                                    <div style={{
                                        padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-color)', borderRadius: '8px',
                                        color: 'var(--text-muted)', fontSize: '0.85rem'
                                    }}>
                                        <Mail size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                        {profile?.email}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Department</label>
                                    <input type="text" value={editDept} onChange={(e) => setEditDept(e.target.value)}
                                        style={{
                                            width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid var(--border-color)', borderRadius: '8px',
                                            color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                        }} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <Shield size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        Role: <strong style={{ color: 'var(--accent-blue)' }}>{profile?.role}</strong>
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Joined: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                                <button className="btn btn-primary" onClick={handleUpdateProfile}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                                    <Save size={14} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
                <div className="glass-card animate-in" style={{ maxWidth: '600px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={18} color="var(--accent-blue)" /> Theme Preferences
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Customize how JanNetra looks on your device.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                        {/* Default / System */}
                        <div
                            onClick={() => handleThemeChange('default')}
                            style={{
                                padding: '20px',
                                border: `2px solid ${theme === 'default' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: theme === 'default' ? 'var(--accent-blue-bg)' : 'var(--bg-glass)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Monitor size={32} color={theme === 'default' ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                            <span style={{ fontWeight: 600, color: theme === 'default' ? 'var(--accent-blue)' : 'var(--text-primary)' }}>System Default</span>
                        </div>

                        {/* Dark Mode */}
                        <div
                            onClick={() => handleThemeChange('dark')}
                            style={{
                                padding: '20px',
                                border: `2px solid ${theme === 'dark' ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: theme === 'dark' ? 'var(--accent-purple-bg)' : 'var(--bg-glass)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Moon size={32} color={theme === 'dark' ? 'var(--accent-purple)' : 'var(--text-muted)'} />
                            <span style={{ fontWeight: 600, color: theme === 'dark' ? 'var(--accent-purple)' : 'var(--text-primary)' }}>Dark Mode</span>
                        </div>

                        {/* Light Mode */}
                        <div
                            onClick={() => handleThemeChange('light')}
                            style={{
                                padding: '20px',
                                border: `2px solid ${theme === 'light' ? '#f59e0b' : 'var(--border-color)'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: theme === 'light' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-glass)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Sun size={32} color={theme === 'light' ? '#f59e0b' : 'var(--text-muted)'} />
                            <span style={{ fontWeight: 600, color: theme === 'light' ? '#f59e0b' : 'var(--text-primary)' }}>Light Mode</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Tab */}
            {
                activeTab === 'password' && (
                    <div className="glass-card animate-in" style={{ maxWidth: '440px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Change Password</h3>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Current Password</label>
                                <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
                                    placeholder="Enter current password"
                                    style={{
                                        width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-color)', borderRadius: '8px',
                                        color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                    }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>New Password</label>
                                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                                    placeholder="Min 6 characters"
                                    style={{
                                        width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-color)', borderRadius: '8px',
                                        color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                    }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Confirm New Password</label>
                                <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                                    placeholder="Re-enter new password"
                                    style={{
                                        width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-color)', borderRadius: '8px',
                                        color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                    }} />
                            </div>
                            <button className="btn btn-primary" onClick={handleChangePassword}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                                <Lock size={14} /> Update Password
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Delete Account Tab */}
            {
                activeTab === 'danger' && (
                    <div className="glass-card animate-in" style={{ maxWidth: '440px', borderColor: 'rgba(239,68,68,0.3)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: '#ef4444' }}>
                            ⚠️ Delete Account
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                            This action is <strong style={{ color: '#ef4444' }}>permanent and irreversible</strong>.
                            All your data, including resolutions, will be deleted.
                        </p>

                        {!deleteConfirm ? (
                            <button className="btn btn-danger" onClick={() => setDeleteConfirm(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Trash2 size={14} /> I want to delete my account
                            </button>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                                        Enter your password to confirm
                                    </label>
                                    <input type="password" value={deletePwd} onChange={(e) => setDeletePwd(e.target.value)}
                                        placeholder="Your password"
                                        style={{
                                            width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
                                            color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)'
                                        }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn btn-danger" onClick={handleDeleteAccount}>
                                        Permanently Delete
                                    </button>
                                    <button className="btn btn-ghost" onClick={() => { setDeleteConfirm(false); setDeletePwd(''); }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}
