// ─────────────────────────────────────────────────────────────
//  JanNetra — Firebase Auth Service
//  Centralized authentication functions using Firebase SDK
// ─────────────────────────────────────────────────────────────

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

const API_BASE = '/api';

// ── Email Signup ─────────────────────────────────────────────
export async function signUpWithEmail(email, password) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
}

// ── Email Login ──────────────────────────────────────────────
export async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
}

// ── Phone OTP — Send ─────────────────────────────────────────
export function setupRecaptcha(containerId) {
    const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => { },
        'expired-callback': () => {
            console.warn('reCAPTCHA expired');
        },
    });
    return verifier;
}

export async function loginWithPhoneOTP(phoneNumber, appVerifier) {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return confirmationResult;
}

// ── Phone OTP — Verify ───────────────────────────────────────
export async function verifyOTP(confirmationResult, code) {
    const result = await confirmationResult.confirm(code);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
}

// ── Reset Password ───────────────────────────────────────────
export async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
}

// ── Google Sign-In ───────────────────────────────────────────
export async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
}

// ── Backend: Create/Upsert User Profile ──────────────────────
export async function createUserProfile({ name, email, phone, firebase_uid }) {
    const response = await axios.post(`${API_BASE}/auth/users/create`, {
        name,
        email: email || '',
        phone: phone || '',
        firebase_uid,
    });
    return response.data;
}

// ── Backend: Verify Firebase Token (Google/Phone) ────────────
export async function verifyFirebaseToken(idToken, endpoint = '/api/auth/firebase-login') {
    const response = await axios.post(
        endpoint,
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
    );
    return response.data;
}
