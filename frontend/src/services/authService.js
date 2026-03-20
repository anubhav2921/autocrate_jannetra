// 
// JanNetra — Firebase Auth Service (Improved Version)
// Clean + Safe + Production Ready
//

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    sendPasswordResetEmail,
    signInWithPopup,
    RecaptchaVerifier,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'https://jannetra-web-production.up.railway.app/api';

// ==============================
// 🔹 Email Signup
// ==============================
export async function signUpWithEmail(email, password) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken };
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
        const result = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken };
    } catch (error) {
        console.error('[Email Login Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 reCAPTCHA Setup
// ==============================
export function setupRecaptcha(containerId) {
    try {
        return new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => { },
            'expired-callback': () => {
                console.warn('reCAPTCHA expired');
            },
        });
    } catch (err) {
        console.error('Recaptcha error:', err);
        throw err;
    }
}

// ==============================
// 🔹 Phone OTP — Send
// ==============================
export async function loginWithPhoneOTP(phoneNumber, appVerifier) {
    try {
        return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    } catch (error) {
        console.error('[Phone OTP Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 Phone OTP — Verify
// ==============================
export async function verifyOTP(confirmationResult, code) {
    try {
        const result = await confirmationResult.confirm(code);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken };
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
        await sendPasswordResetEmail(auth, email);
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
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken };
    } catch (error) {
        console.error('[Google Login Error]', error);
        throw error;
    }
}

// ==============================
// 🔹 Backend: Create User Profile
// ==============================
export async function createUserProfile(payload) {
    try {
        const response = await axios.post(`${API_BASE}/auth/users/create`, payload);
        return response.data;
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
// 🔥 IMPORTANT FIX
// 🔹 Backend: Verify Firebase Token
// ==============================
export async function verifyFirebaseToken(
    idToken,
    endpoint = '/auth/firebase-login'   // ✅ FIXED (no double /api)
) {
    try {
        const response = await axios.post(
            `${API_BASE}${endpoint}`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('[Firebase Verify Error]', error);

        // ✅ Proper error propagation (NO fake messages)
        throw {
            message:
                error.response?.data?.detail ||
                error.response?.data?.error ||
                error.message ||
                'Firebase verification failed',
            status: error.response?.status,
        };
    }
}