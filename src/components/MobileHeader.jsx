import React, { useState } from 'react';
import { Search, ShoppingBag, X } from 'lucide-react';
import { LANGS, useI18n } from '../services/i18n.jsx';

export function MobileHeader({
  searchQuery,
  setSearchQuery,
  cartCount,
  onOpenCart,
  user,
}) {
  const { lang, setLang, t } = useI18n();
  const [isFocused, setIsFocused] = useState(false);
  const displayName = (user?.name || 'Trendy').trim().split(/\s+/)[0];

  return (
    <>
      <header className="app-header editorial-header">
        <div className="header-user">
          <div className="user-name">{t('header.hello', { name: displayName })}</div>
        </div>

        <div className="header-actions">
          <div className="lang-switch" role="group" aria-label={t('lang.switch')}>
            {LANGS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`lang-switch-btn ${lang === option.id ? 'on' : ''}`}
                onClick={() => setLang(option.id)}
                aria-pressed={lang === option.id}
                title={option.label}
              >
                {option.short}
              </button>
            ))}
          </div>

          <button
            className="icon-btn-round cart-btn-hdr"
            onClick={onOpenCart}
            title={t('header.bag')}
          >
            <ShoppingBag size={16} />
            {cartCount > 0 && (
              <span className="badge-counter cart-badge">{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      <div className="search-container">
        <div className={`search-input-box ${isFocused ? 'focused' : ''}`}>
          <Search size={15} color={isFocused ? '#1c1917' : '#a8a29e'} style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder={t('header.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="search-clear-btn"
              aria-label={t('home.clearSearch')}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
