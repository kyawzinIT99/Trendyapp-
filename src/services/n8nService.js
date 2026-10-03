// Trendy Backend Automation & n8n Service
// Operates strictly in the backend / admin panel for automated order routing,
// stock monitoring, and webhook event processing.

const STORAGE_KEY      = 'trendy_backend_n8n_config';
const LOGS_STORAGE_KEY = 'trendy_backend_n8n_logs';

// Read from .env (set once, never changes at runtime)
const ENV_N8N_WEBHOOK_TOKEN = import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '';
const ENV_N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';
const SHEET_STATUSES = [
  'Order Placed',
  'Confirmed',
  'Order Pickup',
  'Order Processing',
  'Delivered to your home',
];
const LEGACY_STATUS_MAP = {
  'Packed & Ready': 'Order Processing',
  'Out for Delivery': 'Order Pickup',
  'Delivered': 'Delivered to your home',
};
const PAYMENT_STATUSES = ['Pending', 'Verifying', 'Paid', 'Failed'];

export function getSheetStatuses() {
  return SHEET_STATUSES;
}

export function normalizeSheetStatus(status) {
  if (SHEET_STATUSES.includes(status)) return status;
  if (LEGACY_STATUS_MAP[status]) return LEGACY_STATUS_MAP[status];
  return null;
}

export function getBackendN8NConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const stored = JSON.parse(saved);
      // Env values always override stored values when present
      return {
        ...stored,
        webhookUrl:  ENV_N8N_WEBHOOK_URL || stored.webhookUrl,
        secretToken: ENV_N8N_WEBHOOK_TOKEN || stored.secretToken,
      };
    }
  } catch (e) {
    console.error(e);
  }
  return {
    enabled:       true,
    webhookUrl:    ENV_N8N_WEBHOOK_URL || 'https://n8n.your-domain.com/webhook/trendy-backend-events',
    secretToken:   ENV_N8N_WEBHOOK_TOKEN,
    syncOrders:    true,
    syncInventory: true,
  };
}

export function saveBackendN8NConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('trendy-n8n-config-changed', { detail: config }));
}

export function getBackendLogs() {
  try {
    const saved = localStorage.getItem(LOGS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return [];
}

function appendLog(logEntry) {
  const current = getBackendLogs();
  const updated = [logEntry, ...current].slice(0, 40);
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('trendy-n8n-log-added', { detail: logEntry }));
  return updated;
}

export function clearBackendLogs() {
  localStorage.removeItem(LOGS_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('trendy-n8n-log-added', { detail: null }));
  window.dispatchEvent(new CustomEvent('n8n-log-added'));
}

// ── Backwards-compatible aliases for N8NConfigModal & other consumers ─────────
export const getN8NConfig = getBackendN8NConfig;
export const saveN8NConfig = saveBackendN8NConfig;
export const getEventLogs = getBackendLogs;
export const clearLogs = clearBackendLogs;

/**
 * Dispatches an event from the backend/admin panel to the n8n webhook workflow
 */
export async function dispatchBackendN8NEvent(eventType, data = {}) {
  const config = getBackendN8NConfig();
  const timestamp = new Date().toISOString();
  const eventId = 'ev_' + Math.random().toString(36).substring(2, 9);

  const payload = {
    eventId,
    eventType,
    timestamp,
    app: 'Trendy Mobile Engine',
    environment: 'production',
    data
  };

  const logEntry = {
    id: eventId,
    eventType,
    timestamp: new Date().toLocaleTimeString(),
    targetUrl: config.webhookUrl,
    payload,
    status: 'pending',
    responseMessage: null
  };

  appendLog(logEntry);

  if (!config.enabled || !config.webhookUrl) {
    logEntry.status = 'skipped_disabled';
    logEntry.responseMessage = 'Backend automation webhook is disabled or empty';
    appendLog(logEntry);
    return { success: false, reason: 'disabled' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), eventType === 'order.submitted' ? 25000 : 12000);

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trendy-Backend-Secret': ENV_N8N_WEBHOOK_TOKEN || config.secretToken || '',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logEntry.status = 'webhook_http_error';
      logEntry.responseMessage = `HTTP ${response.status} from n8n`;
      appendLog(logEntry);
      window.dispatchEvent(new CustomEvent('n8n-log-added'));
      return { success: false, logEntry };
    }

    const text = await response.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }

    if (eventType === 'order.submitted' && !parsed?.success) {
      logEntry.status = 'webhook_http_error';
      logEntry.responseMessage = parsed?.message || 'Order was not saved to Google Sheet';
      appendLog(logEntry);
      window.dispatchEvent(new CustomEvent('n8n-log-added'));
      return { success: false, logEntry };
    }

    logEntry.status = 'delivered';
    logEntry.responseMessage = `HTTP ${response.status} OK (Received by n8n)`;
  } catch (err) {
    logEntry.status = 'webhook_network_error';
    logEntry.responseMessage = `Webhook request failed (${err.message})`;
    appendLog(logEntry);
    window.dispatchEvent(new CustomEvent('n8n-log-added'));
    return { success: false, logEntry };
  }

  appendLog(logEntry);
  window.dispatchEvent(new CustomEvent('n8n-log-added'));
  return { success: true, logEntry };
}

