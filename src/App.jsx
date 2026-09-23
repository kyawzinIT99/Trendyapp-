import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DeviceFrame } from './components/DeviceFrame';
import { MobileHeader } from './components/MobileHeader';
import { UnifiedControlBar } from './components/UnifiedControlBar';
import { ItemCard } from './components/ItemCard';
import { ItemDetailSheet } from './components/ItemDetailSheet';
import { CartDrawer } from './components/CartDrawer';
import { BottomNav } from './components/BottomNav';
import { AdminPanelModal } from './components/AdminPanelModal';
import { CheckoutScreen } from './components/CheckoutScreen';
import { OrderConfirmation } from './components/OrderConfirmation';
import { OrdersTab } from './components/OrdersTab';
import { SignInScreen } from './components/SignInScreen';
import { getStoredItems, saveStoredItems, CATEGORIES } from './services/api';
import { hydrateCatalog, catalogNeedsRewrite, isUploadedImageRef, catalogPhotoFor } from './services/catalogImages';
import { dispatchBackendN8NEvent, lookupOrdersTracking, lookupOrderTracking, dispatchOrderSubmitted, withTrackingToken, TRACKING_POLL_MS } from './services/n8nService';
import {
  getCurrentUser, saveUser, signOut, getActiveUserId,
  getUserCart, saveUserCart,
  getUserOrders, saveUserOrders,
  getUserFavorites, saveUserFavorites,
} from './services/authService';
import { Heart, PackageCheck, CheckCircle, TrendingUp, SearchX } from 'lucide-react';
import { PromoHeroBanner } from './components/PromoHeroBanner';
import { useI18n } from './services/i18n.jsx';
import { migrateCartToMmk, migrateOrdersToMmk } from './services/currency';
import { isBusinessOwner, canReviseBackend } from './services/roles';

