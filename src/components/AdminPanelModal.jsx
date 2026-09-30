import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Image as ImageIcon,
  Save,
  Plus,
  Trash2,
  Radio,
  Send,
  Upload,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Layers,
  Code2,
  Banknote,
  Eye,
  EyeOff,
  Star,
  ChevronUp,
  ChevronDown,
  Users
} from 'lucide-react';
import { saveStoredItems, resetCatalogToDefault, generateUniqueId, CATEGORIES } from '../services/api';
import {
  compressImageFile,
  saveCatalogImage,
  rekeyCatalogImage,
  isUploadedImageRef
} from '../services/catalogImages';
import {
  getBackendN8NConfig,
  saveBackendN8NConfig,
  getBackendLogs,
  clearBackendLogs,
  dispatchBackendN8NEvent,
  listSheetUsers,
  saveSheetUser,
  deleteSheetUser
} from '../services/n8nService';
import { getPaymentSettings, savePaymentSettings } from '../services/paymentSettings';
import {
  accountVisibleTo,
  canReviseBackend,
  digitsOnly,
  isOwnAccount,
  isSheetOwner,
  listStaffAccounts,
  registerStaffAccount,
  removeStaffAccount,
  ROLE_KEEPER,
  ROLE_OWNER,
} from '../services/roles';
import { formatMmk } from '../services/currency';

const STORE_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all');
const categoryNameFor = (slug) => STORE_CATEGORIES.find((c) => c.id === slug)?.name || 'Audio Tech';

const emptyNewItem = () => ({
  name: '',
  category_slug: 'hardware',
  category_name: 'Audio Tech',
  type: 'physical',
  price: 350000,
  original_price: '',
  stock: 20,
  badge: 'Trending Now',
  badge_type: 'accent',
  image: '/images/headset.jpg',
  imageKey: null,
  draftId: null,
  visible: true,
  featured: false,
  description: '',
  specs: { Warranty: '2 Years International', Delivery: 'Nationwide Myanmar' }
});