// Alias — same as dispatchBackendN8NEvent
export const dispatchN8NEvent = dispatchBackendN8NEvent;

/**
 * Reads the authoritative delivery/payment status from Google Sheets through
 * n8n. The per-order tracking token prevents order-ID enumeration. This call
 * intentionally does not enter the admin event log because it runs every 30s.
 */
export function createTrackingToken() {
  const randomUUID = globalThis.crypto?.randomUUID?.();
  const fallback = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `trk_${randomUUID ? randomUUID.replaceAll('-', '') : fallback}`;
}

export function withTrackingToken(order) {
  if (order?.trackingToken) return order;
  return { ...order, trackingToken: createTrackingToken() };
}

export const TRACKING_POLL_MS = 8000;

function parseTrackingUpdate(result) {
  if (!result?.success || !result?.found) {
    return {
      success: false,
      notFound: result?.found === false,
      error: result?.message || 'Order not found',
    };
  }
  const deliveryStatus = normalizeSheetStatus(result.deliveryStatus);
  if (!deliveryStatus) {
    return { success: false, error: 'Tracking service returned an invalid delivery status' };
  }
  if (!PAYMENT_STATUSES.includes(result.paymentStatus)) {
    return { success: false, error: 'Tracking service returned an invalid payment status' };
  }
  return {
    success: true,
    update: {
      deliveryStatus,
      statusIndex: SHEET_STATUSES.indexOf(deliveryStatus),
      paymentStatus: result.paymentStatus,
      statusNote: result.statusNote || '',
      statusUpdatedAt: result.statusUpdatedAt || '',
      trackingRegionState: result.regionState || '',
      trackingTownship: result.township || '',
      trackingFullAddress: result.fullAddress || '',
      trackingCheckedAt: new Date().toISOString(),
    },
  };
}

async function postTrackingLookup(data, { signal } = {}) {
  const config = getBackendN8NConfig();
  if (!config.enabled || !config.webhookUrl) {
    return { ok: false, error: 'Tracking service is unavailable' };
  }

  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  signal?.addEventListener('abort', relayAbort, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trendy-Backend-Secret': ENV_N8N_WEBHOOK_TOKEN || config.secretToken || '',
      },
      body: JSON.stringify({
        eventId: `ev_track_${Math.random().toString(36).slice(2, 10)}`,
        eventType: 'order.tracking_lookup',
        timestamp: new Date().toISOString(),
        app: 'Trendy Mobile Engine',
        environment: 'production',
        data,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, error: `Tracking service returned HTTP ${response.status}` };
    }

    let text = await response.text();
    if (!text) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const retry = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trendy-Backend-Secret': ENV_N8N_WEBHOOK_TOKEN || config.secretToken || '',
        },
        body: JSON.stringify({
          eventId: `ev_track_${Math.random().toString(36).slice(2, 10)}`,
          eventType: 'order.tracking_lookup',
          timestamp: new Date().toISOString(),
          app: 'Trendy Mobile Engine',
          environment: 'production',
          data,
        }),
        signal: controller.signal,
      });
      if (!retry.ok) {
        return { ok: false, error: `Tracking service returned HTTP ${retry.status}` };
      }
      text = await retry.text();
    }
    if (!text) {
      return { ok: false, error: 'Tracking service returned an empty response' };
    }
    return { ok: true, payload: JSON.parse(text) };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { ok: false, error: signal?.aborted ? 'Tracking refresh cancelled' : 'Tracking service timed out' };
    }
    return { ok: false, error: 'Could not reach live tracking' };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', relayAbort);
  }
}

