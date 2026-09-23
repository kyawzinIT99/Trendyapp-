// Staff roles. The Google Sheet Users tab is the intended source of truth.
// Until that tab is connected through n8n, this device keeps the same columns.

export const ROLE_OWNER = 'Business Owner';
export const ROLE_KEEPER = 'Shop Keeper';

const ACCOUNTS_KEY = 'trendy_staff_accounts';

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export function listStaffAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function saveStaffAccounts(rows) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(rows));
}

export function isBusinessOwner(user) {
  return user?.role === ROLE_OWNER && user?.active !== 'No';
}

const BACKEND_OWNER_EMAIL = 'kyawzin.ccna@gmail.com';

/** Only this account may revise the backend automation settings. */
export function canReviseBackend(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  const name = String(user?.name || '').replace(/\s+/g, '').toLowerCase();
  return email === BACKEND_OWNER_EMAIL && name === 'kyawzin';
}

export function roleFromSheet(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (text.includes('owner') || text.includes('ပိုင်')) return ROLE_OWNER;
  if (text.includes('keeper') || text.includes('shop') || text.includes('ထိန်း')) return ROLE_KEEPER;
  return '';
}

export function userFromSheetRow(row) {
  const role = roleFromSheet(row?.role);
  if (!role) return null;
  const active = String(row?.active || 'Yes').trim();
  return toUser({
    name: String(row.name || '').trim() || 'Staff',
    phone: digitsOnly(row.phone),
    email: String(row.email || '').trim(),
    role,
    active: /^no|false|off|inactive$/i.test(active) ? 'No' : 'Yes',
  });
}

function toUser(row) {
  return {
    id: `staff_${digitsOnly(row.phone)}`,
    name: row.name,
    email: String(row.email || '').trim(),
    phone: row.phone,
    picture: null,
    role: row.role,
    active: row.active || 'Yes',
    signedInAt: new Date().toISOString(),
  };
}

/**
 * Register or resume a staff account.
 * Any number of business owners can register.
 * An existing phone keeps the role already stored, unless this sign-in is the owner.
 */
export function registerStaffAccount({ name, phone, email, role }) {
  const cleanName = String(name || '').trim();
  const cleanPhone = digitsOnly(phone);
  const wanted = role === ROLE_OWNER ? ROLE_OWNER : ROLE_KEEPER;

  if (cleanName.length < 2 || cleanPhone.length < 6) {
    return { error: 'invalid' };
  }

  const accounts = listStaffAccounts();
  const existing = accounts.find((row) => digitsOnly(row.phone) === cleanPhone);
  if (existing) {
    if (existing.active === 'No') return { error: 'inactive' };
    const nextEmail = String(email || '').trim();
    if (nextEmail && !String(existing.email || '').trim()) {
      existing.email = nextEmail;
      existing.updatedAt = new Date().toISOString();
      saveStaffAccounts(accounts);
    }
    if (wanted === ROLE_OWNER && existing.role !== ROLE_OWNER) {
      existing.role = ROLE_OWNER;
      existing.updatedAt = new Date().toISOString();
      saveStaffAccounts(accounts);
    }
    return { user: toUser(existing) };
  }

  const row = {
    name: cleanName,
    phone: cleanPhone,
    email: String(email || '').trim(),
    role: wanted,
    active: 'Yes',
    updatedAt: new Date().toISOString(),
  };
  accounts.push(row);
  saveStaffAccounts(accounts);
  return { user: toUser(row) };
}