const PRESET_PHOTOS = [
  { label: 'Cyber ANC Headset', url: '/images/headset.jpg' },
  { label: 'Nebula Genesis Key', url: '/images/keypass.jpg' },
  { label: 'Chronos Smart Watch', url: '/images/smartwatch.jpg' },
  { label: 'Aetherial AI Orb', url: '/images/orb.jpg' },
  { label: 'Futuristic Cyber Drone', url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Cyberpunk Neon Sneakers', url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80' },
  { label: 'Minimalist Tech Backpack', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80' }
];

export function AdminPanelModal({
  isOpen,
  onClose,
  items,
  onUpdateItems,
  onShowToast,
  user,
}) {
  const [activeAdminTab, setActiveAdminTab] = useState('editor'); // 'editor' | 'add' | 'payment' | 'users' | 'n8n'
  const [editingItem, setEditingItem] = useState(null);
  const [n8nConfig, setN8nConfig] = useState(getBackendN8NConfig());
  const [logs, setLogs] = useState(getBackendLogs());
  const [selectedLog, setSelectedLog] = useState(null);
  const [isTestingN8N, setIsTestingN8N] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(getPaymentSettings());
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [newItem, setNewItem] = useState(emptyNewItem);
  const [sheetUsers, setSheetUsers] = useState([]);
  const [usersFromSheet, setUsersFromSheet] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersNote, setUsersNote] = useState('');
  const [newAccount, setNewAccount] = useState({
    name: '',
    phone: '',
    email: '',
    role: ROLE_KEEPER,
    active: 'Yes',
  });

  const loadSheetUsers = async () => {
    setUsersLoading(true);
    setUsersNote('');
    const listed = await listSheetUsers(user);
    const hideOwner = (rows) => (rows || []).filter((account) => accountVisibleTo(user, account));
    if (!listed.connected) {
      setUsersFromSheet(false);
      setSheetUsers(hideOwner(listStaffAccounts()));
      setUsersNote('The Users sheet is not connected. These accounts cannot be deleted until the sheet accepts the change.');
      setUsersLoading(false);
      return;
    }
    setUsersFromSheet(true);
    setSheetUsers(hideOwner(listed.users));
    setUsersLoading(false);
  };

  useEffect(() => {
    if (!isOpen || activeAdminTab !== 'users') return;
    loadSheetUsers();
  }, [isOpen, activeAdminTab]);

  useEffect(() => {
    if (!items?.length) return;
    setEditingItem((prev) => {
      if (!prev || !items.some((item) => item.id === prev.id)) return items[0];
      return prev;
    });
  }, [items]);

  useEffect(() => {
    const handleLogAdded = () => setLogs(getBackendLogs());
    window.addEventListener('trendy-n8n-log-added', handleLogAdded);
    return () => window.removeEventListener('trendy-n8n-log-added', handleLogAdded);
  }, []);

  if (!isOpen) return null;

  const publishCatalog = (nextItems, message) => {
    try {
      saveStoredItems(nextItems);
      onUpdateItems(nextItems);
      if (message) onShowToast(message);
      return true;
    } catch (error) {
      onShowToast(error.message || 'Could not save the catalog.');
      return false;
    }
  };

  const handleSaveItemEdit = () => {
    if (!editingItem) return;
    const updated = items.map((item) => item.id === editingItem.id ? editingItem : item);
    if (publishCatalog(updated, `Live on storefront: "${editingItem.name}"`)) {
      dispatchBackendN8NEvent('catalog.item_updated', {
        itemId: editingItem.id,
        name: editingItem.name,
        price: editingItem.price,
        stock: editingItem.stock,
        featured: !!editingItem.featured,
        visible: editingItem.visible !== false
      });
    }
  };

  const applyItemPatch = (patch, message) => {
    if (!editingItem) return;
    const nextItem = { ...editingItem, ...patch };
    setEditingItem(nextItem);
    const updated = items.map((item) => item.id === nextItem.id ? nextItem : item);
    publishCatalog(updated, message);
  };

  const handleFileUpload = async (event, target = 'edit') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const blob = await compressImageFile(file);
      if (target === 'edit') {
        if (!editingItem) return;
        const saved = await saveCatalogImage(editingItem.id, blob);
        const nextItem = { ...editingItem, image: saved.url, imageKey: saved.key };
        setEditingItem(nextItem);
        const updated = items.map((item) => item.id === nextItem.id ? nextItem : item);
        publishCatalog(updated, `Photo is live on the storefront for "${nextItem.name}"`);
      } else {
        const draftId = newItem.draftId || `draft-${Date.now()}`;
        const saved = await saveCatalogImage(draftId, blob);
        setNewItem({ ...newItem, draftId, image: saved.url, imageKey: saved.key });
        onShowToast('Photo attached. Publish to put it on the storefront.');
      }
    } catch (error) {
      onShowToast(error.message || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreateNewItem = async (event) => {
    event.preventDefault();
    if (!newItem.name.trim()) return;

    const createdId = generateUniqueId();
    let image = newItem.image;
    let imageKey = newItem.imageKey;
    if (newItem.draftId) {
      const moved = await rekeyCatalogImage(newItem.draftId, createdId);
      if (moved) {
        image = moved.url;
        imageKey = moved.key;
      }
    }

    const created = {
      ...newItem,
      id: createdId,
      image,
      imageKey,
      original_price: newItem.original_price ? Number(newItem.original_price) : null,
      rating: 5.0,
      reviews_count: 1,
      visible: newItem.visible !== false,
      featured: !!newItem.featured,
      draftId: undefined
    };

    const updated = [created, ...items];
    if (!publishCatalog(updated, `Published "${created.name}" to the storefront`)) return;
    setEditingItem(created);
    setNewItem(emptyNewItem());
    setActiveAdminTab('editor');
    dispatchBackendN8NEvent('catalog.item_created', {
      itemId: created.id,
      name: created.name,
      price: created.price
    });
  };

  const handleDeleteItem = (id) => {
    if (items.length <= 1) {
      onShowToast('Keep at least one item in the catalog.');
      return;
    }
    const updated = items.filter((item) => item.id !== id);
    if (publishCatalog(updated, 'Item removed from the storefront')) {
      setEditingItem(updated[0]);
    }
  };

  const moveItem = (id, direction) => {
    const index = items.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    const copy = [...items];
    const [row] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, row);
    publishCatalog(copy, 'Storefront order updated');
  };

  const canCreateUsers = isSheetOwner(user);
  const canDeleteUsers = isSheetOwner(user) && usersFromSheet;

  const handleAddAccount = async () => {
    if (!canCreateUsers) {
      onShowToast('Only the shop account can add a business owner or shop keeper.');
      return;
    }
    const name = newAccount.name.trim();
    const phone = digitsOnly(newAccount.phone);
    const email = newAccount.email.trim();
    if (name.length < 2 || phone.length < 6) {
      onShowToast('Enter a name and a valid phone number.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onShowToast('Enter a valid email, or leave it blank.');
      return;
    }
    const emailKey = email.toLowerCase();
    const phoneKey = phone.replace(/^0+/, '');
    if (emailKey && sheetUsers.some((account) => {
      const accountEmail = String(account.email || '').trim().toLowerCase();
      const accountPhone = digitsOnly(account.phone).replace(/^0+/, '');
      return accountEmail === emailKey && accountPhone !== phoneKey;
    })) {
      onShowToast('That email is already on the Users sheet. Each account needs its own email.');
      return;
    }
    setUsersLoading(true);
    const saved = await saveSheetUser({ ...newAccount, name, phone, email, viewer: user });
    if (!saved.connected || saved.saved === false) {
      setUsersLoading(false);
      onShowToast(saved.message || 'The Users sheet did not add this account.');
      return;
    }
    registerStaffAccount({ name, phone, email, role: newAccount.role });
    setNewAccount({ name: '', phone: '', email: '', role: ROLE_KEEPER, active: 'Yes' });
    await loadSheetUsers();
    onShowToast('Account added to the Users sheet.');
  };

  const handleDeleteAccount = async (account) => {
    if (!isSheetOwner(user) || !usersFromSheet) {
      onShowToast('Only the shop account can delete a user, and the Users sheet has to accept it.');
      return;
    }
    if (isOwnAccount(user, account)) {
      onShowToast('You cannot remove the account you are signed in with.');
      return;
    }
    if (!window.confirm(`Delete ${account.name || account.phone} from the Users sheet?`)) return;
    setUsersLoading(true);
    const removed = await deleteSheetUser({
      phone: account.phone,
      actorPhone: user?.phone,
      actorEmail: user?.email,
    });
    if (!removed.connected || !removed.deleted) {
      setUsersLoading(false);
      onShowToast(removed.message || 'The Users sheet did not remove that account.');
      return;
    }
    removeStaffAccount(account.phone);
    await loadSheetUsers();
    onShowToast('Account deleted from the Users sheet.');
  };

  const handleReset = () => {
    if (confirm('Reset catalog back to original default showcase items?')) {
      const def = resetCatalogToDefault();
      onUpdateItems(def);
      setEditingItem(def[0]);
      onShowToast('Catalog reset to default');
    }
  };

  const isCustomUpload = (item) =>
    isUploadedImageRef(item?.imageKey) || item?.image?.startsWith('blob:');

  // Save n8n backend config
  const backendEditor = canReviseBackend(user);

  const handleSaveN8NConfig = (e) => {
    e.preventDefault();
    if (!canReviseBackend(user)) {
      onShowToast('Only the shop account that set up automation can revise it.');
      return;
    }
    saveBackendN8NConfig(n8nConfig);
    onShowToast('Backend automation settings saved');
  };

  // Test n8n ping
  const handleTestN8N = async () => {
    if (!canReviseBackend(user)) {
      onShowToast('Only the shop account that set up automation can revise it.');
      return;
    }
    setIsTestingN8N(true);
    await dispatchBackendN8NEvent('automation.test_ping', {
      adminAction: 'test_connection',
      message: 'Hello n8n! Backend ping from Trendy Admin Panel',
      activeItemsCount: items.length
    });
    setIsTestingN8N(false);
    onShowToast('Dispatched test ping to n8n backend webhook!');
  };

  return (
    <div className="modal-backdrop-n8n" onClick={onClose}>
      <div className="n8n-console-card admin-panel" style={{ maxWidth: 840, width: '95%' }} onClick={(e) => e.stopPropagation()}>
        <div className="n8n-console-header admin-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="admin-panel-mark">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="admin-panel-title">Trendy Admin Panel</h3>
              <div className="admin-panel-sub">Front Frame Editor & Backend Automation Engine</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleReset}
              className="admin-reset-btn"
              title="Reset default catalog"
            >
              <RefreshCw size={12} /> Reset
            </button>
            <button onClick={onClose} className="admin-close-btn" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeAdminTab === 'editor' ? 'on' : ''}`}
            onClick={() => setActiveAdminTab('editor')}
          >
            <ImageIcon size={15} />
            <span>Edit Photos & Front Frame</span>
          </button>
          <button
            className={`admin-tab ${activeAdminTab === 'add' ? 'on' : ''}`}
            onClick={() => setActiveAdminTab('add')}
          >
            <Plus size={15} />
            <span>Add New Item</span>
          </button>
          <button
            className={`admin-tab ${activeAdminTab === 'payment' ? 'on' : ''}`}
            onClick={() => setActiveAdminTab('payment')}
          >
            <Banknote size={15} />
            <span>Payment & Bank</span>
          </button>
          <button
            className={`admin-tab ${activeAdminTab === 'users' ? 'on' : ''}`}
            onClick={() => setActiveAdminTab('users')}
          >
            <Users size={15} />
            <span>Users</span>
          </button>
          <button
            className={`admin-tab ${activeAdminTab === 'n8n' ? 'on' : ''}`}
            onClick={() => setActiveAdminTab('n8n')}
          >
            <Radio size={15} />
            <span>Backend Automation (n8n)</span>
          </button>
        </div>

        {/* Tab 1: Edit Photos & Front Frame */}
        {activeAdminTab === 'editor' && (
          <div className="n8n-console-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="admin-live-banner">
              Photo, hide, featured, and order apply to the phone frame immediately. Name, price, and copy apply on Save.
            </div>
            <div className="admin-editor-layout" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
              {/* Item Selector List */}
              <div style={{ borderRight: '1px solid rgba(28,25,23,0.08)', paddingRight: 14 }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
                  Storefront catalog ({items.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((it, index) => (
                    <div
                      key={it.id}
                      className={`admin-catalog-row ${editingItem?.id === it.id ? 'active' : ''} ${it.visible === false ? 'hidden' : ''}`}
                      onClick={() => setEditingItem(it)}
                    >
                      <img src={it.image} alt={it.name} />
                      <div className="admin-catalog-row-copy">
                        <div className="admin-catalog-row-name">{it.name}</div>
                        <div className="admin-catalog-row-meta">
                          {formatMmk(it.price)}
                          {it.featured ? ' · Spotlight' : ''}
                          {it.visible === false ? ' · Hidden' : ''}
                        </div>
                      </div>
                      <div className="admin-catalog-row-move">
                        <button type="button" disabled={index === 0} onClick={(e) => { e.stopPropagation(); moveItem(it.id, -1); }} aria-label="Move up">
                          <ChevronUp size={13} />
                        </button>
                        <button type="button" disabled={index === items.length - 1} onClick={(e) => { e.stopPropagation(); moveItem(it.id, 1); }} aria-label="Move down">
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Detail View */}
              {editingItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="admin-front-toggles">
                    <button
                      type="button"
                      className={`admin-toggle-chip ${editingItem.visible !== false ? 'on' : ''}`}
                      onClick={() => applyItemPatch(
                        { visible: editingItem.visible === false },
                        editingItem.visible === false ? 'Item is visible on the storefront' : 'Item hidden from the storefront'
                      )}
                    >
                      {editingItem.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                      {editingItem.visible === false ? 'Hidden' : 'Visible'}
                    </button>
                    <button
                      type="button"
                      className={`admin-toggle-chip ${editingItem.featured ? 'on featured' : ''}`}
                      onClick={() => applyItemPatch(
                        { featured: !editingItem.featured },
                        editingItem.featured ? 'Removed from spotlight' : 'Pinned to storefront spotlight'
                      )}
                    >
                      <Star size={13} fill={editingItem.featured ? 'currentColor' : 'none'} />
                      {editingItem.featured ? 'Spotlight' : 'Not featured'}
                    </button>
                  </div>

                  {/* Photo Management Section */}
                  <div className="admin-photo-box">
                    <div className="admin-photo-box-title">
                      <ImageIcon size={15} />
                      <span>Photo & Media Controls</span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <img
                        src={editingItem.image}
                        alt={editingItem.name}
                        className="admin-photo-preview"
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="form-group-n8n">
                          <label className="form-label-n8n">Photo URL / File Path</label>
                          <input
                            type="text"
                            className="input-n8n"
                            value={isCustomUpload(editingItem) ? '' : editingItem.image}
                            placeholder={isCustomUpload(editingItem) ? 'Uploaded photo is live on the storefront' : 'https:// or /images/...'}
                            onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value, imageKey: undefined })}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label className="admin-upload-btn">
                            <Upload size={13} />
                            <span>{uploadingPhoto ? 'Uploading…' : 'Upload Photo'}</span>
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'edit')} style={{ display: 'none' }} />
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Compressed and applied live</span>
                        </div>
                      </div>
                    </div>

                    {/* Preset Photos Quick Select */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 6 }}>Preset Studio Photos:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {PRESET_PHOTOS.map((p) => (
                          <button
                            key={p.url}
                            type="button"
                            onClick={() => applyItemPatch({ image: p.url, imageKey: undefined }, 'Preset photo live on storefront')}
                            style={{
                              fontSize: '0.7rem',
                              padding: '4px 8px',
                              borderRadius: 4,
                              background: !isCustomUpload(editingItem) && editingItem.image === p.url ? '#1c1917' : '#efece6',
                              color: !isCustomUpload(editingItem) && editingItem.image === p.url ? '#f6f3ee' : '#44403c'
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* General Details Section */}
                  <div className="admin-product-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div className="form-group-n8n">
                      <label className="form-label-n8n">Product Name</label>
                      <input
                        type="text"
                        className="input-n8n"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      />
                    </div>

                    <div className="form-group-n8n">
                      <label className="form-label-n8n">Price (MMK ကျပ်)</label>
                      <input
                        type="number"
                        step="1000"
                        className="input-n8n"
                        value={editingItem.price}
                        onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-group-n8n">
                      <label className="form-label-n8n">Compare-at Price (MMK)</label>
                      <input
                        type="number"
                        step="1000"
                        className="input-n8n"
                        value={editingItem.original_price || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, original_price: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })}
                        placeholder="Optional strike-through"
                      />
                    </div>

                    <div className="form-group-n8n">
                      <label className="form-label-n8n">Stock Count</label>
                      <input
                        type="number"
                        className="input-n8n"
                        value={editingItem.stock || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, stock: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>

                    <div className="form-group-n8n">
                      <label className="form-label-n8n">Badge Label</label>
                      <input
                        type="text"
                        className="input-n8n"
                        value={editingItem.badge || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, badge: e.target.value })}
                        placeholder="e.g., Trending • 4 Left"
                      />
                    </div>

                    <div className="form-group-n8n">
                      <label className="form-label-n8n">Badge Color Theme</label>
                      <select
                        className="input-n8n"
                        value={editingItem.badge_type || 'success'}
                        onChange={(e) => setEditingItem({ ...editingItem, badge_type: e.target.value })}
                      >
                        <option value="success">Green (In Stock / Ships)</option>
                        <option value="cyber">Purple (Digital Pass)</option>
                        <option value="warning">Amber (Limited Stock)</option>
                        <option value="accent">Cyan (Staff Pick / Featured)</option>
                      </select>
                    </div>

                    <div className="form-group-n8n">
                      <label className="form-label-n8n">Category</label>
                      <select
                        className="input-n8n"
                        value={editingItem.category_slug}
                        onChange={(e) => {
                          const slug = e.target.value;
                          applyItemPatch(
                            { category_slug: slug, category_name: categoryNameFor(slug) },
                            `Category live: ${categoryNameFor(slug)}`
                          );
                        }}
                      >
                        {STORE_CATEGORIES.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group-n8n">
                    <label className="form-label-n8n">Item Description</label>
                    <textarea
                      rows={3}
                      className="input-n8n"
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    />
                  </div>

                  {/* Save and Delete Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(28,25,23,0.08)' }}>
                    <button
                      onClick={() => handleDeleteItem(editingItem.id)}
                      style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Trash2 size={14} />
                      <span>Delete Item</span>
                    </button>

                    <button
                      onClick={handleSaveItemEdit}
                      style={{
                        background: '#1c1917',
                        color: '#f6f3ee',
                        padding: '10px 22px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <Save size={15} />
                      <span>Save & Apply to Storefront</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Add New Item */}
        {activeAdminTab === 'add' && (
          <form onSubmit={handleCreateNewItem} className="n8n-console-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1c1917', marginBottom: 8 }}>
              Add a New Item to the Storefront
            </div>
            <p style={{ fontSize: '0.75rem', color: '#78716c', marginBottom: 16 }}>
              Upload a photo, set price and category, then publish. It appears on the phone frame immediately.
            </p>

            <div className="admin-new-photo">
              <img src={newItem.image} alt="" />
              <div>
                <label className="admin-upload-btn">
                  <Upload size={13} />
                  <span>{uploadingPhoto ? 'Uploading…' : 'Upload Photo'}</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'new')} style={{ display: 'none' }} />
                </label>
                <div className="form-group-n8n" style={{ marginTop: 8 }}>
                  <label className="form-label-n8n">Or photo URL</label>
                  <input
                    type="text"
                    className="input-n8n"
                    value={isCustomUpload(newItem) ? '' : newItem.image}
                    placeholder={isCustomUpload(newItem) ? 'Uploaded photo attached' : '/images/headset.jpg'}
                    onChange={(e) => setNewItem({ ...newItem, image: e.target.value, imageKey: null, draftId: null })}
                  />
                </div>
              </div>
            </div>

            <div className="admin-product-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div className="form-group-n8n">
                <label className="form-label-n8n">Item Name *</label>
                <input
                  type="text"
                  className="input-n8n"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Trendy Quantum Earbuds"
                  required
                />
              </div>

              <div className="form-group-n8n">
                <label className="form-label-n8n">Price (MMK ကျပ်) *</label>
                <input
                  type="number"
                  step="1000"
                  className="input-n8n"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="form-group-n8n">
                <label className="form-label-n8n">Compare-at Price (MMK)</label>
                <input
                  type="number"
                  step="1000"
                  className="input-n8n"
                  value={newItem.original_price}
                  onChange={(e) => setNewItem({ ...newItem, original_price: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group-n8n">
                <label className="form-label-n8n">Stock</label>
                <input
                  type="number"
                  className="input-n8n"
                  value={newItem.stock}
                  onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value, 10) || 0 })}
                />
              </div>

              <div className="form-group-n8n">
                <label className="form-label-n8n">Category</label>
                <select
                  className="input-n8n"
                  value={newItem.category_slug}
                  onChange={(e) => {
                    const slug = e.target.value;
                    setNewItem({ ...newItem, category_slug: slug, category_name: categoryNameFor(slug) });
                  }}
                >
                  {STORE_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-n8n">
                <label className="form-label-n8n">Badge</label>
                <input
                  type="text"
                  className="input-n8n"
                  value={newItem.badge}
                  onChange={(e) => setNewItem({ ...newItem, badge: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-front-toggles" style={{ margin: '4px 0 12px' }}>
              <button
                type="button"
                className={`admin-toggle-chip ${newItem.visible !== false ? 'on' : ''}`}
                onClick={() => setNewItem({ ...newItem, visible: newItem.visible === false })}
              >
                {newItem.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                {newItem.visible === false ? 'Hidden after publish' : 'Visible on storefront'}
              </button>
              <button
                type="button"
                className={`admin-toggle-chip ${newItem.featured ? 'on featured' : ''}`}
                onClick={() => setNewItem({ ...newItem, featured: !newItem.featured })}
              >
                <Star size={13} fill={newItem.featured ? 'currentColor' : 'none'} />
                {newItem.featured ? 'Spotlight on publish' : 'Not featured'}
              </button>
            </div>

            <div className="form-group-n8n">
              <label className="form-label-n8n">Description</label>
              <textarea
                rows={2}
                className="input-n8n"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Product description for mobile details..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="submit"
                style={{
                  background: '#1c1917',
                  color: '#f6f3ee',
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Plus size={16} />
                <span>Create & Publish to Storefront</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Payment & Bank Settings */}
        {activeAdminTab === 'payment' && (
          <div className="n8n-console-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: 24 }}>

            {/* Saved confirmation */}
            {paymentSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, marginBottom: 18, fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>
                <CheckCircle2 size={15} /> Payment settings saved — changes are live on the checkout page
              </div>
            )}

            {/* ── SCB / Bank Transfer ───────────────────── */}
            <div className="admin-settings-group">
              <div className="admin-settings-group-title">🏦 Bank Transfer (SCB & Others)</div>
              <p className="admin-settings-desc">This info is shown to customers when they select Bank Transfer at checkout.</p>

              {[
                { key: 'bankName',    label: 'Bank Name',       placeholder: 'e.g. SCB (Siam Commercial Bank)' },
                { key: 'accountName', label: 'Account Name',    placeholder: 'e.g. Your Company Name' },
                { key: 'accountNo',   label: 'Account Number',  placeholder: 'e.g. 123-4-56789-0' },
                { key: 'bankNote',    label: 'Customer Note',   placeholder: 'Instruction for customers after transfer' },
              ].map(f => (
                <div key={f.key} className="admin-settings-field">
                  <label>{f.label}</label>
                  <input
                    value={paymentSettings[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={e => setPaymentSettings(s => ({ ...s, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* ── MPU Card ─────────────────────────────── */}
            <div className="admin-settings-group">
              <div className="admin-settings-group-title">💳 MPU / Credit Card Gateway</div>
              <p className="admin-settings-desc">MPU Merchant ID is used to route card payments. Connect via n8n webhook for live processing.</p>
              {[
                { key: 'mpuMerchantId', label: 'MPU Merchant ID',   placeholder: 'e.g. MPU-MERCHANT-XXXXX' },
                { key: 'mpuNote',       label: 'Customer Note',      placeholder: 'Message shown to card payers' },
              ].map(f => (
                <div key={f.key} className="admin-settings-field">
                  <label>{f.label}</label>
                  <input
                    value={paymentSettings[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={e => setPaymentSettings(s => ({ ...s, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* ── e-Wallet / QR ────────────────────────── */}
            <div className="admin-settings-group">
              <div className="admin-settings-group-title">📱 e-Wallet / PromptPay QR</div>
              <p className="admin-settings-desc">PromptPay ID (phone or Tax ID) — QR code is generated automatically for customers.</p>
              {[
                { key: 'promptPayId',  label: 'PromptPay / QR ID',  placeholder: 'e.g. 0812345678 or 0-1234-56789-01-2' },
                { key: 'ewalletNote',  label: 'Customer Note',       placeholder: 'e.g. Scan with any e-wallet app' },
              ].map(f => (
                <div key={f.key} className="admin-settings-field">
                  <label>{f.label}</label>
                  <input
                    value={paymentSettings[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={e => setPaymentSettings(s => ({ ...s, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* ── Store Contact ─────────────────────────── */}
            <div className="admin-settings-group">
              <div className="admin-settings-group-title">🏪 Store Contact Info</div>
              <p className="admin-settings-desc">Shown on order confirmation and receipts.</p>
              {[
                { key: 'storeName',    label: 'Store Name',     placeholder: 'e.g. Trendy Commerce' },
                { key: 'supportEmail', label: 'Support Email',  placeholder: 'e.g. support@trendy.com' },
                { key: 'supportPhone', label: 'Support Phone',  placeholder: 'e.g. +66 2 XXX XXXX' },
              ].map(f => (
                <div key={f.key} className="admin-settings-field">
                  <label>{f.label}</label>
                  <input
                    value={paymentSettings[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={e => setPaymentSettings(s => ({ ...s, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Save button */}
            <button
              className="admin-save-btn"
              style={{ width: '100%', marginTop: 8, background: '#1c1917', color: '#f6f3ee', boxShadow: 'none' }}
              onClick={() => {
                savePaymentSettings(paymentSettings);
                setPaymentSaved(true);
                onShowToast('✓ Payment & Bank settings saved!');
                setTimeout(() => setPaymentSaved(false), 4000);
              }}
            >
              <Save size={16} />
              Save Payment & Bank Settings
            </button>
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="n8n-console-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="admin-live-banner">
              {canCreateUsers
                ? 'Add or delete other accounts on the Users sheet. The account you are signed in with stays. A shared email does not make two phones the same account.'
                : 'You can see accounts here. Only the shop account can add or delete a user, and that change is saved on the Users sheet.'}
            </div>
            {usersNote && (
              <div className="admin-note">
                <p style={{ fontSize: '0.78rem', color: '#57534e', margin: 0 }}>{usersNote}</p>
              </div>
            )}
            {canCreateUsers && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 0.9fr auto', gap: 8, marginTop: 12 }}>
              <input className="input-n8n" placeholder="Name" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
              <input className="input-n8n" placeholder="09…" inputMode="tel" value={newAccount.phone} onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })} />
              <input className="input-n8n" placeholder="Email (optional)" type="email" value={newAccount.email} onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} />
              <select className="input-n8n" value={newAccount.role} onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}>
                <option value={ROLE_KEEPER}>Shop Keeper</option>
                <option value={ROLE_OWNER}>Business Owner</option>
              </select>
              <button type="button" className="admin-save-btn" onClick={handleAddAccount} disabled={usersLoading}>
                <Plus size={14} /> Add
              </button>
            </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sheetUsers.length === 0 && !usersLoading && (
                <p style={{ fontSize: '0.8rem', color: '#57534e' }}>No accounts on the Users sheet yet.</p>
              )}
              {sheetUsers.map((account) => {
                const signedIn = isOwnAccount(user, account);
                const emailKey = String(account.email || '').trim().toLowerCase();
                const sharedEmail = Boolean(emailKey) && sheetUsers.filter((row) => (
                  String(row.email || '').trim().toLowerCase() === emailKey
                )).length > 1;
                return (
                  <div key={`${account.phone}-${account.role}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: '#f6f3ee' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#1c1917' }}>{account.name || 'Staff'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#57534e' }}>
                        {account.phone} · {account.role} · {account.active === 'No' ? 'Inactive' : 'Active'}
                        {account.email ? ` · ${account.email}` : ''}
                        {sharedEmail ? ' · Shared email' : ''}
                      </div>
                    </div>
                    {signedIn ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#57534e' }}>Signed in</span>
                    ) : canDeleteUsers ? (
                      <button
                        type="button"
                        className="admin-close-btn"
                        aria-label={`Delete ${account.name || account.phone}`}
                        disabled={usersLoading}
                        title="Delete account"
                        onClick={() => handleDeleteAccount(account)}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Backend Automation (n8n) */}
        {activeAdminTab === 'n8n' && (
          <div className="n8n-console-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="admin-note">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1c1917', fontWeight: 700, fontSize: '0.88rem' }}>
                <Radio size={16} />
                <span>Internal Backend Automation (Hidden from Public Users)</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#57534e', marginTop: 4, lineHeight: 1.4 }}>
                This automation engine executes purely in the backend. When customers place orders or save items on the Trendy mobile app, structured payloads are automatically routed to your n8n workflow nodes.
              </p>
            </div>

            {!backendEditor ? (
              <div className="admin-note">
                <p style={{ fontSize: '0.82rem', color: '#1c1917', fontWeight: 700, margin: 0 }}>
                  Backend automation is locked.
                </p>
                <p style={{ fontSize: '0.78rem', color: '#57534e', marginTop: 6, lineHeight: 1.45 }}>
                  Business owners can run the shop. Automation settings stay with the account that set them up.
                </p>
              </div>
            ) : (
            <form onSubmit={handleSaveN8NConfig} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group-n8n">
                <label className="form-label-n8n">n8n Backend Webhook URL</label>
                <input
                  type="url"
                  className="input-n8n"
                  value={n8nConfig.webhookUrl}
                  onChange={(e) => setN8nConfig({ ...n8nConfig, webhookUrl: e.target.value })}
                />
              </div>

              <div className="form-group-n8n">
                <label className="form-label-n8n">Authentication Token (X-Trendy-Backend-Secret)</label>
                <input
                  type="text"
                  className="input-n8n"
                  value={n8nConfig.secretToken}
                  onChange={(e) => setN8nConfig({ ...n8nConfig, secretToken: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    background: '#1c1917',
                    color: '#f6f3ee',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  Save Automation Settings
                </button>

                <button
                  type="button"
                  onClick={handleTestN8N}
                  disabled={isTestingN8N}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(28, 25, 23, 0.12)',
                    color: '#1c1917',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Send size={13} />
                  <span>{isTestingN8N ? 'Sending...' : 'Test n8n Webhook Node'}</span>
                </button>
              </div>
            </form>
            )}

            {backendEditor && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="form-label-n8n">Backend Event Stream ({logs.length})</span>
                {backendEditor && logs.length > 0 && (
                  <button
                    onClick={() => { clearBackendLogs(); setLogs([]); setSelectedLog(null); }}
                    style={{ color: '#ef4444', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Trash2 size={12} /> Clear Stream
                  </button>
                )}
              </div>

              <div className="logs-box-n8n">
                {logs.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    No backend events dispatched yet.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="log-item-row"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      style={{ cursor: 'pointer', background: selectedLog?.id === log.id ? '#efece6' : 'transparent' }}
                    >
                      <div>
                        <span style={{ color: '#1c1917', fontWeight: 600, marginRight: 8 }}>{log.eventType}</span>
                        <span style={{ color: '#64748b' }}>{log.timestamp}</span>
                      </div>
                      <span className={`log-status-badge ${log.status.includes('delivered') ? 'status-delivered' : 'status-simulated'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {selectedLog && (
                <div style={{ marginTop: 10, background: '#f6f3ee', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 8, padding: 12, color: '#1c1917' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#38bdf8', marginBottom: 6 }}>
                    <Code2 size={13} />
                    <span>Payload: {selectedLog.id}</span>
                  </div>
                  <pre style={{ color: '#a5f3fc', fontSize: '0.72rem', overflowX: 'auto', maxHeight: 150, fontFamily: 'var(--font-mono)' }}>
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
