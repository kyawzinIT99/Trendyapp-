import React, { useState } from 'react';
import { ArrowLeft, Truck, Tag, Shield, Check, MapPin } from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';

const NATIONWIDE = {
  id: 'standard',
  label: 'Myanmar Nationwide',
  eta: '3–7 business days',
  price: 8000,
  note: 'Available in all states and regions',
};

const MYANMAR_REGIONS = [
  'Ayeyarwady Region', 'Bago Region', 'Chin State', 'Kachin State',
  'Kayah State', 'Kayin State', 'Magway Region', 'Mandalay Region',
  'Mon State', 'Nay Pyi Taw Union Territory', 'Rakhine State',
  'Sagaing Region', 'Shan State', 'Tanintharyi Region', 'Yangon Region',
];

const EMPTY_GUEST = {
  name: '',
  email: '',
  phone: '',
  street: '',
  township: '',
  regionState: '',
};

function guestFieldError(details, t) {
  if (!details.name.trim()) return { field: 'name', message: t('err.name') };
  if (!details.email.trim()) return { field: 'email', message: t('err.email') };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) {
    return { field: 'email', message: t('err.emailInvalid') };
  }
  if (!details.phone.trim()) return { field: 'phone', message: t('err.phone') };
  const phoneDigits = details.phone.replace(/[^\d+]/g, '');
  if (!/^(?:\+?95|0)9\d{7,9}$/.test(phoneDigits)) {
    return { field: 'phone', message: t('err.phoneInvalid') };
  }
  if (!details.street.trim()) return { field: 'street', message: t('err.street') };
  if (!details.township.trim()) return { field: 'township', message: t('err.township') };
  if (!details.regionState) return { field: 'regionState', message: t('err.region') };
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
  const [details, setDetails] = useState(EMPTY_GUEST);
  const [invalidField, setInvalidField] = useState('');
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [stepError, setStepError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const setField = (key, value) => {
    setInvalidField('');
    setStepError(null);
    setDetails((current) => ({ ...current, [key]: value }));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = NATIONWIDE.price;
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + deliveryFee - discount;

  const handleApplyPromo = () => {
    if (promo.trim().toUpperCase() === 'TRENDY10') {
      setPromoApplied(true);
      setPromo('TRENDY10');
      setStepError(null);
    } else {
      setStepError(t('err.promo'));
    }
  };

  const handlePlaceOrder = async () => {
    const problem = guestFieldError(details, t);
    if (problem) {
      setInvalidField(problem.field);
      setStepError(problem.message);
      return;
    }
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsProcessing(false);
    const { orderId, trackingToken, placedAt } = createOrderIdentity();
    onConfirmOrder({
      orderId,
      trackingToken,
      guest: true,
      items: cartItems,
      delivery: NATIONWIDE,
      payment: { id: 'guest', label: t('checkout.guestPay') },
      address: {
        name: details.name.trim(),
        email: details.email.trim(),
        phone: details.phone.replace(/[^\d+]/g, ''),
        street: details.street.trim(),
        township: details.township.trim(),
        regionState: details.regionState,
        country: 'Myanmar',
      },
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
      <div className="checkout-header">
        <button className="checkout-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={18} />
        </button>
        <span className="checkout-title">{t('checkout.title')}</span>
        <span className="checkout-step-label">{t('checkout.guestTitle')}</span>
      </div>

      {stepError && (
        <div className="checkout-error-banner">
          <span>{stepError}</span>
        </div>
      )}

      <div className="checkout-body">
        <div className="checkout-section">
          <div className="myanmar-delivery-note">
            <span className="myanmar-flag" aria-hidden="true">🇲🇲</span>
            <div>
              <strong>{t('checkout.guestTitle')}</strong>
              <span>{t('checkout.guestBody')}</span>
            </div>
          </div>

          <div className="address-card">
            {[
              { key: 'name', label: t('checkout.name'), placeholder: t('checkout.namePh') },
              { key: 'email', label: t('checkout.email'), placeholder: t('checkout.emailPh') },
              { key: 'phone', label: t('checkout.phone'), placeholder: '09 123 456 789' },
              { key: 'street', label: t('checkout.street'), placeholder: t('checkout.streetPh') },
              { key: 'township', label: t('checkout.township'), placeholder: t('checkout.townshipPh') },
            ].map((field) => (
              <div className="address-field-row" key={field.key}>
                <label>{field.label}</label>
                <input
                  value={details[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => setField(field.key, event.target.value)}
                  className={invalidField === field.key ? 'field-error' : ''}
                  autoComplete="off"
                />
              </div>
            ))}
            <div className="address-field-row">
              <label>{t('checkout.region')}</label>
              <select
                value={details.regionState}
                onChange={(event) => setField('regionState', event.target.value)}
                className={invalidField === 'regionState' ? 'field-error' : ''}
              >
                <option value="">{t('checkout.regionPh')}</option>
                {MYANMAR_REGIONS.map((region) => (
                  <option key={region} value={region}>{t(`region.${region}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="checkout-section-title">
            <Truck size={15} color="#818cf8" /> {t('checkout.delivTitle')}
          </div>
          <div className="delivery-option-card selected">
            <div className="delivery-option-icon"><Truck size={18} /></div>
            <div className="delivery-option-info">
              <div className="delivery-option-name">{t('deliv.standard.label')}</div>
              <div className="delivery-option-eta">{t('deliv.standard.eta')}</div>
              <div className="delivery-option-note">{t('checkout.guestDeliver')}</div>
            </div>
            <div className="delivery-option-price">+{money(deliveryFee)}</div>
            <div className="delivery-radio on"><Check size={10} /></div>
          </div>

          <div className="checkout-section-title" style={{ marginTop: 18 }}>
            <Tag size={15} color="#818cf8" /> {t('checkout.promo')}
          </div>
          <div className="promo-row">
            <input
              className="promo-input"
              placeholder={t('checkout.promoPh')}
              value={promo}
              onChange={(event) => setPromo(event.target.value.toUpperCase())}
              disabled={promoApplied}
            />
            <button
              className={`promo-apply-btn ${promoApplied ? 'applied' : ''}`}
              onClick={handleApplyPromo}
              disabled={promoApplied}
              type="button"
            >
              {promoApplied ? <Check size={13} /> : t('checkout.apply')}
            </button>
          </div>
          {promoApplied && <div className="promo-success-tag">{t('checkout.promoOk')}</div>}

          <div className="checkout-section-title" style={{ marginTop: 18 }}>{t('checkout.summary')}</div>
          <div className="review-items-list">
            {cartItems.map((item) => (
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

          <div className="review-address-card">
            <div className="review-address-label"><MapPin size={12} /> {t('checkout.deliverTo')}</div>
            <div className="review-address-value">
              {[
                details.name.trim(),
                details.email.trim(),
                details.phone.trim(),
                details.street.trim(),
                details.township.trim(),
                details.regionState ? (t(`region.${details.regionState}`) || details.regionState) : '',
                t('checkout.countryVal'),
              ].filter(Boolean).join(' · ') || t('checkout.guestBody')}
            </div>
          </div>

          <div className="checkout-totals">
            <div className="total-row"><span>{t('checkout.subtotal')}</span><span>{money(subtotal)}</span></div>
            <div className="total-row">
              <span>{t('checkout.deliveryRow', { label: t('deliv.standard.label') })}</span>
              <span>+{money(deliveryFee)}</span>
            </div>
            {discount > 0 && (
              <div className="total-row discount"><span>{t('checkout.promoRow')}</span><span>−{money(discount)}</span></div>
            )}
            <div className="total-row grand"><span>{t('checkout.total')}</span><span>{money(total)}</span></div>
          </div>
        </div>
      </div>

      <div className="checkout-footer">
        <button className="checkout-prev-btn" onClick={onBack} type="button">
          <ArrowLeft size={14} /> {t('checkout.back')}
        </button>
        <button
          className={`checkout-place-btn ${isProcessing ? 'loading' : ''}`}
          onClick={handlePlaceOrder}
          disabled={isProcessing || cartItems.length === 0}
          type="button"
        >
          {isProcessing
            ? <><span className="checkout-spinner" /> {t('checkout.processing')}</>
            : <><Shield size={14} /> {t('checkout.place', { total: money(total) })}</>
          }
        </button>
      </div>
    </div>
  );
}