async function postStaffEvent(eventType, data) {
  const config = getBackendN8NConfig();
  if (!config.enabled || !config.webhookUrl) return { connected: false };
  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trendy-Backend-Secret': ENV_N8N_WEBHOOK_TOKEN || config.secretToken || '',
      },
      body: JSON.stringify({
        eventId: `ev_user_${Math.random().toString(36).slice(2, 10)}`,
        eventType,
        timestamp: new Date().toISOString(),
        app: 'Trendy Mobile Engine',
        environment: 'production',
        data,
      }),
    });
    if (!response.ok) return { connected: false };
    const payload = await response.json();
    if (payload?.logged === 'event') return { connected: false };
    return { connected: true, ...payload };
  } catch {
    return { connected: false };
  }
}

export async function requestOwnerOtp({ name, phone, email, purpose } = {}) {
  return postStaffEvent('user.otp_request', { name, phone, email, purpose });
}

export async function verifyOwnerOtp({ name, phone, email, code, purpose } = {}) {
  const payload = await postStaffEvent('user.otp_verify', { name, phone, email, code, purpose });
  if (!payload.connected || payload.verified == null) return { connected: false };
  return payload;
}

export async function listSheetUsers(viewer) {
  const payload = await postStaffEvent('user.list', {
    actorPhone: viewer?.phone || '',
    actorEmail: viewer?.email || '',
    actorName: viewer?.name || '',
  });
  if (!payload.connected || !Array.isArray(payload.users)) return { connected: false, users: [] };
  return { connected: true, users: payload.users };
}

export async function saveSheetUser({ name, phone, email, role, active, viewer } = {}) {
  return postStaffEvent('user.account_saved', {
    name,
    phone,
    email,
    role,
    active,
    source: 'admin',
    actorPhone: viewer?.phone || '',
    actorEmail: viewer?.email || '',
    actorName: viewer?.name || '',
  });
}

export async function deleteSheetUser({ phone, actorPhone, actorEmail } = {}) {
  const payload = await postStaffEvent('user.account_deleted', { phone, actorPhone, actorEmail });
  if (!payload.connected) return { connected: false, deleted: false };
  return payload;
}

export async function joinOrdersSheet({ name, phone, email } = {}) {
  const payload = await postStaffEvent('user.sheet_join', { name, phone, email });
  if (!payload.connected) return { connected: false, joined: false };
  return payload;
}

export async function lookupStaffOnSheet({ phone, name } = {}) {
  const config = getBackendN8NConfig();
  if (!config.enabled || !config.webhookUrl) {
    return { connected: false };
  }
  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trendy-Backend-Secret': ENV_N8N_WEBHOOK_TOKEN || config.secretToken || '',
      },
      body: JSON.stringify({
        eventId: `ev_user_${Math.random().toString(36).slice(2, 10)}`,
        eventType: 'user.role_lookup',
        timestamp: new Date().toISOString(),
        app: 'Trendy Mobile Engine',
        environment: 'production',
        data: { phone, name },
      }),
    });
    if (!response.ok) return { connected: false };
    const payload = await response.json();
    if (payload?.logged === 'event' || payload?.found == null) return { connected: false };
    return { connected: true, ...payload };
  } catch {
    return { connected: false };
  }
}

async function readTrackingGroup(orders, sheetId, signal) {
  return postTrackingLookup({
    ...(sheetId ? { ordersSheetId: sheetId } : {}),
    orders: orders.map((order) => ({
      orderId: order.orderId,
      trackingToken: order.trackingToken,
    })),
  }, { signal });
}

function applyTrackingGroup(group, posted, updates, notFoundIds) {
  if (!posted.ok) return posted.error || '';
  const payload = posted.payload || {};
  const resultMap = payload.batch ? (payload.results || {}) : { [group[0].orderId]: payload };
  let error = '';
  group.forEach((order) => {
    const parsed = parseTrackingUpdate(resultMap[order.orderId]);
    if (parsed.success) {
      updates.push({ orderId: order.orderId, ordersSheetId: order.ordersSheetId || '', result: parsed });
    } else if (parsed.notFound) {
      notFoundIds.push(order.orderId);
      if (!error) error = parsed.error;
    } else if (!error) {
      error = parsed.error;
    }
  });
  return error;
}

