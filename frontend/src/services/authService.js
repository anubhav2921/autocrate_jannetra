// 
// JanNetra — Supabase Auth Service
// Clean + Safe + Production Ready
//

import { supabase } from '../supabase';
import api from './apiClient';

// Using consolidated 'api' from apiClient.js automatically handles environment-specific URLs.

// ==============================
// 🔹 Email Signup
// ==============================
export async function signUpWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        
        // Supabase returns a session with access_token
        return { user: data.user, idToken: data.session?.access_token || null };
    } catch (error) {
        console.error('[Signup Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 Email Login
// ==============================
export async function loginWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        
        return { user: data.user, idToken: data.session?.access_token || null };
    } catch (error) {
        console.error('[Email Login Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 Phone OTP — Send
// ==============================
export async function loginWithPhoneOTP(phoneNumber) {
    try {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone: phoneNumber,
        });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[Phone OTP Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 Phone OTP — Verify
// ==============================
export async function verifyOTP(phoneNumber, code) {
    try {
        const { data, error } = await supabase.auth.verifyOtp({
            phone: phoneNumber,
            token: code,
            type: 'sms'
        });
        if (error) throw error;
        return { user: data.user, idToken: data.session?.access_token || null };
    } catch (error) {
        console.error('[OTP Verify Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 Reset Password
// ==============================
export async function resetPassword(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('[Reset Password Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 Google Login
// ==============================
export async function loginWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/login'
            }
        });
        if (error) throw error;
        // OAuth login redirects, so we don't return tokens directly here
        return data;
    } catch (error) {
        console.error('[Google Login Error]', error);
        throw error;
    }
}

// ==============================
export async function createUserProfile(payload) {
    try {
        const response = await api.post('/auth/users/create', payload);
        return response;
    } catch (error) {
        console.error('[Create User Profile Error]', error);

        throw {
            message:
                error.response?.data?.detail ||
                error.response?.data?.error ||
                error.message ||
                'User creation failed',
        };
    }
}

// ==============================
// 🔹 Backend: Verify Supabase Token
// ==============================
export async function verifySupabaseToken(
    idToken,
    endpoint = '/auth/supabase-login'
) {
    try {
        const response = await api.post(
            endpoint,
            {},
            {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            }
        );

        return response;
    } catch (error) {
        console.error('[Supabase Verify Error]', error);

        throw {
            message:
                error.response?.data?.detail ||
                error.response?.data?.error ||
                error.message ||
                'Supabase verification failed',
            status: error.response?.status,
        };
    }
}