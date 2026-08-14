import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export default function Settings({ user }) {
    const [users, setUsers]   = useState([]);
    const [orgs, setOrgs]     = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            apiClient.get('/auth/users/search?q=').catch(() => ({ data: { users: [] } })),
            apiClient.get('/organizations').catch(() => ({ data: [] })),
        ]).then(([uRes, oRes]) => {
            setUsers(uRes.data?.users || uRes.data || []);
            setOrgs(oRes.data?.organizations || oRes.data || []);
        }).finally(() => setLoading(false));
    }, []);

    const isAdmin = ['ADMIN','LEADER','SUPER_ADMIN'].includes((user?.role || '').toUpperCase());

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p>System configuration and administration</p>
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : (
                <div style={{ display:'grid', gap:20 }}>
                    <div className="table-wrapper">
                        <div className="table-header">
                            <h2>Users ({users.length})</h2>
                        </div>
                        {users.length === 0 ? (
                            <div className="empty-state"><p>No users found or you don&apos;t have permission to view users.</p></div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Organization</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id || u.user_id} onClick={undefined} style={{ cursor:'default' }}>
                                            <td style={{ fontWeight:500 }}>{u.name || '—'}</td>
                                            <td style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{u.email || '—'}</td>
                                            <td><span className="badge badge-assigned">{u.role || '—'}</span></td>
                                            <td style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{u.organization_name || u.organization || '—'}</td>
                                            <td>
                                                <span className={`badge ${u.is_active !== false ? 'badge-resolved' : 'badge-rejected'}`}>
                                                    {u.is_active !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {orgs.length > 0 && (
                        <div className="table-wrapper">
                            <div className="table-header">
                                <h2>Organizations ({orgs.length})</h2>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Jurisdiction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgs.map(o => (
                                        <tr key={o.id} style={{ cursor:'default' }}>
                                            <td style={{ fontWeight:500 }}>{o.name || '—'}</td>
                                            <td style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{o.type || '—'}</td>
                                            <td style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{o.jurisdiction || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="detail-section" style={{ maxWidth:480 }}>
                        <h3>Your Account</h3>
                        <div className="detail-row"><label>Name</label><span>{user?.name || '—'}</span></div>
                        <div className="detail-row"><label>Email</label><span>{user?.email || '—'}</span></div>
                        <div className="detail-row"><label>Role</label><span>{user?.role || '—'}</span></div>
                        <div className="detail-row"><label>Organization</label><span>{user?.organization || user?.org_name || '—'}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
}
