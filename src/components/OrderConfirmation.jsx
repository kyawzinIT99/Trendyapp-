import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Package, ArrowRight, Copy, Star, ShoppingBag, Clock3
} from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';

export function OrderConfirmation({ order, onTrackOrder, onContinueShopping }) {
  const { t, money } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = () => {
    navigator.clipboard?.writeText(order.orderId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="order-confirm-screen">
      {/* Animated success orb */}
      <div className="confirm-orb-wrapper">
        <div className="confirm-orb">
          <CheckCircle2 size={44} color="#10b981" strokeWidth={1.5} />
        </div>
        <div className="confirm-orb-ring ring-1" />
        <div className="confirm-orb-ring ring-2" />
        <div className="confirm-orb-ring ring-3" />
      </div>

      <div className={`confirm-content ${showContent ? 'visible' : ''}`}>
        <h2 className="confirm-title">{t('confirm.title')}</h2>
        <p className="confirm-subtitle">
          {t('confirm.sub')}
        </p>

        <div className="confirm-pending-note">
          <Clock3 size={13} />
          <span>{t('confirm.pending')}</span>
        </div>

        <div className="confirm-order-id-row">
          <span className="confirm-order-label">{t('confirm.orderId')}</span>
          <div className="confirm-order-id">
            <span>{order.orderId}</span>
            <button className="copy-id-btn" onClick={handleCopy} title="Copy order ID">
              {copied ? <CheckCircle2 size={12} color="#10b981" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Order summary chips */}
        <div className="confirm-chips-row">
          <div className="confirm-chip">
            <ShoppingBag size={12} />
            <span>{t('confirm.items', { n: order.items.reduce((s, i) => s + i.quantity, 0) })}</span>
          </div>
          <div className="confirm-chip">
            <Package size={12} />
            <span>{order.delivery?.label || t('deliv.standard.label')}</span>
          </div>
          <div className="confirm-chip highlight">
            <Star size={12} fill="currentColor" />
            <span>{t('confirm.total', { total: money(order.total) })}</span>
          </div>
        </div>

        {/* ETA banner */}
        <div className="confirm-eta-banner">
          <div className="eta-icon">🚚</div>
          <div>
            <div className="eta-title">{t('confirm.eta')}</div>
            <div className="eta-value">{order.delivery?.eta || '3–5 business days'}</div>
          </div>
        </div>

        {/* CTA buttons */}
        <button className="confirm-track-btn" onClick={onTrackOrder}>
          <Package size={15} />
          <span>{t('confirm.track')}</span>
          <ArrowRight size={14} />
        </button>

        <button className="confirm-continue-btn" onClick={onContinueShopping}>
          {t('confirm.continue')}
        </button>
      </div>
    </div>
  );
}
