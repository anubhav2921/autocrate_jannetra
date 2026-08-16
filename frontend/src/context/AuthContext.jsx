import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch current session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for auth changes (login, logout, token refresh)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                handleSession(session);
            }
        );

        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, []);

    const handleSession = (session) => {
        setSession(session);
        if (session && session.user) {
            setUser(session.user);
            const userRole = 
                session.user.app_metadata?.user_role || 
                session.user.user_metadata?.role || 
                session.user.user_metadata?.user_role || 
                'citizen';
            setRole(userRole.toLowerCase());
        } else {
            // Check localStorage fallback for backend/phone login
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');
            if (storedUser && storedToken) {
                try {
                    const parsed = JSON.parse(storedUser);
                    setUser(parsed);
                    setRole((parsed.role || 'citizen').toLowerCase());
                } catch {
                    setUser(null);
                    setRole(null);
                }
            } else {
                setUser(null);
                setRole(null);
            }
        }
        setLoading(false);
    };

    const loginWithLocalUser = (localUser, token) => {
        if (localUser) {
            localStorage.setItem('user', JSON.stringify(localUser));
            if (token) localStorage.setItem('token', token);
            setUser(localUser);
            setRole((localUser.role || 'citizen').toLowerCase());
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Sign out error:', e);
        }
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setRole(null);
        setSession(null);
    };

    const value = {
        user,
        role,
        session,
        loading,
        signOut,
        loginWithLocalUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
