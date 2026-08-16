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
        if (session) {
            setUser(session.user);
            // Decode role from JWT if using custom claims hook, otherwise fallback
            // In a real implementation with the hook, we can parse it from session.access_token
            // Here, we can read it from app_metadata if the hook puts it there,
            // or from the JWT payload.
            const userRole = session.user.app_metadata?.user_role || 'citizen';
            setRole(userRole);
        } else {
            setUser(null);
            setRole(null);
        }
        setLoading(false);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        user,
        role,
        session,
        loading,
        signOut,
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
