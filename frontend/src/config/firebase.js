// 
//  JanNetra — Firebase Configuration (Optional Auth Provider)
//  Reads values from .env via Vite's import.meta.env.
//  If Firebase is not configured, the app seamlessly runs on native JWT authentication.
// 

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "";
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "";
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "";
const appId = import.meta.env.VITE_FIREBASE_APP_ID || "";
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "";

export const isFirebaseConfigured = Boolean(
    apiKey &&
    !apiKey.includes("your_") &&
    projectId &&
    !projectId.includes("your_")
);

const firebaseConfig = {
    apiKey: apiKey || "dummy-api-key",
    authDomain: authDomain || "dummy-project.firebaseapp.com",
    projectId: projectId || "dummy-project",
    storageBucket: storageBucket || "dummy-project.appspot.com",
    messagingSenderId: messagingSenderId || "123456789",
    appId: appId || "1:123456789:web:abcdef",
    measurementId: measurementId || "G-DUMMY",
};

let app = null;
let authInstance = null;
let analyticsInstance = null;
let googleProviderInstance = null;

try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }
    
    authInstance = getAuth(app);
    
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: "select_account" });

    if (typeof window !== "undefined") {
        isSupported().then((supported) => {
            if (supported && isFirebaseConfigured) {
                analyticsInstance = getAnalytics(app);
            }
        }).catch(() => {});
    }
} catch (err) {
    if (import.meta.env.DEV) {
        console.info("[Firebase] Running in native JWT mode. Firebase is optional:", err?.message);
    }
}

export const auth = authInstance;
export const googleProvider = googleProviderInstance;
export const provider = googleProviderInstance;
export const analytics = analyticsInstance;
export default app;
