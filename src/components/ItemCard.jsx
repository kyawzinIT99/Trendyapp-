import React, { useState } from 'react';
import { Star, Plus, Heart, Zap, Check } from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';

export function ItemCard({
  item,
  onSelect,
  onQuickAdd,
  isFavorite,
  onToggleFavorite,
  rank,        // optional: shows a #N ribbon (Explore / Trending view)
  index = 0,   // used for staggered entrance animation
}) {
  const { t, money } = useI18n();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  const isPhysical = item.type !== 'digital';
  const isLowStock = isPhysical && item.stock && item.stock <= 15;
  const isCritical = isPhysical && item.stock && item.stock <= 6;

  const discount = item.original_price
    ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
    : null;
  const showDiscount = discount !== null && discount >= 5;

  // Shorten badge text so it never overflows the label chip
  const shortBadge = item.badge
    ? item.badge.replace('Instant Digital Delivery', 'Instant Delivery')
               .replace('Limited Edition', 'Ltd Edition')
    : null;

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (addedFlash) return;
    onQuickAdd(item);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1100);
  };

  return (
    <div
      className="item-card"
      onClick={() => onSelect(item)}
      style={{ '--enter-delay': `${Math.min(index, 8) * 45}ms` }}
    >
      {/* ── Image Area ─────────────────────────────── */}
      <div className="item-image-wrapper">
        {!imgLoaded && <div className="img-shimmer" />}
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
        />
        <div className="card-image-scrim" />

        {rank && <span className="card-rank-ribbon">#{rank}</span>}

        {/* Top-left: discount takes priority over badge */}
        {!rank && (showDiscount ? (
          <span className="card-top-label label-discount">−{discount}%</span>
        ) : shortBadge ? (
          <span className="card-top-label label-badge">{shortBadge}</span>
        ) : null)}

        {/* Digital tag — top right */}
        {!isPhysical && (
          <span className="card-digital-tag">
            <Zap size={9} /> {t('card.digital')}
          </span>
        )}

        <button
          className={`fav-quick-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
          aria-label={isFavorite ? t('card.favRemove') : t('card.favAdd')}
          style={!isPhysical ? { top: 34 } : {}}
        >
          <Heart size={12} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Bottom-left: contextual signal over the image */}
        {isCritical ? (
          <span className="card-signal signal-hot">{t('card.onlyLeft', { n: item.stock })}</span>
        ) : !isPhysical ? (
          <span className="card-signal signal-instant"><Zap size={9} /> {t('card.instant')}</span>
        ) : null}

        <div className="card-image-overlay" />
      </div>

      {/* ── Content Area ───────────────────────────── */}
      <div className="item-content">
        <div className="item-category-label">{t(`cat.${item.category_slug}`) || item.category_name}</div>
        <h3 className="item-name" title={item.name}>{item.name}</h3>

        <div className="item-rating-row">
          <Star size={11} fill="#f59e0b" color="#f59e0b" />
          <span className="rating-value">{item.rating}</span>
          <span className="reviews-muted">({item.reviews_count})</span>
        </div>

        {isLowStock && !isCritical && (
          <div className="stock-meter-row">
            <div className="stock-progress-track">
              <div
                className="stock-progress-fill"
                style={{ width: `${Math.min(100, (item.stock / 20) * 100)}%` }}
              />
            </div>
            <span className="stock-count-label">{t('card.left', { n: item.stock })}</span>
          </div>
        )}

        <div className="item-footer-row">
          <div className="price-box">
            <span className="price-main">{money(item.price)}</span>
            {item.original_price && (
              <span className="price-strike">{money(item.original_price)}</span>
            )}
          </div>

          <button
            className={`quick-add-btn ${addedFlash ? 'flash' : ''}`}
            onClick={handleQuickAdd}
            aria-label={addedFlash ? t('card.added') : t('card.add')}
          >
            {addedFlash
              ? <><Check size={13} strokeWidth={3} /><span className="quick-add-text">{t('card.added')}</span></>
              : <Plus size={14} strokeWidth={2.8} />}
          </button>
        </div>
      </div>
    </div>
  );
}
