// ─────────────────────────────────────────────────────────────
//  Compatibility shim — re-exports from the canonical location.
//  The real Firebase config now lives at src/config/firebase.js.
//  Any existing imports from '../firebase' continue to work.
// ─────────────────────────────────────────────────────────────
export { auth, provider, googleProvider } from "./config/firebase";
