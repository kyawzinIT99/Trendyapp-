// ── Firebase App Initializer ──────────────────────────────────────────────────
// Status: PREPARED — not active until VITE_FIREBASE_API_KEY is set in .env
// Personal bags, orders, saved items, and uploaded photos stay on the phone.
// They are not written to Firestore or Firebase Storage.
//
// To activate:
//   1. Create a free Firebase project at https://console.firebase.google.com
//   2. Add a Web App to your project
//   3. Copy the config values into .env (see .env.example)
//   4. Enable Google Sign-In in Firebase Console:
//      Authentication → Sign-in method → Google → Enable
//   5. Enable Firestore in Firebase Console:
//      Firestore Database → Create database → Start in test mode
//   6. Restart the dev server: npm run dev

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Read config from environment variables (set in .env)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if API key is present (prevents errors when .env is empty)
export const FIREBASE_READY = Boolean(firebaseConfig.apiKey);

let app  = null;
let auth = null;
let db   = null;
let googleProvider = null;

if (FIREBASE_READY) {
  // Avoid re-initializing on hot reload
  app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
}

export { app, auth, db, googleProvider };
