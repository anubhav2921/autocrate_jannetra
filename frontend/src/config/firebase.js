// 
//  JanNetra — Firebase Configuration (canonical location)
//  Reads all values from .env via Vite's import.meta.env.
//  No config is hardcoded here — safe to commit.
// 

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate config at startup — catches missing .env variables early
if (import.meta.env.DEV) {
    const missing = Object.entries(firebaseConfig)
        .filter(([, v]) => !v)
        .map(([k]) => k);
    if (missing.length) {
        console.error(
            "[Firebase] Missing env variables:",
            missing,
            "\nMake sure your frontend/.env file exists and the Vite dev server was restarted."
        );
    }
}

// Firebase app instance
const app = initializeApp(firebaseConfig);

// Auth exports
export const auth = getAuth(app);

// Google provider — forces account chooser on every login
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Re-export provider under old name too (backward compat)
export const provider = googleProvider;
