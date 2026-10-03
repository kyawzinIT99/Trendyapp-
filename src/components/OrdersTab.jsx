import React, { useState } from 'react';
import {
  CheckCircle2, MapPin, ChevronDown, ChevronUp, Home,
  ShoppingBag, RefreshCw, Wifi, WifiOff, CreditCard, AlertCircle, StickyNote, Package, Cog
} from 'lucide-react';
import { normalizeSheetStatus, getSheetStatuses } from '../services/n8nService';
import { useI18n, translateSheetStatus } from '../services/i18n.jsx';
import { catalogPhotoFor } from '../services/catalogImages';
import { courierTrailUrl } from '../services/courierOptions';

const SHEET_STATUS_STEPS = [
  { id: 'placed',     label: 'Order Placed',            icon: ShoppingBag,  descKey: 'track.placedDesc' },
  { id: 'confirmed',  label: 'Confirmed',               icon: CheckCircle2, descKey: 'track.confirmedDesc' },
  { id: 'pickup',     label: 'Order Pickup',            icon: Package,      descKey: 'track.pickupDesc' },
  { id: 'processing', label: 'Order Processing',        icon: Cog,          descKey: 'track.processingDesc' },
  { id: 'delivered',  label: 'Delivered to your home',  icon: Home,         descKey: 'track.deliveredDesc' },
];

