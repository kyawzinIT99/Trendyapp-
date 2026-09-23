// Trendy Catalog Data & Admin Storage Service
// Connects to local Ecomerce/Admin backend or uses persisted reactive store

import { persistableCatalog } from './catalogImages';
import { markCurrencyMmk, migrateCatalogToMmk } from './currency';

const STORAGE_KEY = 'trendy_admin_catalog_items';

export const INITIAL_ITEMS = [
  {
    id: 1,
    name: "Trendy CyberPulse Studio ANC",
    category_slug: "hardware",
    category_name: "Audio Tech",
    type: "physical",
    price: 1220000,
    original_price: 1400000,
    rating: 4.9,
    reviews_count: 128,
    stock: 14,
    condition: "brand_new",
    image: "/images/headset.jpg",
    badge: "Trending • Ships Today",
    badge_type: "success",
    visible: true,
    featured: true,
    description: "Studio-grade planar magnetic drivers with active noise cancellation, carbon fiber chassis, and ambient acoustic isolation for audiophile environments.",
    specs: {
      "Driver Unit": "40mm Planar Titanium",
      "Frequency": "10Hz - 48kHz",
      "Battery Life": "42 Hours Continuous",
      "Connectivity": "Bluetooth 5.4 / Lossless USB-C"
    }
  },
  {
    id: 5,
    name: "Trendy AeroBeats Pro Studio Buds",
    category_slug: "hardware",
    category_name: "Audio Tech",
    type: "physical",
    price: 660000,
    original_price: 770000,
    rating: 4.92,
    reviews_count: 94,
    stock: 11,
    condition: "brand_new",
    image: "/images/headset.jpg",
    badge: "Audio Pick",
    badge_type: "accent",
    description: "Ultra-compact true wireless in-ear monitors with adaptive spatial audio head tracking, transparency mode, and titanium ceramic drivers.",
    specs: {
      "Acoustic Architecture": "Beryllium 11mm Dual Driver",
      "Noise Cancellation": "Hybrid Active ANC -45dB",
      "Battery Life": "36 Hours with Charging Vault",
      "Water Resistance": "IPX7 Hydro-Shield"
    }
  },
  {
    id: 2,
    name: "Trendy Prime Genesis Pass",
    category_slug: "digital",
    category_name: "Digital Passes",
    type: "digital",
    price: 665000,
    original_price: null,
    rating: 5.0,
    reviews_count: 84,
    stock: 999,
    condition: "digital_license",
    image: "/images/keypass.jpg",
    badge: "Instant Digital Delivery",
    badge_type: "cyber",
    description: "Decentralized cryptographic access pass unlocking VIP cloud compute pipelines and premium ecosystem perks.",
    specs: {
      "Token Format": "ERC-721 Hybrid Hash",
      "Delivery": "Instant Automated Webhook",
      "Validity": "Perpetual VIP Access"
    }
  },
  {
    id: 3,
    name: "Trendy Chronos Titanium Watch",
    category_slug: "smart_tech",
    category_name: "Smart Devices",
    type: "physical",
    price: 2170000,
    original_price: 2450000,
    rating: 4.85,
    reviews_count: 96,
    stock: 6,
    condition: "brand_new",
    image: "/images/smartwatch.jpg",
    badge: "Limited • 6 Remaining",
    badge_type: "warning",
    description: "Aerospace-grade titanium smart timepiece with micro-OLED dynamic holographic display, ECG monitoring, and sapphire crystal.",
    specs: {
      "Case Material": "Grade 5 Titanium",
      "Glass": "Double Domed Sapphire Crystal",
      "Sensors": "BioPulse ECG, SpO2, Barometer",
      "Water Resistance": "100m / 10 ATM"
    }
  },
  {
    id: 4,
    name: "Trendy Aetherial AI Levitator",
    category_slug: "collectibles",
    category_name: "Cybernetics",
    type: "hardware_iot",
    price: 1660000,
    original_price: 1820000,
    rating: 4.95,
    reviews_count: 42,
    stock: 9,
    condition: "brand_new",
    image: "/images/orb.jpg",
    badge: "Staff Pick",
    badge_type: "accent",
    description: "Magnetic levitation ambient IoT orb with dynamic neural visualizer core. Syncs with backend automation to display real-time operational pulses.",
    specs: {
      "Levitation": "25mm Magnetic Suspension",
      "Illumination": "Dynamic ARGB Neural Array",
      "Connectivity": "Wi-Fi 6 / Bluetooth LE"
    }
  }
];

export const CATEGORIES = [
  { id: "all", name: "All Trendy", icon: "Sparkles" },
  { id: "hardware", name: "Audio Tech", icon: "Headphones" },
  { id: "digital", name: "Digital Passes", icon: "Key" },
  { id: "smart_tech", name: "Smart Devices", icon: "Watch" },
  { id: "collectibles", name: "Cybernetics", icon: "Cpu" }
];

export function getStoredItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = migrateCatalogToMmk(parsed);
        markCurrencyMmk();
        const changed = migrated.some((item, index) => (
          item.price !== parsed[index]?.price || item.original_price !== parsed[index]?.original_price
        ));
        if (changed) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableCatalog(migrated))); } catch { /* keep memory copy */ }
        }
        return migrated;
      }
    }
  } catch (e) {
    console.error("Error reading stored items", e);
  }
  markCurrencyMmk();
  return INITIAL_ITEMS;
}

export function saveStoredItems(items, { notify = true } = {}) {
  const persistable = persistableCatalog(items);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch (error) {
    const quota = error?.name === 'QuotaExceededError' || error?.code === 22;
    throw new Error(quota
      ? 'Catalog storage is full. Uploaded photos are saved separately — click Upload again, then Save.'
      : 'Could not save the catalog.');
  }
  if (notify) {
    window.dispatchEvent(new CustomEvent('trendy-catalog-updated', { detail: persistable }));
  }
  return persistable;
}

export function resetCatalogToDefault() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('trendy-catalog-updated', { detail: INITIAL_ITEMS }));
  return INITIAL_ITEMS;
}

/**
 * Generates a unique numeric ID using timestamp + random suffix
 * Prevents duplicate React key errors when adding items via Admin Panel
 */
export function generateUniqueId() {
  return Date.now() + Math.floor(Math.random() * 9999);
}

