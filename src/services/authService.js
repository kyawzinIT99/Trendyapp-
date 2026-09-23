// ── Auth Service — Sign-in + per-person storage on this phone ────────────────
// Each person's bag, orders, and saved items stay on this phone, keyed by their id.
// Uploaded photos are not stored in that personal record, and this store is never sent to the cloud.

import { phoneRecordImage } from './catalogImages';

const AUTH_KEY   = 'trendy_auth_user';
const GUEST_KEY  = 'trendy_guest_id';

// ── User session ─────────────────────────────────────────────────────────────
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

export function saveUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function signOut() {
  localStorage.removeItem(AUTH_KEY);
  // Revoke Google token if available
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
}

// Guest ID (anonymous local user so cart persists without sign-in)
export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

// Active user ID (Google ID or guest ID)
export function getActiveUserId(user) {
  return user?.id || getGuestId();
}

// ── Per-user scoped storage ───────────────────────────────────────────────────
function userKey(userId, scope) {
  return `trendy_${scope}_${userId}`;
}

function personalLine(item) {
  if (!item || typeof item !== 'object') return item;
  const { imageKey, draftId, picture, photo, ...rest } = item;
  const image = phoneRecordImage(item.image);
  return image ? { ...rest, image } : { ...rest, image: '' };
}

function personalOrder(order) {
  if (!order?.items) return order;
  const { picture, photo, ...rest } = order;
  return { ...rest, items: order.items.map(personalLine) };
}

export function getUserCart(userId) {
  try {
    const raw = localStorage.getItem(userKey(userId, 'cart'));
    const cart = raw ? JSON.parse(raw) : [];
    return Array.isArray(cart) ? cart.map(personalLine) : [];
  } catch (_) { return []; }
}

export function saveUserCart(userId, cart) {
  const lines = (cart || []).map(personalLine);
  localStorage.setItem(userKey(userId, 'cart'), JSON.stringify(lines));
}

export function getUserOrders(userId) {
  try {
    const raw = localStorage.getItem(userKey(userId, 'orders'));
    const orders = raw ? JSON.parse(raw) : [];
    return Array.isArray(orders) ? orders.map(personalOrder) : [];
  } catch (_) { return []; }
}

export function saveUserOrders(userId, orders) {
  const rows = (orders || []).map(personalOrder);
  localStorage.setItem(userKey(userId, 'orders'), JSON.stringify(rows));
}

export function getUserFavorites(userId) {
  try {
    const raw = localStorage.getItem(userKey(userId, 'favorites'));
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

export function saveUserFavorites(userId, favs) {
  localStorage.setItem(userKey(userId, 'favorites'), JSON.stringify(favs));
}

// ── Google Identity Services helper ──────────────────────────────────────────
// Replace GOOGLE_CLIENT_ID with your real ID from console.cloud.google.com
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

export function initGoogleSignIn(onSuccess) {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      // Decode JWT to get user profile
      const payload = parseJwt(response.credential);
      if (!payload) return;
      const user = {
        id:      payload.sub,
        name:    payload.name,
        email:   payload.email,
        picture: payload.picture,
        signedInAt: new Date().toISOString(),
      };
      saveUser(user);
      onSuccess(user);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

export function renderGoogleButton(containerId) {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.renderButton(
    document.getElementById(containerId),
    {
      theme: 'outline',
      size: 'large',
      width: 280,
      logo_alignment: 'left',
      text: 'signin_with',
    }
  );
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (_) { return null; }
}

// ── Demo sign-in (when Google Client ID not configured) ───────────────────────
// Simulates sign-in with a demo profile for local development.
export function demoSignIn(onSuccess) {
  const demoUser = {
    id:      'demo_' + Math.random().toString(36).slice(2, 8),
    name:    'Demo User',
    email:   'demo@trendy.app',
    picture: null,
    isDemo:  true,
    signedInAt: new Date().toISOString(),
  };
  saveUser(demoUser);
  onSuccess(demoUser);
}
