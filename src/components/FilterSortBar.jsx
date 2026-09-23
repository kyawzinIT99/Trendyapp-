import React from 'react';
import { ArrowDownUp, Sparkles, Zap, KeyRound, Headphones } from 'lucide-react';

export function FilterSortBar({
  filterType,
  setFilterType,
  sortBy,
  setSortBy
}) {
  const FILTERS = [
    { id: 'all', label: 'All Items', icon: Sparkles },
    { id: 'in_stock', label: 'In Stock', icon: Zap },
    { id: 'physical', label: 'Hardware', icon: Headphones },
    { id: 'digital', label: 'Digital Passes', icon: KeyRound }
  ];

  const handleNextSort = () => {
    if (sortBy === 'featured') setSortBy('price_asc');
    else if (sortBy === 'price_asc') setSortBy('price_desc');
    else if (sortBy === 'price_desc') setSortBy('rating');
    else setSortBy('featured');
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'price_asc': return 'Ks Low → High';
      case 'price_desc': return 'Ks High → Low';
      case 'rating': return '★ Top Rated';
      default: return 'Featured';
    }
  };

  return (
    <div className="filter-sort-bar">
      <div className="quick-filter-pills">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = filterType === f.id;
          return (
            <button
              key={f.id}
              className={`sub-pill ${isActive ? 'active' : ''}`}
              onClick={() => setFilterType(f.id)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon size={11} />
                {f.label}
              </span>
            </button>
          );
        })}
      </div>

      <button className="sort-selector-btn" onClick={handleNextSort} title="Cycle sort order">
        <ArrowDownUp size={11} color="#67e8f9" />
        <span>{getSortLabel()}</span>
      </button>
    </div>
  );
}
