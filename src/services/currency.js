// Myanmar Kyat — storefront, checkout, admin, and sheet totals.

export const CURRENCY_CODE = 'MMK';
export const CURRENCY_FLAG_KEY = 'trendy_currency';
export const USD_TO_MMK = 3500;

const MM_DIGITS = '၀၁၂၃၄၅၆၇၈၉';

export function looksLikeUsd(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n < 5000;
}

export function toMmk(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (!looksLikeUsd(n)) return Math.round(n);
  return Math.round((n * USD_TO_MMK) / 1000) * 1000;
}

export function formatMmk(amount, lang = 'en') {
  const n = Math.round(Number(amount) || 0);
  const grouped = n.toLocaleString('en-US');
  if (lang === 'my') {
    return `${grouped.replace(/\d/g, (d) => MM_DIGITS[d])} ကျပ်`;
  }
  return `Ks ${grouped}`;
}

function migrateItemMoney(item) {
  if (!item || typeof item !== 'object') return item;
  const next = { ...item };
  if (looksLikeUsd(next.price)) next.price = toMmk(next.price);
  else if (Number.isFinite(Number(next.price))) next.price = Math.round(Number(next.price));
  if (next.original_price != null && next.original_price !== '') {
    next.original_price = looksLikeUsd(next.original_price)
      ? toMmk(next.original_price)
      : Math.round(Number(next.original_price));
  }
  return next;
}

function migrateOrderMoney(order) {
  if (!order || typeof order !== 'object') return order;
  const next = { ...order };
  ['total', 'subtotal', 'deliveryFee', 'discount'].forEach((key) => {
    if (looksLikeUsd(next[key])) next[key] = toMmk(next[key]);
  });
  if (Array.isArray(next.items)) next.items = next.items.map(migrateItemMoney);
  if (next.delivery && looksLikeUsd(next.delivery.price)) {
    next.delivery = { ...next.delivery, price: toMmk(next.delivery.price) };
  }
  return next;
}

export function migrateCatalogToMmk(items) {
  if (!Array.isArray(items)) return items;
  return items.map(migrateItemMoney);
}

export function migrateCartToMmk(cart) {
  if (!Array.isArray(cart)) return cart;
  return cart.map(migrateItemMoney);
}

export function migrateOrdersToMmk(orders) {
  if (!Array.isArray(orders)) return orders;
  return orders.map(migrateOrderMoney);
}

export function currencyAlreadyMmk() {
  try {
    return localStorage.getItem(CURRENCY_FLAG_KEY) === 'MMK';
  } catch {
    return false;
  }
}

export function markCurrencyMmk() {
  try { localStorage.setItem(CURRENCY_FLAG_KEY, 'MMK'); } catch { /* ignore */ }
}
