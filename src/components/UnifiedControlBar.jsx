import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Headphones, Key, Watch, Cpu, Laptop, SlidersHorizontal, Check } from 'lucide-react';
import { useI18n } from '../services/i18n.jsx';

const ICON_MAP = { Sparkles, Headphones, Key, Watch, Cpu, Laptop };

const SORT_IDS = ['featured', 'price_asc', 'price_desc', 'rating'];

export function UnifiedControlBar({
  categories,
  activeCategory,
  onSelectCategory,
  sortBy,
  setSortBy,
  counts = {},
}) {
  const { t } = useI18n();
  const [showSort, setShowSort] = useState(false);
  const dropdownRef = useRef(null);

  const currentSortId = SORT_IDS.includes(sortBy) ? sortBy : 'featured';
  const isSorted = currentSortId !== 'featured';

  useEffect(() => {
    if (!showSort) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSort(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSort]);

  const handleSortSelect = (id) => {
    setSortBy(id);
    setShowSort(false);
  };

  return (
    <div className="ucb-root editorial-cats">
      <div className="editorial-cats-head">
        <span className="editorial-cats-title">{t('home.shopBy')}</span>
        <div className="ucb-sort-wrapper" ref={dropdownRef}>
          <button
            className={`ucb-sort-btn ${isSorted ? 'sorted' : ''}`}
            onClick={() => setShowSort((v) => !v)}
            aria-expanded={showSort}
            aria-label={t('sort.sort')}
          >
            <SlidersHorizontal size={14} />
          </button>
          {showSort && (
            <div className="ucb-sort-panel">
              <div className="ucb-sort-panel-header">{t('sort.by')}</div>
              {SORT_IDS.map((id) => (
                <button
                  key={id}
                  className={`ucb-sort-option ${sortBy === id ? 'active' : ''}`}
                  onClick={() => handleSortSelect(id)}
                >
                  <span>{t(`sort.${id}`)}</span>
                  {sortBy === id && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ucb-row">
        <div className="ucb-chips-scroll">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || Sparkles;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                className={`ucb-chip editorial-cat ${isActive ? 'active' : ''}`}
                onClick={() => onSelectCategory(cat.id)}
                aria-pressed={isActive}
              >
                <span className="editorial-cat-icon">
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
                </span>
                <span className="editorial-cat-label">{t(`cat.short.${cat.id}`)}</span>
                {counts[cat.id] !== undefined && (
                  <span className="ucb-chip-count">{counts[cat.id]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
