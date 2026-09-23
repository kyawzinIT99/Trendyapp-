import React, { useState } from 'react';
import {
  ArrowLeft, MapPin, Truck, CreditCard, Tag, Shield,
  ChevronRight, Check, Zap, Banknote, Smartphone, AlertCircle, Lock, Eye, EyeOff
} from 'lucide-react';
import { getPaymentSettings } from '../services/paymentSettings';

import { useI18n } from '../services/i18n.jsx';

const DELIVERY_OPTIONS = [
  {
    id: 'standard', label: 'Myanmar Nationwide', eta: '3–7 business days',
    price: 8000, icon: Truck, note: 'Available in all states and regions',
  },
  {
    id: 'express', label: 'City Express', eta: '1–2 business days',
    price: 15000, icon: Zap, note: 'Yangon, Mandalay and Nay Pyi Taw only',
    regions: ['Yangon Region', 'Mandalay Region', 'Nay Pyi Taw Union Territory'],
  },
  {
    id: 'instant', label: 'Yangon Same-Day', eta: 'Availability confirmed after order',
    price: 25000, icon: Smartphone, note: 'Selected Yangon townships only',
    regions: ['Yangon Region'],
  },
];

const MYANMAR_REGIONS = [
  'Ayeyarwady Region', 'Bago Region', 'Chin State', 'Kachin State',
  'Kayah State', 'Kayin State', 'Magway Region', 'Mandalay Region',
  'Mon State', 'Nay Pyi Taw Union Territory', 'Rakhine State',
  'Sagaing Region', 'Shan State', 'Tanintharyi Region', 'Yangon Region',
];

const PAYMENT_METHODS = [
  { id: 'mpu',      label: 'MPU (Myanmar Payment)', sub: 'Myanmar Payment Union card', icon: CreditCard, badge: 'Local' },
  { id: 'card',     label: 'Credit / Debit Card',   sub: 'Visa · Mastercard · Amex',  icon: CreditCard },
  { id: 'transfer', label: 'Bank Transfer',          sub: 'All local banks supported', icon: Banknote },
  { id: 'ewallet',  label: 'e-Wallet / QR Pay',     sub: 'GoPay · OVO · PromptPay',  icon: Smartphone },
];

const STEPS = [
  { id: 1, label: 'Address' },
  { id: 2, label: 'Delivery' },
  { id: 3, label: 'Payment' },
  { id: 4, label: 'Review' },
];

// ── Per-step validation ──────────────────────────────────────────────────────
function validateStep(step, { address, delivery, payment, cardDetails }, t) {
  if (step === 1) {
    if (!address.name.trim())   return t('err.name');
    if (!address.phone.trim())  return t('err.phone');
    const phoneDigits = address.phone.replace(/[^\d+]/g, '');
    if (!/^(?:\+?95|0)9\d{7,9}$/.test(phoneDigits)) {
      return t('err.phoneInvalid');
    }
    if (!address.street.trim()) return t('err.street');
    if (!address.township.trim()) return t('err.township');
    if (!address.regionState) return t('err.region');
    return null;
  }
  if (step === 2) {
    if (!delivery) return t('err.delivery');
    const selected = DELIVERY_OPTIONS.find(option => option.id === delivery);
    if (selected?.regions && !selected.regions.includes(address.regionState)) {
      return t('err.deliveryRegion', { label: t(`deliv.${selected.id}.label`), region: t(`region.${address.regionState}`) || address.regionState });
    }
    return null;
  }
  if (step === 3) {
    if (!payment) return t('err.payment');
    if (payment === 'card' || payment === 'mpu') {
      const raw = cardDetails.number.replace(/\s/g, '');
      if (raw.length < 16)              return t('err.cardNo');
      if (!cardDetails.name.trim())     return t('err.cardName');
      if (cardDetails.expiry.length < 5) return t('err.expiry');
      if (cardDetails.cvv.length < 3)   return t('err.cvv');
    }
    return null;
  }
  return null;
}

function createOrderIdentity() {
  const randomUUID = globalThis.crypto?.randomUUID?.();
  const randomDigits = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 900000
    : Math.floor(Math.random() * 900000);
  const fallbackToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return {
    orderId: `TRN-${String(100000 + randomDigits).padStart(6, '0')}`,
    trackingToken: `trk_${randomUUID ? randomUUID.replaceAll('-', '') : fallbackToken}`,
    placedAt: new Date().toISOString(),
  };
}

