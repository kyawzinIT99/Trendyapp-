import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../services/i18n.jsx';

const ROTATE_MS = 4800;

// Product-driven spotlight carousel. Picks the strongest offers in the catalog
// (deepest discount first, then rating) and rotates them automatically.
export function PromoHeroBanner({ items = [], onSelectItem }) {
  const { t, money } = useI18n();
  const spotlight = React.useMemo(() => {
    const score = (i) => {
      const discount = i.original_price ? (i.original_price - i.price) / i.original_price : 0;
      return (i.featured ? 1000 : 0) + discount * 100 + (i.rating || 0) * 4 + (i.badge ? 3 : 0);
    };
    const featured = items.filter((i) => i.featured);
    const pool = featured.length ? featured : items;
    return [...pool].sort((a, b) => score(b) - score(a)).slice(0, 4);
  }, [items]);

  const [index, setIndex]   = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    if (paused || spotlight.length < 2) return;
    const t = setInterval(() => setIndex(i => (i + 1) % spotlight.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, spotlight.length]);

  if (spotlight.length === 0) return null;

  const safeIndex = index % spotlight.length;
  const item = spotlight[safeIndex];

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) setIndex(i => (i + (dx < 0 ? 1 : -1) + spotlight.length) % spotlight.length);
    touchX.current = null;
    setPaused(false);
  };

  return (
    <div
      className="spotlight-container"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="spotlight-card" key={item.id} onClick={() => onSelectItem(item)}>
        <img src={item.image} alt="" className="spotlight-bg" aria-hidden="true" />
        <div className="spotlight-scrim" />

        <div className="spotlight-top">
          <span className="spotlight-tag">{t('spot.newSeason')}</span>
        </div>

        <div className="spotlight-body">
          <h2 className="spotlight-title">{(item.name || '').replace(/^Trendy\s+/i, '')}</h2>
          {item.description && (
            <p className="spotlight-blurb">{item.description}</p>
          )}
          <div className="spotlight-price-row">
            <span className="spotlight-price">{money(item.price)}</span>
          </div>
        </div>

        {/* Progress dots — the active one fills over the rotation window */}
        <div className="spotlight-dots" onClick={(e) => e.stopPropagation()}>
          {spotlight.map((s, i) => (
            <button
              key={s.id}
              className={`spotlight-dot ${i === safeIndex ? 'active' : ''} ${paused ? 'paused' : ''}`}
              style={i === safeIndex ? { '--rotate-ms': `${ROTATE_MS}ms` } : undefined}
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
