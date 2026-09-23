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
  },
  {
    id: 11,
    name: "MacBook Air 13",
    category_slug: "devices",
    category_name: "Mac & iPhone",
    type: "physical",
    price: 5290000,
    original_price: 5690000,
    rating: 4.8,
    reviews_count: 186,
    stock: 8,
    condition: "brand_new",
    image: "/images/macbook-air-13.png",
    photos: ["/images/macbook-air-13.png"],
    badge: "Ships Today",
    badge_type: "success",
    visible: true,
    featured: true,
    description: "13-inch thin aluminum laptop for daily work, class, and travel. Fanless, all-day battery, and a bright Liquid Retina display.",
    specs: {
      "Display": "13.6-inch Liquid Retina",
      "Chip": "M4",
      "Memory": "16GB unified",
      "Storage": "256GB SSD"
    }
  },
  {
    id: 12,
    name: "MacBook Air 15",
    category_slug: "devices",
    category_name: "Mac & iPhone",
    type: "physical",
    price: 6890000,
    original_price: 7490000,
    rating: 4.7,
    reviews_count: 112,
    stock: 6,
    condition: "brand_new",
    image: "/images/macbook-air-15.png",
    photos: ["/images/macbook-air-15.png"],
    badge: "Bigger Screen",
    badge_type: "accent",
    visible: true,
    description: "15-inch MacBook Air with a wider workspace, midnight finish, and the same thin fanless body.",
    specs: {
      "Display": "15.3-inch Liquid Retina",
      "Chip": "M4",
      "Memory": "16GB unified",
      "Storage": "512GB SSD"
    }
  },
  {
    id: 13,
    name: "MacBook Pro 14",
    category_slug: "devices",
    category_name: "Mac & iPhone",
    type: "physical",
    price: 9450000,
    original_price: 9990000,
    rating: 4.9,
    reviews_count: 154,
    stock: 5,
    condition: "brand_new",
    image: "/images/macbook-pro-14.png",
    photos: ["/images/macbook-pro-14.png"],
    badge: "Pro Pick",
    badge_type: "accent",
    visible: true,
    description: "14-inch MacBook Pro for photo, video, and long work sessions. Liquid Retina XDR display and all-day battery.",
    specs: {
      "Display": "14.2-inch Liquid Retina XDR",
      "Chip": "M4 Pro",
      "Memory": "24GB unified",
      "Storage": "512GB SSD"
    }
  },
  {
    id: 14,
    name: "MacBook Pro 16",
    category_slug: "devices",
    category_name: "Mac & iPhone",
    type: "physical",
    price: 14800000,
    original_price: 15600000,
    rating: 4.9,
    reviews_count: 68,
    stock: 3,
    condition: "brand_new",
    image: "/images/macbook-pro-16.png",
    photos: ["/images/macbook-pro-16.png"],
    badge: "Limited • 3 Left",
    badge_type: "warning",
    visible: true,
    description: "16-inch MacBook Pro in space black. Large XDR display for editing, design, and studio work.",
    specs: {
      "Display": "16.2-inch Liquid Retina XDR",
      "Chip": "M4 Max",
      "Memory": "36GB unified",
      "Storage": "1TB SSD"
    }
  },
  {
    id: 15,
    name: "MacBook Air Starlight",
    category_slug: "devices",
    category_name: "Mac & iPhone",
    type: "physical",
    price: 4990000,
    original_price: 5390000,
    rating: 4.6,
    reviews_count: 91,
    stock: 10,
    condition: "brand_new",
    image: "/images/macbook-air-starlight.png",
    photos: ["/images/macbook-air-starlight.png"],
    badge: "Starlight",
    badge_type: "accent",
    visible: true,
    description: "Starlight gold MacBook Air 13. Light aluminum body for notes, browsing, and everyday carry.",
    specs: {
      "Finish": "Starlight",
      "Display": "13.6-inch Liquid Retina",
      "Chip": "M4",
      "Storage": "256GB SSD"
    }
  },
  {
    id: 16,
    name: "iPhone Duo",
    category_slug: "devices",
    category_name: "Mac & iPhone",
    type: "physical",
    price: 6400000,
    original_price: 6900000,
    rating: 4.8,
    reviews_count: 73,
    stock: 7,
    condition: "brand_new",
    image: "/images/iphone-duo.png",
    photos: ["/images/iphone-duo.png"],
    badge: "Pair Set",
    badge_type: "success",
    visible: true,
    description: "A matched pair of iPhones sold together. Same finish, same storage, ready for two people in one order.",
    specs: {
      "Set": "Two phones",
      "Display": "6.3-inch each",
      "Storage": "256GB each",
      "Finish": "Silver pair"
    }
  },
  {
    id: 17,
    name: "iPhone 18",
    category_slug: "devices",
    category_name: "Mac & iPhone",
    type: "physical",
    price: 4250000,
    original_price: 4590000,
    rating: 4.9,
    reviews_count: 240,
    stock: 12,
    condition: "brand_new",
    image: "/images/iphone-18.png",
    photos: ["/images/iphone-18.png"],
    badge: "New",
    badge_type: "success",
    visible: true,
    featured: true,
    description: "iPhone 18 in starlight. Bright display, all-day battery, and a camera built for daylight and night shots.",
    specs: {
      "Display": "6.3-inch",
      "Chip": "A19",
      "Storage": "256GB",
      "Finish": "Starlight"
    }
  }
];

export const CATEGORIES = [
  { id: "all", name: "All Trendy", icon: "Sparkles" },
  { id: "devices", name: "Mac & iPhone", icon: "Laptop" },
  { id: "hardware", name: "Audio Tech", icon: "Headphones" },
  { id: "digital", name: "Digital Passes", icon: "Key" },
  { id: "smart_tech", name: "Smart Devices", icon: "Watch" },
  { id: "collectibles", name: "Cybernetics", icon: "Cpu" }
];

const DEVICE_IDS = new Set([11, 12, 13, 14, 15, 16, 17]);

function withDeviceListings(items) {
  const present = new Set(items.map((item) => item.id));
  const missing = INITIAL_ITEMS.filter((item) => DEVICE_IDS.has(item.id) && !present.has(item.id));
  return missing.length ? [...items, ...missing] : items;
}

export function getStoredItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = withDeviceListings(migrateCatalogToMmk(parsed));
        markCurrencyMmk();
        const changed = migrated.length !== parsed.length || migrated.some((item, index) => (
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

