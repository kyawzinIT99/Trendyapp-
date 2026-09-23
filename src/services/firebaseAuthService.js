// ── Firebase Auth Service ─────────────────────────────────────────────────────
// Sign-in can use Firebase later. The person's bag, orders, saved items, and
// uploaded photos stay on this phone and are not written to Firestore.

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, FIREBASE_READY } from './firebase';
import { phoneRecordImage } from './catalogImages';

// ── Auth state listener ───────────────────────────────────────────────────────
// Call this once in App.jsx to track sign-in state reactively.
export function onUserChanged(callback) {
  if (!FIREBASE_READY) {
    // Fallback: return current localStorage user immediately
    callback(getLocalUser());
    return () => {};
  }
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) { callback(null); return; }
    callback(rememberPhoneProfile(firebaseUser));
  });
}

// ── Sign-In ───────────────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  if (!FIREBASE_READY) {
    throw new Error('Firebase not configured — add API key to .env');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return rememberPhoneProfile(result.user);
}

// ── Sign-Out ──────────────────────────────────────────────────────────────────
export async function signOut() {
  if (FIREBASE_READY) {
    await firebaseSignOut(auth);
  }
  localStorage.removeItem('trendy_auth_user');
}

function rememberPhoneProfile(firebaseUser) {
  const profile = {
    id:        firebaseUser.uid,
    name:      firebaseUser.displayName || 'Trendy User',
    email:     firebaseUser.email || '',
    lastLogin: new Date().toISOString(),
  };
  localStorage.setItem('trendy_auth_user', JSON.stringify(profile));
  return profile;
}

// ── Personal store stays on this phone, even after Firebase is switched on ──
export async function getUserCart(userId) {
  return getLocalData(userId, 'cart') || [];
}

export async function saveUserCart(userId, items) {
  setLocalData(userId, 'cart', (items || []).map((item) => {
    const { imageKey, draftId, picture, photo, ...rest } = item || {};
    const image = phoneRecordImage(item?.image);
    return image ? { ...rest, image } : { ...rest, image: '' };
  }));
}

export async function getUserOrders(userId) {
  return getLocalData(userId, 'orders') || [];
}

export async function addUserOrder(userId, order) {
  const current = await getUserOrders(userId);
  setLocalData(userId, 'orders', [order, ...current]);
}

export async function getUserFavorites(userId) {
  return getLocalData(userId, 'favorites') || [];
}

export async function saveUserFavorites(userId, favIds) {
  setLocalData(userId, 'favorites', favIds);
}

// ── Local fallback helpers ────────────────────────────────────────────────────
function getLocalUser() {
  try { return JSON.parse(localStorage.getItem('trendy_auth_user')); } catch { return null; }
}
function getLocalData(userId, scope) {
  try { return JSON.parse(localStorage.getItem(`trendy_${scope}_${userId}`)); } catch { return null; }
}
function setLocalData(userId, scope, data) {
  localStorage.setItem(`trendy_${scope}_${userId}`, JSON.stringify(data));
}
