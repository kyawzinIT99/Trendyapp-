import React from 'react';
import { Sparkles, Headphones, Key, Watch, Cpu, ShoppingBag, Grid } from 'lucide-react';

const ICON_MAP = {
  Sparkles,
  Headphones,
  Key,
  Watch,
  Cpu,
  ShoppingBag,
  Grid,
};

export function CategoryChips({ categories, activeCategory, onSelectCategory }) {
  return (
    <div className="category-chips-wrapper">
      {categories.map((cat) => {
        const IconComponent = ICON_MAP[cat.icon] || Sparkles;
        const isActive = activeCategory === cat.id;

        return (
          <button
            key={cat.id}
            className={`cat-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
            aria-pressed={isActive}
          >
            <span className="cat-pill-icon">
              <IconComponent size={13} strokeWidth={isActive ? 2.5 : 1.8} />
            </span>
            <span>{cat.name}</span>
            {isActive && <span className="cat-active-dot" />}
          </button>
        );
      })}
    </div>
  );
}
