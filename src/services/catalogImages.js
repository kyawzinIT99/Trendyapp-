const DB_NAME = 'trendy_catalog_media';
const STORE = 'images';
const objectUrlCache = new Map();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isUploadedImageRef(value) {
  return typeof value === 'string' && value.startsWith('idb:');
}

/** Uploaded photos stay in the shared phone catalog. They are not part of a person's record. */
export function isPrivatePhoto(value) {
  return typeof value === 'string' && (
    value.startsWith('blob:') || value.startsWith('data:') || value.startsWith('idb:')
  );
}

export function phoneRecordImage(value) {
  if (typeof value !== 'string' || isPrivatePhoto(value)) return '';
  return value;
}

export function catalogPhotoFor(line, catalog) {
  const live = (catalog || []).find((item) => item.id === line?.id);
  if (live?.image) return live.image;
  return phoneRecordImage(line?.image) || '/images/headset.jpg';
}

export function catalogImageKey(itemId) {
  return `idb:${itemId}`;
}

export async function saveCatalogImage(itemId, blob) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(blob, String(itemId));
  });
  db.close();
  const previous = objectUrlCache.get(String(itemId));
  if (previous) URL.revokeObjectURL(previous);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(String(itemId), url);
  return { key: catalogImageKey(itemId), url };
}

export async function loadCatalogImageUrl(itemId) {
  const cached = objectUrlCache.get(String(itemId));
  if (cached) return cached;
  const db = await openDb();
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(String(itemId));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(String(itemId), url);
  return url;
}

export async function getCatalogImageBlob(itemId) {
  const db = await openDb();
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(String(itemId));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

export async function deleteCatalogImage(itemId) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(String(itemId));
  });
  db.close();
  const previous = objectUrlCache.get(String(itemId));
  if (previous) URL.revokeObjectURL(previous);
  objectUrlCache.delete(String(itemId));
}

export async function rekeyCatalogImage(fromId, toId) {
  const blob = await getCatalogImageBlob(fromId);
  if (!blob) return null;
  const saved = await saveCatalogImage(toId, blob);
  if (String(fromId) !== String(toId)) await deleteCatalogImage(fromId);
  return saved;
}

async function migrateDataUrl(item) {
  if (typeof item.image !== 'string' || !item.image.startsWith('data:')) return item;
  try {
    const blob = await (await fetch(item.image)).blob();
    const saved = await saveCatalogImage(item.id, blob);
    return { ...item, imageKey: saved.key, image: saved.url };
  } catch {
    return { ...item, image: '/images/headset.jpg', imageKey: undefined };
  }
}

export async function compressImageFile(file, { maxSize = 1200, quality = 0.82 } = {}) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Please choose a JPG, PNG, or WebP photo');
  }
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read that photo'));
      img.src = sourceUrl;
    });
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
    });
    if (!blob) throw new Error('Could not compress that photo');
    return blob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function persistableCatalog(items) {
  return items.map((item) => {
    const image = isUploadedImageRef(item.imageKey)
      ? item.imageKey
      : isUploadedImageRef(item.image)
        ? item.image
        : (item.image?.startsWith('blob:') || item.image?.startsWith('data:'))
          ? (item.imageKey || '/images/headset.jpg')
          : item.image;
    const { imageKey, draftId, ...rest } = item;
    return { ...rest, image };
  });
}

export async function hydrateCatalog(items) {
  return Promise.all((items || []).map(async (item) => {
    const migrated = await migrateDataUrl(item);
    const key = isUploadedImageRef(migrated.image) ? migrated.image : migrated.imageKey;
    if (!isUploadedImageRef(key)) return migrated;
    const itemId = key.slice(4);
    const url = await loadCatalogImageUrl(itemId);
    return {
      ...migrated,
      imageKey: key,
      image: url || '/images/headset.jpg',
    };
  }));
}

export function catalogNeedsRewrite(items) {
  return (items || []).some((item) =>
    typeof item.image === 'string' && (item.image.startsWith('data:') || item.image.startsWith('blob:'))
  );
}
