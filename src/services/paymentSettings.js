// ── Payment & Bank Settings Service ──────────────────────────────────────────
// Persists to localStorage. Both Admin Panel (write) and CheckoutScreen (read).

const STORAGE_KEY = 'trendy_payment_settings';

const DEFAULT_SETTINGS = {
  // Bank Transfer
  bankName:    'SCB (Siam Commercial Bank)',
  accountName: 'Trendy Commerce Co.',
  accountNo:   '',
  bankNote:    'Transfer your exact order total and send proof of payment via the Orders tab.',

  // MPU / Card gateway (display only — real gateway via n8n webhook)
  mpuMerchantId: '',
  mpuNote:       'Payments are processed securely via MPU Payment Union.',

  // e-Wallet / QR
  promptPayId:  '',
  ewalletNote:  'Scan the QR code with GoPay · OVO · PromptPay to complete payment.',

  // Store identity
  storeName:    'Trendy Commerce',
  supportEmail: '',
  supportPhone: '',
};

export function getPaymentSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (_) {}
  return { ...DEFAULT_SETTINGS };
}

export function savePaymentSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {}
}

export function resetPaymentSettings() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS };
}
