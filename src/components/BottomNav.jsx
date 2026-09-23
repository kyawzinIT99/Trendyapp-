import React from 'react';
import { Home, Package, Sparkles, Heart, ShoppingBag } from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';

const NAV_ITEMS_LEFT = [
  { id: 'home',   Icon: Home,    labelKey: 'nav.home' },
  { id: 'orders', Icon: Package, labelKey: 'nav.orders' },
];

const NAV_ITEMS_RIGHT = [
  { id: 'saved', Icon: Heart,       labelKey: 'nav.saved' },
  { id: 'bag',   Icon: ShoppingBag, labelKey: 'nav.bag' },
];

export function BottomNav({ activeTab, onSelectTab, favoritesCount, cartCount, ordersCount = 0 }) {
  const { t } = useI18n();
  const getBadge = (id) => {
    if (id === 'saved'  && favoritesCount > 0) return favoritesCount;
    if (id === 'bag'    && cartCount > 0)       return cartCount;
    if (id === 'orders' && ordersCount > 0)     return ordersCount;
    return null;
  };

  const badgeColorMap = {
    saved:  'linear-gradient(135deg, #f43f5e, #e11d48)',
    bag:    'linear-gradient(135deg, #6366f1, #4f46e5)',
    orders: 'linear-gradient(135deg, #f59e0b, #d97706)',
  };

  const renderNavBtn = (item) => {
    const isActive = activeTab === item.id;
    const badge = getBadge(item.id);
    const label = t(item.labelKey);
    return (
      <button
        key={item.id}
        className={`nav-tab-btn ${isActive ? 'active' : ''}`}
        onClick={() => onSelectTab(item.id)}
        aria-label={label}
      >
        <div className="nav-icon-container" style={{ position: 'relative' }}>
          <item.Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
          {badge !== null && (
            <span className="nav-badge-pill" style={{ background: badgeColorMap[item.id] }}>
              {badge}
            </span>
          )}
        </div>
        <span className="nav-label">{label}</span>
        {isActive && <div className="nav-active-glow" />}
      </button>
    );
  };

  return (
    <nav className="floating-bottom-nav">
      {NAV_ITEMS_LEFT.map(renderNavBtn)}

      <div
        className={`center-trendy-btn ${activeTab === 'trending' ? 'orb-active' : ''}`}
        onClick={() => onSelectTab('trending')}
        title={t('nav.trending')}
        role="button"
        tabIndex={0}
        aria-label={t('nav.trending')}
        onKeyDown={(e) => e.key === 'Enter' && onSelectTab('trending')}
      >
        <div className="center-trendy-orb">
          <div className="orb-inner-glow" />
          <Sparkles size={19} />
        </div>
        <span className="nav-label orb-label">{t('nav.trendy')}</span>
      </div>

      {NAV_ITEMS_RIGHT.map(renderNavBtn)}
    </nav>
  );
}