export async function lookupOrderTracking(order, { signal } = {}) {
  if (!order?.orderId || !order?.trackingToken) {
    return { success: false, error: 'Live tracking is unavailable for this older order', legacy: true };
  }
  const onOwnerSheet = await postTrackingLookup({
    orderId: order.orderId,
    trackingToken: order.trackingToken,
  }, { signal });
  if (!onOwnerSheet.ok) return { success: false, error: onOwnerSheet.error };
  const ownerUpdate = parseTrackingUpdate(onOwnerSheet.payload);
  if (ownerUpdate.success || !order.ordersSheetId) return ownerUpdate;
  if (!ownerUpdate.notFound) return ownerUpdate;
  const onOwnSheet = await postTrackingLookup({
    orderId: order.orderId,
    trackingToken: order.trackingToken,
    ordersSheetId: order.ordersSheetId,
  }, { signal });
  if (!onOwnSheet.ok) return ownerUpdate;
  return parseTrackingUpdate(onOwnSheet.payload);
}

export async function lookupOrdersTracking(orders, { signal } = {}) {
  const trackable = (orders || []).filter((order) => order?.orderId && order?.trackingToken);
  if (trackable.length === 0) {
    return { success: true, updates: [] };
  }

  const updates = [];
  const notFoundIds = [];
  let firstError = '';
  let reached = false;

  const ownerSheet = await readTrackingGroup(trackable, '', signal);
  if (ownerSheet.ok) {
    reached = true;
    const missed = [];
    const ownerError = applyTrackingGroup(trackable, ownerSheet, updates, missed);
    if (ownerError && updates.length === 0) firstError = ownerError;
    const found = new Set(updates.map((entry) => entry.orderId));
    const remaining = trackable.filter((order) => !found.has(order.orderId) && order.ordersSheetId);
    const groups = new Map();
    remaining.forEach((order) => {
      const key = String(order.ordersSheetId);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(order);
    });
    for (const [sheetId, group] of groups) {
      const posted = await readTrackingGroup(group, sheetId, signal);
      if (!posted.ok) {
        if (!firstError) firstError = posted.error;
        continue;
      }
      const error = applyTrackingGroup(group, posted, updates, notFoundIds);
      if (error && !firstError) firstError = error;
    }
    trackable.forEach((order) => {
      const foundNow = updates.some((entry) => entry.orderId === order.orderId);
      if (!foundNow && !order.ordersSheetId && !notFoundIds.includes(order.orderId)) {
        notFoundIds.push(order.orderId);
      }
    });
  } else {
    firstError = ownerSheet.error;
    const groups = new Map();
    trackable.forEach((order) => {
      const key = String(order.ordersSheetId || '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(order);
    });
    for (const [sheetId, group] of groups) {
      if (!sheetId) continue;
      const posted = await readTrackingGroup(group, sheetId, signal);
      if (!posted.ok) continue;
      reached = true;
      const error = applyTrackingGroup(group, posted, updates, notFoundIds);
      if (error && !firstError) firstError = error;
    }
  }

  if (!reached && updates.length === 0) {
    return { success: false, updates: [], error: firstError || 'Live tracking is temporarily unavailable' };
  }

  return {
    success: updates.length > 0,
    updates,
    notFoundIds,
    error: updates.length > 0 ? '' : (firstError || 'Live tracking is temporarily unavailable'),
  };
}

function orderWithoutPhotos(order) {
  const rest = { ...(order || {}) };
  delete rest.cardDetails;
  const address = order?.address || {};
  return {
    ...rest,
    guest: true,
    address: {
      name: address.name || '',
      email: address.email || '',
      phone: address.phone || '',
      street: address.street || '',
      township: address.township || '',
      regionState: address.regionState || '',
      country: address.country || 'Myanmar',
    },
    payment: order?.payment?.id
      ? { id: order.payment.id, label: order.payment.label }
      : { id: 'guest', label: 'Guest checkout' },
    items: (order?.items || []).map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
  };
}

const COURIER_STEPS = ['placed', 'booked', 'pickup', 'transit', 'delivered'];

function courierWebhookUrl() {
  const config = getBackendN8NConfig();
  if (!config.webhookUrl) return '';
  try {
    const url = new URL(config.webhookUrl);
    url.pathname = '/webhook/trendy-courier-track';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

async function postCourierEvent(eventType, data, { signal } = {}) {
  const config = getBackendN8NConfig();
  const target = courierWebhookUrl();
  if (!config.enabled || !target) {
    return { ok: false, error: 'Courier tracking is unavailable' };
  }
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  signal?.addEventListener('abort', relayAbort, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trendy-Backend-Secret': ENV_N8N_WEBHOOK_TOKEN || config.secretToken || '',
      },
      body: JSON.stringify({
        eventId: `ev_courier_${Math.random().toString(36).slice(2, 10)}`,
        eventType,
        timestamp: new Date().toISOString(),
        app: 'Trendy Mobile Engine',
        environment: 'production',
        data,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: `Courier tracking returned HTTP ${response.status}` };
    const text = await response.text();
    if (!text) return { ok: false, error: 'Courier tracking returned an empty response' };
    return { ok: true, payload: JSON.parse(text) };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { ok: false, error: signal?.aborted ? 'Tracking refresh cancelled' : 'Courier tracking timed out' };
    }
    return { ok: false, error: 'Could not reach courier tracking' };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', relayAbort);
  }
}

function parseCourierUpdate(result) {
  if (!result?.success || !result?.found) {
    return {
      success: false,
      notFound: result?.found === false,
      error: result?.message || 'Courier shipment not found',
    };
  }
  const current = COURIER_STEPS.includes(result.current) ? result.current : 'booked';
  return {
    success: true,
    update: {
      courierStep: current,
      courierName: result.courierName || '',
      trackingNumber: result.trackingNumber || '',
      statusNote: result.statusNote || '',
      statusUpdatedAt: result.updatedAt || '',
      courierBound: true,
    },
  };
}

export async function bookCourierShipment(order) {
  const address = order?.address || {};
  const posted = await postCourierEvent('order.courier_book', {
    orderId: order.orderId,
    trackingToken: order.trackingToken,
    courierId: order.courierId || order.delivery?.id || '',
    courierName: order.courierName || order.delivery?.label || '',
    regionState: address.regionState || '',
    country: address.country || 'Thailand',
  });
  if (!posted.ok) return { success: false, error: posted.error };
  return parseCourierUpdate(posted.payload);
}

export async function reportCourierStep(order, { current, trackingNumber = '' }) {
  const number = String(trackingNumber || '').trim();
  const posted = await postCourierEvent('order.courier_event', {
    orderId: order.orderId,
    trackingToken: order.trackingToken,
    current,
    trackingNumber: number,
  });
  if (!posted.ok) {
    return {
      success: true,
      update: {
        courierStep: current,
        trackingNumber: number,
        statusNote: '',
        statusUpdatedAt: new Date().toISOString(),
        courierBound: true,
      },
    };
  }
  return parseCourierUpdate(posted.payload);
}

export async function reportCourierPickup(order, trackingNumber) {
  return reportCourierStep(order, { current: 'transit', trackingNumber });
}

export async function lookupCourierTracking(orders, { signal } = {}) {
  const trackable = (orders || []).filter((order) => order?.orderId && order?.trackingToken);
  if (trackable.length === 0) return { success: true, updates: [] };
  const posted = await postCourierEvent('order.courier_track', {
    orders: trackable.map((order) => ({
      orderId: order.orderId,
      trackingToken: order.trackingToken,
    })),
  }, { signal });
  if (!posted.ok) return { success: false, updates: [], error: posted.error };
  const payload = posted.payload || {};
  const resultMap = payload.batch ? (payload.results || {}) : { [trackable[0].orderId]: payload };
  const updates = [];
  let error = '';
  trackable.forEach((order) => {
    const parsed = parseCourierUpdate(resultMap[order.orderId]);
    if (parsed.success) updates.push({ orderId: order.orderId, result: parsed });
    else if (!error) error = parsed.error;
  });
  return {
    success: updates.length > 0,
    updates,
    error: updates.length > 0 ? '' : (error || 'Courier tracking is temporarily unavailable'),
  };
}

export async function dispatchOrderSubmitted(order, { attempts = 4 } = {}) {
  const cloudOrder = orderWithoutPhotos(order);
  let last = { success: false };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await dispatchBackendN8NEvent('order.submitted', cloudOrder);
    if (last.success) return last;
    await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
  }
  return last;
}
