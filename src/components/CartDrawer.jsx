import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Sparkles, LogIn, LogOut, User } from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';
import { catalogPhotoFor } from '../services/catalogImages';

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
                <div key={item.id} className="cart-item-row">
                  <img src={catalogPhotoFor(item, catalog)} alt={item.name} className="cart-item-thumb" />
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">{money(item.price)}</div>
                  </div>

                  {/* Qty controls + Delete */}
                  <div className="cart-item-controls">
                    <button
                      className="cart-qty-btn"
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >−</button>
                    <span className="cart-qty-value">{item.quantity}</span>
                    <button
                      className="cart-qty-btn"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >+</button>

                    {/* Prominent delete button */}
                    <button
                      className="cart-delete-btn"
                      onClick={() => onRemoveItem(item.id)}
                      title={t('cart.remove')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
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