export function CheckoutScreen({ cartItems, onBack, onConfirmOrder }) {
  const { t, money } = useI18n();
  const [step, setStep]               = useState(1);
  const [delivery, setDelivery]       = useState('standard');
  const [payment, setPayment]         = useState(null);
  const [promo, setPromo]             = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [stepError, setStepError]     = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCVV, setShowCVV]         = useState(false);

  // Read payment settings from admin panel (localStorage)
  const pmSettings = getPaymentSettings();

  // Card detail fields (used when payment = 'card' or 'mpu')
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name:   '',
    expiry: '',
    cvv:    '',
  });

  const [address, setAddress] = useState({
    name:   '',
    phone:  '',
    street: '',
    township: '',
    regionState: '',
    country: 'Myanmar',
  });

  const subtotal    = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = DELIVERY_OPTIONS.find(d => d.id === delivery)?.price ?? 8000;
  const discount    = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total       = subtotal + deliveryFee - discount;

  // ── Navigation with gate ─────────────────────────────────────────────────
  const handleNext = () => {
    const error = validateStep(step, { address, delivery, payment, cardDetails }, t);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStep(s => s + 1);
  };

  // Format card number with spaces every 4 digits
  const handleCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardDetails(d => ({ ...d, number: formatted }));
    setStepError(null);
  };

  // Format expiry MM/YY
  const handleExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? digits.slice(0,2) + '/' + digits.slice(2) : digits;
    setCardDetails(d => ({ ...d, expiry: formatted }));
    setStepError(null);
  };

  const handleBack = () => {
    setStepError(null);
    if (step === 1) {
      onBack();
    } else {
      setStep(s => s - 1);
    }
  };

  const handleApplyPromo = () => {
    if (promo.trim().toUpperCase() === 'TRENDY10') {
      setPromoApplied(true);
      setPromo('TRENDY10');
    } else {
      setStepError(t('err.promo'));
      setTimeout(() => setStepError(null), 2500);
    }
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1800));
    setIsProcessing(false);
    const { orderId, trackingToken, placedAt } = createOrderIdentity();
    const selectedPayment = PAYMENT_METHODS.find(p => p.id === payment);
    onConfirmOrder({
      orderId,
      trackingToken,
      items: cartItems,
      delivery: DELIVERY_OPTIONS.find(d => d.id === delivery),
      payment:  selectedPayment,
      address,
      subtotal,
      deliveryFee,
      discount,
      total,
      placedAt,
      deliveryStatus: 'Order Placed',
      statusIndex: 0,
      paymentStatus: 'Pending',
      statusNote: 'Your order has been received.',
      statusUpdatedAt: placedAt,
    });
  };

  return (
    <div className="checkout-screen">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="checkout-header">
        <button className="checkout-back-btn" onClick={handleBack}>
          <ArrowLeft size={18} />
        </button>
        <span className="checkout-title">{t('checkout.title')}</span>
        <span className="checkout-step-label">{t('checkout.step', { n: step, total: STEPS.length })}</span>
      </div>

      {/* ── Step Progress Bar ────────────────────────────────── */}
      <div className="checkout-steps-bar">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`checkout-step-dot ${s.id < step ? 'done' : ''} ${s.id === step ? 'active' : ''}`}
          >
            <div className="step-dot-circle">
              {s.id < step ? <Check size={10} /> : <span>{s.id}</span>}
            </div>
            <span className="step-dot-label">{t(`checkout.${s.id === 1 ? 'address' : s.id === 2 ? 'delivery' : s.id === 3 ? 'payment' : 'review'}`)}</span>
          </div>
        ))}
        <div className="checkout-steps-line">
          <div className="checkout-steps-fill" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────── */}
      {stepError && (
        <div className="checkout-error-banner">
          <AlertCircle size={14} />
          <span>{stepError}</span>
        </div>
      )}

      {/* ── Step Content ─────────────────────────────────────── */}
      <div className="checkout-body">

        {/* Step 1 — Address */}
        {step === 1 && (
          <div className="checkout-section">
            <div className="checkout-section-title">
              <MapPin size={15} color="#818cf8" /> {t('checkout.addrTitle')}
            </div>
            <div className="myanmar-delivery-note">
              <span className="myanmar-flag" aria-hidden="true">🇲🇲</span>
              <div>
                <strong>{t('checkout.mmOnly')}</strong>
                <span>{t('checkout.mmOnlySub')}</span>
              </div>
            </div>
            <div className="address-card">
              {[
                { key: 'name',   label: t('checkout.name'),        placeholder: t('checkout.namePh') },
                { key: 'phone',  label: t('checkout.phone'),   placeholder: '09 123 456 789' },
                { key: 'street', label: t('checkout.street'),    placeholder: t('checkout.streetPh') },
              ].map(field => (
                <div className="address-field-row" key={field.key}>
                  <label>{field.label}</label>
                  <input
                    value={address[field.key]}
                    placeholder={field.placeholder}
                    onChange={e => { setStepError(null); setAddress({ ...address, [field.key]: e.target.value }); }}
                    className={stepError && !address[field.key].trim() ? 'field-error' : ''}
                  />
                </div>
              ))}
              <div className="address-field-row">
                  <label>{t('checkout.township')}</label>
                  <input
                    value={address.township}
                    placeholder={t('checkout.townshipPh')}
                    onChange={e => { setStepError(null); setAddress({ ...address, township: e.target.value }); }}
                    className={stepError && !address.township.trim() ? 'field-error' : ''}
                  />
                </div>
              <div className="address-field-row">
                <label>{t('checkout.region')}</label>
                <select
                  value={address.regionState}
                  onChange={e => { setStepError(null); setAddress({ ...address, regionState: e.target.value }); }}
                  className={stepError && !address.regionState ? 'field-error' : ''}
                >
                  <option value="">{t('checkout.regionPh')}</option>
                  {MYANMAR_REGIONS.map(region => <option key={region} value={region}>{t(`region.${region}`)}</option>)}
                </select>
              </div>
              <div className="address-field-row">
                <label>{t('checkout.country')}</label>
                <div className="country-lock-field">
                  <span>{t('checkout.countryVal')}</span>
                  <Lock size={12} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Delivery + Promo */}
        {step === 2 && (
          <div className="checkout-section">
            <div className="checkout-section-title">
              <Truck size={15} color="#818cf8" /> {t('checkout.delivTitle')}
            </div>
            {DELIVERY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  className={`delivery-option-card ${delivery === opt.id ? 'selected' : ''}`}
                  onClick={() => { setDelivery(opt.id); setStepError(null); }}
                >
                  <div className="delivery-option-icon"><Icon size={18} /></div>
                  <div className="delivery-option-info">
                    <div className="delivery-option-name">{t(`deliv.${opt.id}.label`)}</div>
                    <div className="delivery-option-eta">{t(`deliv.${opt.id}.eta`)}</div>
                    <div className="delivery-option-note">{t(`deliv.${opt.id}.note`)}</div>
                  </div>
                  <div className="delivery-option-price">+{money(opt.price)}</div>
                  <div className={`delivery-radio ${delivery === opt.id ? 'on' : ''}`}>
                    {delivery === opt.id && <Check size={10} />}
                  </div>
                </button>
              );
            })}

            <div className="checkout-section-title" style={{ marginTop: 18 }}>
              <Tag size={15} color="#818cf8" /> {t('checkout.promo')}
            </div>
            <div className="promo-row">
              <input
                className="promo-input"
                placeholder={t('checkout.promoPh')}
                value={promo}
                onChange={e => setPromo(e.target.value.toUpperCase())}
                disabled={promoApplied}
              />
              <button
                className={`promo-apply-btn ${promoApplied ? 'applied' : ''}`}
                onClick={handleApplyPromo}
                disabled={promoApplied}
              >
                {promoApplied ? <Check size={13} /> : t('checkout.apply')}
              </button>
            </div>
            {promoApplied && (
              <div className="promo-success-tag">{t('checkout.promoOk')}</div>
            )}
          </div>
        )}

        {/* Step 3 — Payment (REQUIRED — cannot skip) */}
        {step === 3 && (
          <div className="checkout-section">
            <div className="checkout-section-title">
              <CreditCard size={15} color="#818cf8" /> {t('checkout.payTitle')}
            </div>

            <div className="payment-required-note">
              <Shield size={12} color="#f59e0b" />
              <span>{t('checkout.payRequired')}</span>
            </div>

            {PAYMENT_METHODS.map(pm => {
              const Icon = pm.icon;
              const isSelected = payment === pm.id;
              return (
                <button
                  key={pm.id}
                  className={`delivery-option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => { setPayment(pm.id); setStepError(null); }}
                >
                  <div className={`delivery-option-icon ${pm.id === 'mpu' ? 'mpu-icon' : ''}`}>
                    <Icon size={18} />
                  </div>
                  <div className="delivery-option-info">
                    <div className="delivery-option-name">
                      {t(`pay.${pm.id}.label`)}
                      {pm.badge && <span className="pm-local-badge">{t('pay.local')}</span>}
                    </div>
                    <div className="delivery-option-eta">{t(`pay.${pm.id}.sub`)}</div>
                  </div>
                  <div className={`delivery-radio ${isSelected ? 'on' : ''}`}>
                    {isSelected && <Check size={10} />}
                  </div>
                </button>
              );
            })}

            {/* No selection warning */}
            {!payment && (
              <div className="payment-no-selection-warning">
                {t('checkout.payWarn')}
              </div>
            )}

            {/* ── Card entry form (card & MPU) ── */}
            {(payment === 'card' || payment === 'mpu') && (
              <div className="card-entry-form">
                <div className="card-entry-header">
                  <Lock size={13} />
                  <span>{payment === 'mpu' ? t('checkout.mpuCard') : t('checkout.cardDetails')}</span>
                </div>

                {/* Card number */}
                <div className="address-field-row">
                  <label>{t('checkout.cardNo')}</label>
                  <div className="card-number-wrapper">
                    <CreditCard size={15} className="card-input-icon" />
                    <input
                      className="card-input"
                      placeholder="1234 5678 9012 3456"
                      value={cardDetails.number}
                      onChange={e => handleCardNumber(e.target.value)}
                      maxLength={19}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Cardholder name */}
                <div className="address-field-row">
                  <label>{t('checkout.cardName')}</label>
                  <input
                    placeholder={t('checkout.cardNamePh')}
                    value={cardDetails.name}
                    onChange={e => { setCardDetails(d => ({...d, name: e.target.value})); setStepError(null); }}
                    autoCapitalize="words"
                  />
                </div>

                {/* Expiry + CVV row */}
                <div className="address-row-two">
                  <div className="address-field-row" style={{ flex: 1 }}>
                    <label>{t('checkout.expiry')}</label>
                    <input
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={e => handleExpiry(e.target.value)}
                      maxLength={5}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="address-field-row" style={{ flex: 1 }}>
                    <label>{t('checkout.cvv')}</label>
                    <div className="card-number-wrapper">
                      <input
                        className="card-input"
                        placeholder="•••"
                        type={showCVV ? 'text' : 'password'}
                        value={cardDetails.cvv}
                        onChange={e => { setCardDetails(d => ({...d, cvv: e.target.value.replace(/\D/g,'').slice(0,4)})); setStepError(null); }}
                        maxLength={4}
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="cvv-toggle-btn"
                        onClick={() => setShowCVV(v => !v)}
                      >
                        {showCVV ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-entry-note">
                  {t('checkout.cardNote')}
                </div>
              </div>
            )}

            {/* ── Bank transfer details (live from Admin Panel) ── */}
            {payment === 'transfer' && (
              <div className="bank-transfer-info">
                <div className="card-entry-header"><Banknote size={13}/><span>{t('checkout.bankTitle')}</span></div>
                <div className="bank-info-row"><span>{t('checkout.bankName')}</span><span>{pmSettings.bankName || 'SCB (Siam Commercial Bank)'}</span></div>
                <div className="bank-info-row"><span>{t('checkout.acctName')}</span><span>{pmSettings.accountName || 'Trendy Commerce Co.'}</span></div>
                <div className="bank-info-row">
                  <span>{t('checkout.acctNo')}</span>
                  <span className="bank-acct">{pmSettings.accountNo || '— Not set in Admin Panel —'}</span>
                </div>
                <div className="bank-info-note">{pmSettings.bankNote || 'Transfer your exact order total and send proof via the Orders tab.'}</div>
              </div>
            )}

            {/* ── e-Wallet QR — auto-generated from Admin Panel PromptPay ID ── */}
            {payment === 'ewallet' && (
              <div className="bank-transfer-info">
                <div className="card-entry-header"><Smartphone size={13}/><span>{t('checkout.scan')}</span></div>

                {pmSettings.promptPayId ? (
                  <div className="ewallet-qr-live">
                    {/* Real QR auto-generated from PromptPay ID via qrserver API */}
                    <div className="qr-image-wrapper">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pmSettings.promptPayId)}&size=140x140&margin=6&color=000000&bgcolor=ffffff`}
                        alt="PromptPay QR Code"
                        className="qr-live-img"
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                      />
                      <div className="qr-fallback" style={{ display: 'none' }}>QR</div>
                    </div>
                    <div className="ewallet-qr-details">
                      <div className="ewallet-qr-label">PromptPay / QR ID</div>
                      <div className="ewallet-qr-id">{pmSettings.promptPayId}</div>
                      <div className="ewallet-qr-note" style={{ marginTop: 6 }}>
                        {pmSettings.ewalletNote || 'Scan with GoPay · OVO · PromptPay · any banking app'}
                      </div>
                      <div className="ewallet-qr-apps">
                        <span>GoPay</span><span>OVO</span><span>PromptPay</span><span>TrueMoney</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ewallet-qr-placeholder">
                    <div className="qr-box-empty">
                      <Smartphone size={22} style={{ opacity: 0.3 }} />
                    </div>
                    <div className="ewallet-qr-note" style={{ color: '#ef4444' }}>
                      ⚠ No QR ID configured.<br/>
                      Go to <strong>Admin Panel → Payment &amp; Bank</strong> and set your PromptPay ID to auto-generate the QR code.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="checkout-secure-note">
              <Shield size={13} color="#10b981" />
              <span>{t('checkout.secure')}</span>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <div className="checkout-section">
            <div className="checkout-section-title">{t('checkout.summary')}</div>

            {/* Items */}
            <div className="review-items-list">
              {cartItems.map(item => (
                <div key={item.id} className="review-item-row">
                  <img src={item.image} alt={item.name} className="review-item-img" />
                  <div className="review-item-info">
                    <div className="review-item-name">{item.name}</div>
                    <div className="review-item-qty">{t('checkout.qty', { n: item.quantity })}</div>
                  </div>
                  <div className="review-item-price">{money(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            {/* Address summary */}
            <div className="review-address-card">
              <div className="review-address-label"><MapPin size={12} /> {t('checkout.deliverTo')}</div>
              <div className="review-address-value">
                {address.name} · {address.street}, {address.township}, {t(`region.${address.regionState}`) || address.regionState}, {t('checkout.countryVal')}
              </div>
            </div>

            {/* Payment method summary */}
            <div className="review-payment-card">
              <div className="review-address-label"><CreditCard size={12} /> {t('checkout.payVia')}</div>
              <div className="review-address-value">
                {t(`pay.${payment}.label`)}
              </div>
            </div>

            {/* Totals */}
            <div className="checkout-totals">
              <div className="total-row"><span>{t('checkout.subtotal')}</span><span>{money(subtotal)}</span></div>
              <div className="total-row">
                <span>{t('checkout.deliveryRow', { label: t(`deliv.${delivery}.label`) })}</span>
                <span>+{money(deliveryFee)}</span>
              </div>
              {discount > 0 && (
                <div className="total-row discount"><span>{t('checkout.promoRow')}</span><span>−{money(discount)}</span></div>
              )}
              <div className="total-row grand"><span>{t('checkout.total')}</span><span>{money(total)}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="checkout-footer">
        <button className="checkout-prev-btn" onClick={handleBack}>
          <ArrowLeft size={14} /> {t('checkout.back')}
        </button>

        {step < 4 ? (
          <button
            className={`checkout-next-btn ${step === 3 && !payment ? 'disabled-look' : ''}`}
            onClick={handleNext}
          >
            {step === 3 ? t('checkout.reviewOrder') : t('checkout.continue')} <ChevronRight size={15} />
          </button>
        ) : (
          <button
            className={`checkout-place-btn ${isProcessing ? 'loading' : ''}`}
            onClick={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing
              ? <><span className="checkout-spinner" /> {t('checkout.processing')}</>
              : <><Shield size={14} /> {t('checkout.place', { total: money(total) })}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