const COURIER_STATUS_STEPS = [
  { id: 'placed',    icon: ShoppingBag, descKey: 'trail.placedDesc',    labelKey: 'trail.placed' },
  { id: 'booked',    icon: Package,     descKey: 'trail.bookedDesc',    labelKey: 'trail.booked' },
  { id: 'pickup',    icon: Package,     descKey: 'trail.pickupDesc',    labelKey: 'trail.pickup' },
  { id: 'transit',   icon: Cog,         descKey: 'trail.transitDesc',   labelKey: 'trail.transit' },
  { id: 'delivered', icon: Home,        descKey: 'trail.deliveredDesc', labelKey: 'trail.delivered' },
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

function courierStatusIndex(order) {
  const index = COURIER_STATUS_STEPS.findIndex((step) => step.id === (order.courierStep || 'booked'));
  return index >= 0 ? index : 1;
}

function orderUsesApi(list) {
  return list.length > 0 && list.every((order) => order.trackingMode === 'api');
}

function formatStatusTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function OrderCard({ order, isExpanded, onToggle, catalog, onSaveTrackingNumber, onChooseHandoff, onMarkHandoff }) {
  const { t, money } = useI18n();
  const [trackingDraft, setTrackingDraft] = useState(order.trackingNumber || '');
  const hired = order.trackingMode === 'api';
  const steps = hired ? COURIER_STATUS_STEPS : SHEET_STATUS_STEPS;
  const statusIndex = hired ? courierStatusIndex(order) : sheetStatusIndex(order);
  const currentStatus = steps[statusIndex];
  const StatusIcon = currentStatus.icon;
  const paymentMeta = PAYMENT_META[order.paymentStatus] || PAYMENT_META.Pending;
  const statusTime = formatStatusTime(order.statusUpdatedAt);
  const isLegacy = !order.trackingToken;
  const courierLabel = order.courierName || order.delivery?.label || '';
  const stepId = order.courierStep || 'booked';
  const waitingForHandoff = hired && !order.trackingNumber && stepId === 'booked';
  const waitingForNumber = hired && !order.trackingNumber && stepId === 'pickup';
  const handoffHint = order.handoff === 'dropoff'
    ? t('handoff.dropoffHint', { courier: courierLabel })
    : order.handoff === 'pickup'
      ? t('handoff.pickupHint', { courier: courierLabel })
      : t('handoff.choose');
  const trailUrl = courierTrailUrl(order.courierId || order.delivery?.id, order.trackingNumber);
  const statusLabel = hired
    ? t(currentStatus.labelKey, { courier: courierLabel })
    : translateSheetStatus(t, currentStatus.label);
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
          <div className={`tracker-stepper sheet-status-steps ${hired ? 'region-th' : 'region-mm'}`}>
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < statusIndex;
              const isCurrent = idx === statusIndex;
              const isPending = idx > statusIndex;
              const stepLabel = hired
                ? t(step.labelKey, { courier: courierLabel })
                : translateSheetStatus(t, step.label);
              const stepLine = hired
                ? t(step.descKey, { courier: courierLabel })
                : t(step.descKey);
              return (
                <div key={step.id} className={`tracker-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}>
                  <div className="tracker-rail">
                    <div className={`tracker-dot ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}>
                      {isDone ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`tracker-line ${idx < statusIndex ? 'done' : ''}`} />
                    )}
                  </div>
                  <div className="tracker-step-info">
                    <span className={`tracker-step-label ${isCurrent ? 'active' : ''} ${isPending ? 'muted' : ''}`}>
                      {stepLabel}
                    </span>
                    <span className="tracker-step-desc">{stepLine}</span>
                    {isCurrent && hired && order.trackingNumber && (
                      <span className="tracker-step-time">{t('trail.number', { number: order.trackingNumber })}</span>
                    )}
                    {isCurrent && statusTime && (
                      <span className="tracker-step-time">{t('orders.updated', { time: statusTime })}</span>
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
            <p>{waitingForHandoff ? handoffHint : waitingForNumber ? t('handoff.withCourier', { courier: courierLabel }) : (order.statusNote || t(currentStatus.descKey, { courier: courierLabel }))}</p>
          </div>

          {waitingForHandoff && !order.handoff && (
            <div className="courier-handoff">
              <button type="button" onClick={() => onChooseHandoff?.(order, 'dropoff')}>{t('handoff.dropoff')}</button>
              <button type="button" onClick={() => onChooseHandoff?.(order, 'pickup')}>{t('handoff.pickup')}</button>
            </div>
          )}

          {waitingForHandoff && order.handoff && (
            <button
              type="button"
              className="courier-handoff-done"
              onClick={() => onMarkHandoff?.(order)}
            >
              {order.handoff === 'dropoff' ? t('handoff.dropped') : t('handoff.arrived')}
            </button>
          )}

          {hired && (order.handoff || waitingForNumber || order.trackingNumber) && (
            <form
              className="courier-number-form"
              onSubmit={(event) => {
                event.preventDefault();
                const number = trackingDraft.trim();
                if (!number || !onSaveTrackingNumber) return;
                onSaveTrackingNumber(order, number);
              }}
            >
              <label htmlFor={`track-${order.orderId}`}>{t('trail.numberLabel')}</label>
              <div className="courier-number-row">
                <input
                  id={`track-${order.orderId}`}
                  value={trackingDraft}
                  placeholder={t('trail.numberPh')}
                  onChange={(event) => setTrackingDraft(event.target.value)}
                />
                <button type="submit">{t('trail.saveNumber')}</button>
              </div>
              {trailUrl && (
                <a href={trailUrl} target="_blank" rel="noopener noreferrer">{t('trail.open')}</a>
              )}
            </form>
          )}

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
              {!order.address?.street
                ? t('checkout.guestDeliver')
                : [
                  order.address?.name,
                  order.address?.phone,
                  order.address?.email,
                  order.address?.street,
                  order.address?.township || order.address?.city,
                  order.address?.regionState || order.address?.zip,
                  order.address?.country || 'Myanmar',
                ].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrdersTab({ orders, trackingSync, onRefreshTracking, onSaveTrackingNumber, onChooseHandoff, onMarkHandoff, catalog, sheetOwner = false }) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState(orders[0]?.orderId || null);
  const syncState = trackingSync || { status: 'idle', lastChecked: null, error: '' };
  const hiredCount = orders.filter((order) => order.trackingMode === 'api').length;
  const sheetCount = orders.length - hiredCount;
  const statusLine = hiredCount && sheetCount
    ? t('orders.bothRegions')
    : hiredCount
      ? ['trail.placed', 'trail.booked', 'trail.pickup', 'trail.transit', 'trail.delivered'].map((key) => t(key)).join(' · ')
      : getSheetStatuses().map((status) => translateSheetStatus(t, status)).join(' · ');

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
                : t(orderUsesApi(orders) ? 'orders.apiHint' : (sheetOwner ? 'orders.staff' : 'orders.viewerHint')))}
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
            onSaveTrackingNumber={onSaveTrackingNumber}
            onChooseHandoff={onChooseHandoff}
            onMarkHandoff={onMarkHandoff}
            onToggle={() => setExpandedId(expandedId === order.orderId ? null : order.orderId)}
          />
        ))}
      </div>
    </div>
  );
}
