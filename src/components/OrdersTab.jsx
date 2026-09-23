import React, { useState } from 'react';
import {
  CheckCircle2, MapPin, ChevronDown, ChevronUp, Home,
  ShoppingBag, RefreshCw, Wifi, WifiOff, CreditCard, AlertCircle, StickyNote, Package, Cog
} from 'lucide-react';
import { normalizeSheetStatus, getSheetStatuses } from '../services/n8nService';
import { useI18n, translateSheetStatus } from '../services/i18n.jsx';
import { catalogPhotoFor } from '../services/catalogImages';

const SHEET_STATUS_STEPS = [
  { id: 'placed',     label: 'Order Placed',            icon: ShoppingBag,  descKey: 'track.placedDesc' },
  { id: 'confirmed',  label: 'Confirmed',               icon: CheckCircle2, descKey: 'track.confirmedDesc' },
  { id: 'pickup',     label: 'Order Pickup',            icon: Package,      descKey: 'track.pickupDesc' },
  { id: 'processing', label: 'Order Processing',        icon: Cog,          descKey: 'track.processingDesc' },
  { id: 'delivered',  label: 'Delivered to your home',  icon: Home,         descKey: 'track.deliveredDesc' },
];

const PAYMENT_META = {
  Pending:   { label: 'Pending',   className: 'pending' },
  Verifying: { label: 'Verifying', className: 'verifying' },
  Paid:      { label: 'Paid',      className: 'paid' },
  Failed:    { label: 'Failed',    className: 'failed' },
};

function sheetStatusIndex(order) {
  const status = normalizeSheetStatus(order.deliveryStatus) || 'Order Placed';
  const index = SHEET_STATUS_STEPS.findIndex((step) => step.label === status);
  return index >= 0 ? index : 0;
}

function formatStatusTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function OrderCard({ order, isExpanded, onToggle, catalog }) {
  const { t, money } = useI18n();
  const statusIndex = sheetStatusIndex(order);
  const currentStatus = SHEET_STATUS_STEPS[statusIndex];
  const StatusIcon = currentStatus.icon;
  const paymentMeta = PAYMENT_META[order.paymentStatus] || PAYMENT_META.Pending;
  const statusTime = formatStatusTime(order.statusUpdatedAt);
  const isLegacy = !order.trackingToken;
  const statusLabel = translateSheetStatus(t, currentStatus.label);
  const payLabel = t(`payStatus.${order.paymentStatus || 'Pending'}`);

  return (
    <div className={`order-card ${isExpanded ? 'expanded' : ''} status-${currentStatus.id}`}>
      <button className="order-card-header" onClick={onToggle}>
        <div className="order-card-left">
          <div className="order-header-pills">
            <span className={`order-status-badge ${currentStatus.id}`}>
              <StatusIcon size={12} />
              <span>{statusLabel}</span>
            </span>
            <span className={`payment-status-pill ${paymentMeta.className}`}>{payLabel}</span>
          </div>
          <div className="order-card-id">{order.orderId}</div>
          <div className="order-card-meta">
            {order.items.length > 1 ? t('orders.itemsMany', { n: order.items.length }) : t('orders.items', { n: order.items.length })} · {money(order.total)}
          </div>
        </div>
        <div className="order-card-right">
          {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
        </div>
      </button>

      {isExpanded && (
        <div className="order-tracker-body">
          {isLegacy && (
            <div className="tracking-legacy-note">
              <AlertCircle size={13} />
              <span>{t('orders.legacy')}</span>
            </div>
          )}

          <div className="order-items-thumbs">
            {order.items.map((item) => (
              <img key={item.id} src={catalogPhotoFor(item, catalog)} alt={item.name} className="order-thumb" title={item.name} />
            ))}
          </div>

          <div className="sheet-field-label">{t('orders.status')}</div>
          <div className="tracker-stepper sheet-status-steps">
            {SHEET_STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < statusIndex;
              const isCurrent = idx === statusIndex;
              const isPending = idx > statusIndex;
              return (
                <div key={step.id} className="tracker-step">
                  {idx > 0 && (
                    <div className={`tracker-line ${isDone || isCurrent ? 'done' : ''}`} />
                  )}
                  <div className={`tracker-dot ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}>
                    {isDone ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                  </div>
                  <div className="tracker-step-info">
                    <span className={`tracker-step-label ${isCurrent ? 'active' : ''} ${isPending ? 'muted' : ''}`}>
                      {translateSheetStatus(t, step.label)}
                    </span>
                    {isCurrent && (
                      <>
                        <span className="tracker-step-desc">{order.statusNote || t(step.descKey)}</span>
                        {statusTime && <span className="tracker-step-time">{t('orders.updated', { time: statusTime })}</span>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sheet-note-card">
            <div className="sheet-field-label">
              <StickyNote size={11} /> {t('orders.note')}
            </div>
            <p>{order.statusNote || t(currentStatus.descKey)}</p>
          </div>

          <div className="order-payment-row">
            <CreditCard size={12} />
            <div className="order-payment-copy">
              <div>
                <div className="sheet-field-label" style={{ margin: 0 }}>{t('orders.payStatus')}</div>
                <span className="order-payment-label">{order.payment?.label || t('checkout.payment')}</span>
              </div>
              <span className={`payment-status-pill ${paymentMeta.className}`}>{payLabel}</span>
            </div>
          </div>

          <div className="order-address-row">
            <MapPin size={12} color="#818cf8" />
            <span>
              {[
                order.address?.street,
                order.address?.township || order.address?.city,
                order.address?.regionState || order.address?.zip,
                order.address?.regionState ? 'Myanmar' : order.address?.country,
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrdersTab({ orders, trackingSync, onRefreshTracking, catalog, sheetOwner = false }) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState(orders[0]?.orderId || null);
  const syncState = trackingSync || { status: 'idle', lastChecked: null, error: '' };
  const statusLine = getSheetStatuses().map((status) => translateSheetStatus(t, status)).join(' · ');

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <ShoppingBag size={44} color="#1e293b" />
        <div className="orders-empty-title">{t('orders.empty')}</div>
        <div className="orders-empty-sub">{t('orders.emptySub')}</div>
      </div>
    );
  }

  return (
    <div className="orders-tab">
      <div className="orders-tab-header">
        <div>
          <span className="orders-tab-title">{t('orders.title')}</span>
          <span className="orders-domestic-label">{sheetOwner ? t('orders.sheetLabel') : t('orders.viewerLabel')} · {statusLine}</span>
        </div>
        <span className="orders-count-tag">{orders.length === 1 ? t('orders.count', { n: orders.length }) : t('orders.counts', { n: orders.length })}</span>
      </div>

      <div className={`tracking-sync-bar ${syncState.status}`} aria-live="polite">
        <div className="tracking-sync-copy">
          {syncState.status === 'error' ? <WifiOff size={13} /> : <Wifi size={13} />}
          <div>
            <strong>
              {syncState.status === 'refreshing' ? t(sheetOwner ? 'orders.refreshing' : 'orders.viewerRefreshing')
                : syncState.status === 'online' ? t(sheetOwner ? 'orders.online' : 'orders.viewerOnline')
                : syncState.status === 'error' ? t('orders.error')
                : t(sheetOwner ? 'orders.waiting' : 'orders.viewerWaiting')}
            </strong>
            <span>
              {syncState.error || (syncState.lastChecked
                ? t('orders.auto', { time: syncState.lastChecked.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) })
                : t(sheetOwner ? 'orders.staff' : 'orders.viewerHint'))}
            </span>
          </div>
        </div>
        <button
          className="tracking-refresh-btn"
          onClick={onRefreshTracking}
          disabled={syncState.status === 'refreshing'}
          aria-label="Refresh tracking status"
        >
          <RefreshCw size={14} className={syncState.status === 'refreshing' ? 'spinning' : ''} />
        </button>
      </div>

      <div className="orders-list">
        {orders.map((order) => (
          <OrderCard
            key={order.orderId}
            order={order}
            catalog={catalog}
            isExpanded={expandedId === order.orderId}
            onToggle={() => setExpandedId(expandedId === order.orderId ? null : order.orderId)}
          />
        ))}
      </div>
    </div>
  );
}