export default function App() {
  const { t, money } = useI18n();
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [user, setUser]               = useState(getCurrentUser); // null = not signed in
  const [showSignIn, setShowSignIn]   = useState(false);
  const activeUserId                  = getActiveUserId(user);

  // Device & Layout State
  const [deviceMode, setDeviceMode] = useState('ios');
  const [activeTab, setActiveTab] = useState('home');

  // Catalog State (Dynamic, editable from Admin Panel)
  const [items, setItems] = useState(() => getStoredItems().map((item) => (
    isUploadedImageRef(item.image)
      ? { ...item, imageKey: item.image, image: '/images/headset.jpg' }
      : item
  )));
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Checkout & Orders flow
  const [checkoutView, setCheckoutView] = useState(null);
  const [currentOrder, setCurrentOrder]   = useState(null);

  // Modals & Drawers
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // ── Per-user persistent state ─────────────────────────────────────────────
  const [cartItems, setCartItems]   = useState(() => migrateCartToMmk(getUserCart(getActiveUserId(getCurrentUser()))));
  const [orders, setOrders]         = useState(() => migrateOrdersToMmk(getUserOrders(getActiveUserId(getCurrentUser()))));
  const [favorites, setFavorites]   = useState(() => new Set(getUserFavorites(getActiveUserId(getCurrentUser()))));

  // Re-load per-user data whenever user switches
  useEffect(() => {
    setCartItems(migrateCartToMmk(getUserCart(activeUserId)));
    setOrders(migrateOrdersToMmk(getUserOrders(activeUserId)));
    setFavorites(new Set(getUserFavorites(activeUserId)));
  }, [activeUserId]);

  // Auto-save cart when it changes
  useEffect(() => { saveUserCart(activeUserId, cartItems); }, [cartItems, activeUserId]);
  // Auto-save orders
  useEffect(() => { saveUserOrders(activeUserId, orders); }, [orders, activeUserId]);
  // Auto-save favorites
  useEffect(() => { saveUserFavorites(activeUserId, [...favorites]); }, [favorites, activeUserId]);

  // Toast System
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3600);
  };

  // Hydrate IndexedDB photos, then keep the storefront in sync with Admin
  useEffect(() => {
    let cancelled = false;
    const stored = getStoredItems();
    hydrateCatalog(stored).then((hydrated) => {
      if (cancelled) return;
      setItems(hydrated);
      if (catalogNeedsRewrite(stored)) {
        try { saveStoredItems(hydrated, { notify: false }); } catch { /* keep in-memory catalog */ }
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleCatalogUpdate = (e) => {
      if (!e.detail) return;
      hydrateCatalog(e.detail).then(setItems);
    };
    window.addEventListener('trendy-catalog-updated', handleCatalogUpdate);
    return () => window.removeEventListener('trendy-catalog-updated', handleCatalogUpdate);
  }, []);

  const storefrontItems = useMemo(
    () => items.filter((item) => item.visible !== false),
    [items]
  );

  useEffect(() => {
    if (!items.length) return;
    setCartItems((prev) => prev.map((cartItem) => {
      const catalog = items.find((item) => item.id === cartItem.id);
      return catalog
        ? { ...cartItem, image: catalog.image, name: catalog.name, price: catalog.price }
        : cartItem;
    }));
    setSelectedItem((prev) => {
      if (!prev) return prev;
      const next = items.find((item) => item.id === prev.id);
      if (!next || next.visible === false) return null;
      return next;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = storefrontItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category_slug === activeCategory;
      const matchesSearch = searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
    if (sortBy === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating);
    else result.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return result;
  }, [storefrontItems, activeCategory, searchQuery, sortBy]);

  // Favorite Items list
  const favoriteItems = useMemo(() => {
    return storefrontItems.filter(item => favorites.has(item.id));
  }, [storefrontItems, favorites]);

  // Per-category counts for the filter chips
  const categoryCounts = useMemo(() => {
    const counts = { all: storefrontItems.length };
    storefrontItems.forEach(i => { counts[i.category_slug] = (counts[i.category_slug] || 0) + 1; });
    return counts;
  }, [storefrontItems]);

  // Trending = rating weighted by review volume (Explore tab)
  const trendingItems = useMemo(() => {
    return [...storefrontItems].sort((a, b) =>
      (b.rating * Math.log10((b.reviews_count || 1) + 9)) - (a.rating * Math.log10((a.reviews_count || 1) + 9))
    );
  }, [storefrontItems]);

  const isSearching   = searchQuery.trim() !== '';
  const showSpotlight = !isSearching && activeCategory === 'all' && sortBy === 'featured';

  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Handlers
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    dispatchBackendN8NEvent('item.view', {
      itemId: item.id,
      itemName: item.name,
      price: item.price
    });
  };

  const handleToggleFavorite = (itemId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        showToast(t('toast.unsaved'));
      } else {
        next.add(itemId);
        showToast(t('toast.saved'));
        dispatchBackendN8NEvent('item.favorited', { itemId });
      }
      return next;
    });
  };

  const handleAddToCart = (item, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity
      }];
    });
    showToast(t('toast.added', { qty: quantity, name: item.name }));
    dispatchBackendN8NEvent('item.cart_added', { itemId: item.id, itemName: item.name, quantity });
  };

  const handleUpdateCartQuantity = (id, quantity) => {
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const handleRemoveFromCart = (id) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
    showToast(t('toast.removed'));
  };

  // ── Checkout handlers ─────────────────────────────────────────────────────
  const handleGoToCheckout = () => {
    setIsCartOpen(false);
    setCheckoutView('checkout');
  };

  const handleOrderConfirmed = async (order) => {
    bindStarted.current.add(order.orderId);
    setCurrentOrder(order);
    setCheckoutView('confirm');
    setOrders(prev => [order, ...prev]);
    setCartItems([]);
    const submitted = await dispatchOrderSubmitted(order);
    if (submitted.success) {
      setOrders((previous) => previous.map((item) => (
        item.orderId === order.orderId ? { ...item, sheetBound: true } : item
      )));
      showToast(t('toast.orderOk', { id: order.orderId }));
    } else {
      bindStarted.current.delete(order.orderId);
      showToast(t('toast.orderLocal', { id: order.orderId }));
    }
  };

  const [trackingSync, setTrackingSync] = useState({
    status: 'idle',
    lastChecked: null,
    error: '',
  });
  const ordersRef = useRef(orders);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const bindStarted = useRef(new Set());

  useEffect(() => {
    setOrders((previous) => {
      const next = previous.map(withTrackingToken);
      return next.some((order, index) => order.trackingToken !== previous[index].trackingToken) ? next : previous;
    });
  }, []);

  useEffect(() => {
    orders.forEach((order) => {
      if (!order.trackingToken || order.sheetBound) return;
      if (bindStarted.current.has(order.orderId)) return;
      bindStarted.current.add(order.orderId);
      (async () => {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const lookup = await lookupOrderTracking(order);
          if (lookup.success) {
            setOrders((previous) => previous.map((item) => (
              item.orderId === order.orderId ? { ...item, ...lookup.update, sheetBound: true } : item
            )));
            return;
          }
          if (lookup.notFound) {
            const submitted = await dispatchOrderSubmitted(order, { attempts: 2 });
            if (submitted.success) {
              setOrders((previous) => previous.map((item) => (
                item.orderId === order.orderId ? { ...item, sheetBound: true } : item
              )));
              return;
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 4000 * (attempt + 1)));
        }
        bindStarted.current.delete(order.orderId);
      })();
    });
  }, [orders]);

  const refreshTracking = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const trackable = ordersRef.current.filter((order) => order.orderId && order.trackingToken);
    if (trackable.length === 0) {
      setTrackingSync({ status: 'idle', lastChecked: null, error: '' });
      return;
    }

    setTrackingSync((previous) => ({ ...previous, status: 'refreshing', error: '' }));
    const { success, updates, error } = await lookupOrdersTracking(trackable);

    if (updates.length > 0) {
      setOrders((previous) => {
        let changed = false;
        const next = previous.map((order) => {
          const hit = updates.find((entry) => entry.orderId === order.orderId);
          if (!hit) return order;
          const update = hit.result.update;
          const same =
            order.deliveryStatus === update.deliveryStatus &&
            order.paymentStatus === update.paymentStatus &&
            (order.statusNote || '') === (update.statusNote || '') &&
            (order.statusUpdatedAt || '') === (update.statusUpdatedAt || '');
          if (same) return order;
          changed = true;
          return { ...order, ...update, sheetBound: true };
        });
        return changed ? next : previous;
      });
      updates.forEach(({ orderId, result }) => {
        setCurrentOrder((previous) =>
          previous?.orderId === orderId ? { ...previous, ...result.update } : previous
        );
      });
    }

    setTrackingSync({
      status: success ? 'online' : 'error',
      lastChecked: new Date(),
      error: success ? '' : (error || 'Live tracking is temporarily unavailable'),
    });
  }, []);

  useEffect(() => {
    refreshTracking();
    const interval = setInterval(refreshTracking, TRACKING_POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) refreshTracking();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshTracking]);

  useEffect(() => {
    if (activeTab === 'orders') refreshTracking();
  }, [activeTab, refreshTracking]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleSignIn = (signedInUser) => {
    saveUser(signedInUser);
    setUser(signedInUser);
    setShowSignIn(false);
    showToast(t('toast.welcome', { name: signedInUser.name }));
    dispatchBackendN8NEvent('user.account_saved', {
      name: signedInUser.name,
      phone: signedInUser.phone,
      email: signedInUser.email || '',
      role: signedInUser.role,
      active: signedInUser.active || 'Yes',
    });
  };

  const openAdminPanel = () => {
    if (!isBusinessOwner(user)) {
      showToast(t('signin.adminDenied'));
      return;
    }
    setIsAdminOpen(true);
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
    setShowSignIn(true);
    showToast(t('toast.signedOut'));
  };

  const handleContinueAsGuest = () => {
    setShowSignIn(false);
  };

  const handleTrackOrder = () => {
    setCheckoutView(null);
    setActiveTab('orders');
  };

  const handleFinishOrder = () => {
    setCheckoutView(null);
    setCurrentOrder(null);
    setActiveTab('home');
  };

  return (
    <DeviceFrame
      deviceMode={deviceMode}
      setDeviceMode={setDeviceMode}
      onOpenAdminPanel={openAdminPanel}
      canOpenAdmin={isBusinessOwner(user)}
      cartCount={totalCartCount}
    >
      <div className="screen-scroll-view">
        {/* Customer Header */}
        <MobileHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          cartCount={totalCartCount}
          onOpenCart={() => setIsCartOpen(true)}
          favoritesCount={favorites.size}
          onNavigateSaved={() => setActiveTab('saved')}
          user={user}
          onSignIn={() => setShowSignIn(true)}
          onSignOut={handleSignOut}
        />

        {/* ── Sign-In overlay (inside phone screen) ── */}
        {showSignIn && (
          <SignInScreen
            onSignIn={handleSignIn}
            onContinueAsGuest={handleContinueAsGuest}
          />
        )}

        {/* ── Checkout Flow (full-screen overlays inside device) ── */}
        {checkoutView === 'checkout' && (
          <CheckoutScreen
            cartItems={cartItems}
            onBack={() => setCheckoutView(null)}
            onConfirmOrder={handleOrderConfirmed}
          />
        )}

        {checkoutView === 'confirm' && currentOrder && (
          <OrderConfirmation
            order={currentOrder}
            onTrackOrder={handleTrackOrder}
            onContinueShopping={handleFinishOrder}
          />
        )}

        {/* Normal tab content — hidden during checkout flow */}
        {!checkoutView && (
          <>

        {activeTab === 'home' && (
          <div className="editorial-home">
            {showSpotlight && (
              <PromoHeroBanner
                items={storefrontItems}
                onSelectItem={handleSelectItem}
                onQuickAdd={(i) => handleAddToCart(i, 1)}
              />
            )}

            <UnifiedControlBar
              categories={CATEGORIES}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              sortBy={sortBy}
              setSortBy={setSortBy}
              counts={categoryCounts}
            />

            <div className="section-headline">
              <span className="section-title">
                {isSearching
                  ? <>{t('home.resultsFor')} <em className="section-query">“{searchQuery.trim()}”</em></>
                  : activeCategory === 'all' ? t('home.featured') : t(`cat.${activeCategory}`)}
              </span>
              <span className="count-tag">
                {t('home.seeAll')}
              </span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="search-empty">
                <div className="search-empty-icon"><SearchX size={26} /></div>
                <div className="search-empty-title">{t('home.emptyTitle', { query: searchQuery.trim() || t('home.thisFilter') })}</div>
                <div className="search-empty-sub">{t('home.emptySub')}</div>
                <div className="search-empty-chips">
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <button key={c.id} className="search-empty-chip" onClick={() => { setSearchQuery(''); setActiveCategory(c.id); }}>
                      {t(`cat.${c.id}`)}
                    </button>
                  ))}
                </div>
                <button className="search-empty-reset" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                  {t('home.clearSearch')}
                </button>
              </div>
            ) : (
              <div className="items-grid-container">
                {filteredItems.map((item, idx) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    onSelect={handleSelectItem}
                    onQuickAdd={(i) => handleAddToCart(i, 1)}
                    isFavorite={favorites.has(item.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Explore View */}
        {activeTab === 'trending' && (
          <div style={{ paddingTop: 2 }}>
            <div className="section-headline" style={{ paddingBottom: 4 }}>
              <span className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} color="#818cf8" />
                <span>{t('explore.title')}</span>
              </span>
              <span className="count-tag live-tag"><span className="live-dot" />{t('explore.ranked')}</span>
            </div>

            {/* Podium — top 3 as a horizontal rail */}
            <div className="trend-rail">
              {trendingItems.slice(0, 3).map((item, idx) => (
                <button key={item.id} className={`trend-rail-card rank-${idx + 1}`} onClick={() => handleSelectItem(item)}>
                  <img src={item.image} alt="" className="trend-rail-img" />
                  <div className="trend-rail-scrim" />
                  <span className="trend-rail-rank">{idx + 1}</span>
                  <div className="trend-rail-info">
                    <div className="trend-rail-name">{item.name}</div>
                    <div className="trend-rail-meta">★ {item.rating} · {item.reviews_count} {t('explore.reviews')}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="section-headline" style={{ paddingTop: 10 }}>
              <span className="section-title">{t('explore.board')}</span>
              <span className="count-tag">{trendingItems.length} {t('home.items')}</span>
            </div>

            <div className="items-grid-container">
              {trendingItems.map((item, idx) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  rank={idx + 1}
                  onSelect={handleSelectItem}
                  onQuickAdd={(i) => handleAddToCart(i, 1)}
                  isFavorite={favorites.has(item.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Saved Items (Wishlist) */}
        {activeTab === 'saved' && (
          <div style={{ padding: '16px' }}>
            <div className="section-headline" style={{ padding: '0 0 14px 0' }}>
              <span className="section-title">{t('saved.title', { count: favoriteItems.length })}</span>
            </div>

            {favoriteItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <Heart size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
                <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: 4 }}>{t('saved.empty')}</h4>
                <p style={{ fontSize: '0.82rem' }}>{t('saved.hint')}</p>
              </div>
            ) : (
              <div className="items-grid-container" style={{ padding: 0 }}>
                {favoriteItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onSelect={handleSelectItem}
                    onQuickAdd={(i) => handleAddToCart(i, 1)}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

            {/* Tab 4: Orders Tracking */}
            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                catalog={items}
                trackingSync={trackingSync}
                onRefreshTracking={refreshTracking}
                sheetOwner={canReviseBackend(user)}
              />
            )}

            {/* Tab 5: Bag (Cart tab) */}
            {activeTab === 'bag' && (
              <div style={{ padding: '16px' }}>
                <div className="section-headline" style={{ padding: '0 0 14px 0' }}>
                  <span className="section-title">{t('bag.title')}</span>
                  <span style={{ fontSize: '0.75rem', color: '#06b6d4' }}>{totalCartCount} {t('home.items')}</span>
                </div>

                {cartItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <PackageCheck size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
                    <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: 4 }}>{t('bag.empty')}</h4>
                    <button className="hero-cta-btn" style={{ marginTop: 12 }} onClick={() => setActiveTab('home')}>
                      {t('bag.start')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {cartItems.map((item) => (
                      <div key={item.id} className="cart-item-row" style={{ padding: 12 }}>
                        <img src={catalogPhotoFor(item, items)} alt={item.name} className="cart-item-thumb" style={{ width: 56, height: 56 }} />
                        <div className="cart-item-info">
                          <div className="cart-item-name">{item.name}</div>
                          <div className="cart-item-price">{money(item.price)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => handleUpdateCartQuantity(item.id, Math.max(1, item.quantity - 1))} style={{ color: '#94a3b8', padding: '3px 8px', background: '#182030', borderRadius: 4 }}>-</button>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)} style={{ color: '#94a3b8', padding: '3px 8px', background: '#182030', borderRadius: 4 }}>+</button>
                        </div>
                      </div>
                    ))}
                    <button className="checkout-n8n-btn" style={{ marginTop: 14 }} onClick={handleGoToCheckout}>
                      <span>{t('bag.checkout', { total: money(cartItems.reduce((a, b) => a + b.price * b.quantity, 0)) })}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => { setCheckoutView(null); setActiveTab(tab); }}
        favoritesCount={favorites.size}
        cartCount={totalCartCount}
        ordersCount={orders.length}
      />

      {/* Item Detail Sheet with Multi-Photo Gallery & Variants */}
      {selectedItem && (
        <ItemDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
          isFavorite={favorites.has(selectedItem.id)}
          onToggleFavorite={handleToggleFavorite}
          onShowToast={showToast}
        />
      )}

      {/* Cart Drawer — now with onGoToCheckout */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={() => setCartItems([])}
        onShowToast={showToast}
        onGoToCheckout={handleGoToCheckout}
        user={user}
        catalog={items}
        onSignIn={() => setShowSignIn(true)}
        onSignOut={handleSignOut}
      />

      {/* Dedicated Admin Panel & Front Editor */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        items={items}
        onUpdateItems={setItems}
        onShowToast={showToast}
        user={user}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast-floating-container">
          <div className="toast-pill">
            <CheckCircle size={16} color="#10b981" />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </DeviceFrame>
  );
}
