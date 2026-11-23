/**
 * UI Components & Screens Manager (SnapFrame)
 * Manages session photo gallery with IndexedDB persistence (falls back to RAM if unavailable).
 */

const DB_NAME = 'snapframe-session-db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const MAX_SAVED_PHOTOS = 30;
export const PHOTO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // เก็บภาพในเครื่อง 7 วัน แล้วลบอัตโนมัติ

export function isPhotoExpired(photo, now = Date.now()) {
  return Boolean(photo && typeof photo.createdAt === 'number' && (now - photo.createdAt) >= PHOTO_TTL_MS);
}

function openPhotoDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

export class AppUI {
  constructor() {
    this.currentTab = 'camera'; // 'camera' | 'editor' | 'gallery'
    this.sessionPhotos = [];
    this.hasPersistentStorage = false;
  }

  /**
   * Loads saved session photos from IndexedDB on startup and deletes photos older than 7 days.
   * @param {number} [now]
   * @returns {Promise<Array<Object>>}
   */
  async initSessionPhotos(now = Date.now()) {
    const db = await openPhotoDb();
    if (!db) {
      this.pruneExpiredPhotos(now);
      return this.sessionPhotos;
    }
    this.hasPersistentStorage = true;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => {
          const rows = Array.isArray(req.result) ? req.result : [];
          const expiredIds = [];
          const valid = [];
          for (const row of rows) {
            if (isPhotoExpired(row, now)) expiredIds.push(row.id);
            else valid.push(row);
          }
          valid.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          this.sessionPhotos = valid;
          if (expiredIds.length > 0) {
            try {
              const delTx = db.transaction(STORE_NAME, 'readwrite');
              const store = delTx.objectStore(STORE_NAME);
              expiredIds.forEach(id => store.delete(id));
            } catch (_) {}
          }
          resolve(this.sessionPhotos);
        };
        req.onerror = () => resolve(this.sessionPhotos);
      } catch (_) {
        resolve(this.sessionPhotos);
      }
    });
  }

  /**
   * Removes photos older than 7 days from memory and IndexedDB.
   * @param {number} [now]
   * @returns {number} Number of removed expired photos
   */
  pruneExpiredPhotos(now = Date.now()) {
    const expiredIds = [];
    this.sessionPhotos = this.sessionPhotos.filter(photo => {
      if (isPhotoExpired(photo, now)) {
        expiredIds.push(photo.id);
        return false;
      }
      return true;
    });
    if (expiredIds.length > 0) {
      openPhotoDb().then(db => {
        if (!db) return;
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          expiredIds.forEach(id => store.delete(id));
        } catch (_) {}
      });
    }
    return expiredIds.length;
  }

  /**
   * Adds a captured/exported photo to the session gallery and persists it to IndexedDB.
   * @param {string} dataUrl
   * @returns {Object} Photo object
   */
  addSessionPhoto(dataUrl, now = Date.now()) {
    this.pruneExpiredPhotos(now);
    const photo = {
      id: `photo-${now}`,
      dataUrl,
      createdAt: now,
      timestamp: new Date(now).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    this.sessionPhotos.unshift(photo);
    const removed = this.sessionPhotos.splice(MAX_SAVED_PHOTOS);
    openPhotoDb().then(db => {
      if (!db) return;
      this.hasPersistentStorage = true;
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(photo);
        removed.forEach(item => store.delete(item.id));
      } catch (_) {}
    });
    return photo;
  }

  /**
   * Returns array of non-expired session photos.
   * @returns {Array<Object>}
   */
  getSessionPhotos(now = Date.now()) {
    this.pruneExpiredPhotos(now);
    return this.sessionPhotos;
  }

  /**
   * Removes a photo from session gallery and IndexedDB.
   * @param {string} id
   */
  removeSessionPhoto(id) {
    this.sessionPhotos = this.sessionPhotos.filter(p => p.id !== id);
    openPhotoDb().then(db => {
      if (!db) return;
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
      } catch (_) {}
    });
  }
}

export const appUI = new AppUI();
