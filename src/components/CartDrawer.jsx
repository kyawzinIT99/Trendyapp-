import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Sparkles, LogIn, LogOut, User } from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';
import { catalogPhotoFor } from '../services/catalogImages';

export function BagItemRow({ item, catalog, onUpdateQuantity, onRemoveItem }) {
  const { t, money } = useI18n();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const closeEdit = () => {
    setEditing(false);
    setConfirmRemove(false);
  };

  return (
    <div className="bag-line">
      <div className="cart-item-row">
        <img src={catalogPhotoFor(item, catalog)} alt={item.name} className="cart-item-thumb" />
        <div className="cart-item-info">
          <div className="cart-item-name">{item.name}</div>
          <div className="cart-item-price">{money(item.price)}</div>
        </div>
        <div className="cart-item-controls">
          <span className="cart-qty-value">{t('bag.qty', { n: item.quantity })}</span>
          {!editing && (
            <button type="button" className="bag-change-btn" onClick={() => setEditing(true)}>
              {t('bag.change')}
            </button>
          )}
        </div>
      </div>
      {editing && (
        <div className="bag-change-panel">
          <div className="bag-qty-stepper">
            <button type="button" className="cart-qty-btn" aria-label="Decrease" onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}>−</button>
            <span className="cart-qty-value">{item.quantity}</span>
            <button type="button" className="cart-qty-btn" aria-label="Increase" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
          </div>
          {!confirmRemove ? (
            <button type="button" className="bag-remove-ask" onClick={() => setConfirmRemove(true)}>
              <Trash2 size={14} /> {t('cart.remove')}
            </button>
          ) : (
            <div className="bag-remove-confirm">
              <span>{t('bag.removeAsk')}</span>
              <button type="button" className="bag-remove-yes" onClick={() => onRemoveItem(item.id)}>{t('cart.remove')}</button>
              <button type="button" className="bag-keep-btn" onClick={() => setConfirmRemove(false)}>{t('bag.keep')}</button>
            </div>
          )}
          <button type="button" className="bag-done-btn" onClick={closeEdit}>{t('bag.done')}</button>
        </div>
      )}
    </div>
  );
}

export function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onShowToast,
  onGoToCheckout,
  user,
  onSignIn,
  onSignOut,
  catalog,
}) {
  const { t, money } = useI18n();
  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCount  = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="cart-drawer-sheet" onClick={onClose}>
      <div className="cart-content-card" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="cart-header">
          <div className="cart-title">
            <ShoppingBag size={18} color="#6366f1" />
            <span>{t('cart.title', { count: totalCount })}</span>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── User account strip ── */}
        <div className="cart-user-strip">
          {user ? (
            <div className="cart-user-info">
              {user.picture
                ? <img src={user.picture} alt={user.name} className="cart-user-avatar" />
                : <div className="cart-user-avatar-placeholder"><User size={12} /></div>
              }
              <div className="cart-user-details">
                <div className="cart-user-name">{user.name}</div>
                <div className="cart-user-email">{[user.role, user.email].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="cart-signout-btn" onClick={onSignOut} title={t('cart.signOut')}>
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button className="cart-signin-prompt" onClick={() => { onClose(); onSignIn(); }}>
              <LogIn size={13} />
              <span>{t('cart.signIn')}</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>

        {/* ── Items ── */}
        {cartItems.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
            <ShoppingBag size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{t('cart.empty')}</div>
            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>{t('cart.emptyHint')}</div>
          </div>
        ) : (
          <>
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <BagItemRow
                  key={item.id}
                  item={item}
                  catalog={catalog}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                />
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total-row">
                <span>{t('cart.subtotal')}</span>
                <span className="cart-total-amount">{money(totalAmount)}</span>
              </div>
              <button className="checkout-n8n-btn" onClick={onGoToCheckout}>
                <Sparkles size={15} />
                <span>{t('cart.checkout')}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
