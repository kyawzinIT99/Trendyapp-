import React, { useState } from 'react';
import {
  X, Star, ShoppingBag, Heart, ShieldCheck, Truck, Layers, Zap, Minus, Plus, RotateCcw
} from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';

const VARIANTS = [
  { name: 'Space Obsidian', color: '#1e293b' },
  { name: 'Cyber Cyan',     color: '#06b6d4' },
  { name: 'Pure Titanium',  color: '#94a3b8' },
];

export function ItemDetailSheet({
  item,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
}) {
  const { t, money } = useI18n();
  const [selectedPhoto, setSelectedPhoto]     = useState(item?.image || '');
  const [selectedVariant, setSelectedVariant] = useState(VARIANTS[0].name);
  const [quantity, setQuantity]               = useState(1);

  if (!item) return null;

  const isDigital = item.type === 'digital';
  const maxQty    = isDigital ? 10 : Math.max(1, Math.min(10, item.stock || 10));

  const photos = (Array.isArray(item.photos) && item.photos.length ? item.photos : [item.image])
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .slice(0, 3);

  const discount = item.original_price
    ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
    : 0;

  const handleAdd = () => {
    onAddToCart({
      ...item,
      name: isDigital ? item.name : `${item.name} (${selectedVariant})`,
      image: selectedPhoto || item.image,
    }, quantity);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle-bar" onClick={onClose}>
          <div className="sheet-drag-pill" />
        </div>

        <div className="sheet-scroll-body">
          {/* Media */}
          <div className="sheet-media-header">
            <img src={selectedPhoto || item.image} alt={item.name} />
            <button className="sheet-close-btn" onClick={onClose} aria-label={t('sheet.close')}>
              <X size={16} />
            </button>
            {discount > 0 && <span className="sheet-discount-pill">−{discount}%</span>}
          </div>

          {photos.length > 1 && (
            <div className="photo-thumbnails-row">
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  className={`photo-thumb-btn ${(selectedPhoto === p || (!selectedPhoto && idx === 0)) ? 'active' : ''}`}
                  onClick={() => setSelectedPhoto(p)}
                  aria-label={`Photo ${idx + 1}`}
                >
                  <img src={p} alt="" />
                </button>
              ))}
            </div>
          )}

          {/* Eyebrow + rating */}
          <div className="sheet-eyebrow-row">
            <span className="sheet-eyebrow">
              {t(`cat.${item.category_slug}`) || item.category_name} · {isDigital ? t('sheet.digital') : t('sheet.physical')}
            </span>
            <span className="sheet-rating">
              <Star size={12} fill="currentColor" />
              {item.rating} <span className="sheet-rating-count">({item.reviews_count})</span>
            </span>
          </div>

          <h2 className="sheet-title">{item.name}</h2>

          <div className="sheet-price-row">
            <span className="sheet-price">{money(item.price)}</span>
            {item.original_price && (
              <span className="sheet-price-strike">{money(item.original_price)}</span>
            )}
            {item.badge && (
              <span className={`item-badge-pill badge-${item.badge_type} sheet-badge`}>{item.badge}</span>
            )}
          </div>

          {/* Variants — physical items only */}
          {!isDigital && (
            <div className="variant-selector-box">
              <div className="variant-title-row">
                <span>{t('sheet.finish')}</span>
                <span className="variant-current">{selectedVariant}</span>
              </div>
              <div className="variant-chips-row">
                {VARIANTS.map((v) => (
                  <button
                    key={v.name}
                    className={`variant-pill-btn ${selectedVariant === v.name ? 'active' : ''}`}
                    onClick={() => setSelectedVariant(v.name)}
                  >
                    <span className="variant-color-dot" style={{ background: v.color }} />
                    <span>{v.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="sheet-desc">{item.description}</p>

          {/* Assurance chips */}
          <div className="sheet-assurance-row">
            <div className="sheet-assurance">
              {isDigital ? <Zap size={15} color="#f59e0b" /> : <Truck size={15} color="#10b981" />}
              <span>{isDigital ? t('sheet.instantAcct') : t('sheet.shipFree')}</span>
            </div>
            <div className="sheet-assurance">
              <ShieldCheck size={15} color="#818cf8" />
              <span>{t('sheet.vault')}</span>
            </div>
            <div className="sheet-assurance">
              <RotateCcw size={15} color="#38bdf8" />
              <span>{isDigital ? t('sheet.noRefund') : t('sheet.returns')}</span>
            </div>
          </div>

          {item.specs && Object.keys(item.specs).length > 0 && (
            <div className="specs-matrix-box">
              <div className="specs-header">
                <Layers size={14} />
                <span>{t('sheet.specs')}</span>
              </div>
              <div className="specs-grid">
                {Object.entries(item.specs).map(([key, value]) => (
                  <div key={key} className="spec-row">
                    <span className="spec-key">{key}</span>
                    <span className="spec-val">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="sheet-qty-row">
            <div>
              <div className="sheet-qty-label">{t('sheet.qty')}</div>
              {!isDigital && item.stock <= 15 && (
                <div className="sheet-qty-hint">{t('sheet.stock', { n: item.stock })}</div>
              )}
            </div>
            <div className="sheet-qty-stepper">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease">
                <Minus size={14} />
              </button>
              <span className="sheet-qty-value">{quantity}</span>
              <button onClick={() => setQuantity(q => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} aria-label="Increase">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sheet-action-footer">
          <button
            className={`sheet-fav-btn ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite(item.id)}
            aria-label={t('header.saved')}
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button className="sheet-buy-btn" onClick={handleAdd}>
            <ShoppingBag size={16} />
            <span>{t('sheet.add')}</span>
            <span className="sheet-buy-total">{money(item.price * quantity)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
