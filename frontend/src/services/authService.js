// 
// JanNetra — Authentication Service
// Full JWT Authentication + Optional Firebase Integration
// 

import api from './apiClient';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';

// ==========================================
// 🔹 1. Standard JWT Auth (Primary)
// ==========================================

/**
 * Login with Email and Password using Backend JWT.
 */
export async function loginWithCredentials(email, password) {
    try {
        const response = await api.post('/auth/login', { email, password });
        if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
    } catch (error) {
        console.error('[JWT Login Error]', error);
        throw error;
    }
}

/**
 * Direct registration with Name, Email, Password, Department.
 */
export async function registerWithCredentials(userData) {
    try {
        const response = await api.post('/auth/register', userData);
        if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
    } catch (error) {
        console.error('[JWT Register Error]', error);
        throw error;
    }
}

/**
 * Request Email Signup OTP.
 */
export async function requestSignupOtp(userData) {
    return await api.post('/auth/signup', userData);
}

/**
 * Verify Email Signup OTP and retrieve JWT token.
 */
export async function verifySignupOtp(payload) {
    const response = await api.post('/auth/verify-otp', payload);
    if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
}

/**
 * Get current authenticated user details from Backend JWT.
 */
export async function getCurrentUser() {
    try {
        const response = await api.get('/auth/me');
        if (response.success && response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            return response.user;
        }
        return null;
    } catch (error) {
        console.error('[Get Current User Error]', error);
        return null;
    }
}

/**
 * Get server authentication status & configured methods.
 */
export async function getAuthStatus() {
    try {
        return await api.get('/auth/status');
    } catch {
        return { jwt_auth: true, firebase_auth: false };
    }
}

/**
 * Clear local session on logout.
 */
export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}


// ==========================================
// 🔹 2. Optional Firebase Auth Integrations
// ==========================================

export async function loginWithEmail(email, password) {
    if (isFirebaseConfigured && auth) {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await result.user.getIdToken();
            return { user: result.user, idToken };
        } catch (error) {
            console.error('[Firebase Email Login Error]', error);
            throw error;
        }
    }
    return await loginWithCredentials(email, password);
}

export async function signUpWithEmail(email, password) {
    if (isFirebaseConfigured && auth) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const idToken = await result.user.getIdToken();
            return { user: result.user, idToken };
        } catch (error) {
            console.error('[Firebase Signup Error]', error);
            throw error;
        }
    }
    return await registerWithCredentials({ email, password, name: email.split('@')[0] });
}

export async function resetPassword(email) {
    if (isFirebaseConfigured && auth) {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            console.error('[Reset Password Error]', error);
            throw error;
        }
    }
    return { success: true, message: 'Password reset request received' };
}

export async function loginWithGoogle() {
    if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase Google Authentication is not configured in .env');
    }
    const { signInWithPopup } = await import('firebase/auth');
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken(true);
        const response = await api.post(
            '/auth/google',
            {},
            { headers: { Authorization: `Bearer ${idToken}` } }
        );
        if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
    } catch (error) {
        console.error('[Google Login Error]', error);
        throw error;
    }
}

export function setupRecaptcha(containerId) {
    if (!auth) {
        throw new Error('Firebase Auth is not initialized');
    }
    return import('firebase/auth').then(({ RecaptchaVerifier }) => {
        return new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => { },
            'expired-callback': () => {
                console.warn('reCAPTCHA expired');
            },
        });
    });
}

export async function loginWithPhoneOTP(phoneNumber, appVerifier) {
    if (!auth) {
        throw new Error('Firebase Phone Auth is not initialized');
    }
    const { signInWithPhoneNumber } = await import('firebase/auth');
    try {
        return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    } catch (error) {
        console.error('[Phone OTP Error]', error);
        throw error;
    }
}

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

export async function verifyFirebaseToken(idToken, endpoint = '/auth/firebase-login') {
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
        if (response.token) {
            localStorage.setItem('token', response.token);
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }
        }
        return response;
    } catch (error) {
        console.error('[Firebase Verify Error]', error);
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

export async function createUserProfile(payload) {
    try {
        const response = await api.post('/auth/users/create', payload);
        if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
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