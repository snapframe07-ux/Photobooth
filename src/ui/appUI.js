/**
 * UI Components & Screens Manager (SnapFrame)
 * Manages mobile-first views, asset galleries, and current session photo gallery memory.
 */

export class AppUI {
  constructor() {
    this.currentTab = 'camera'; // 'camera' | 'editor' | 'gallery'
    this.sessionPhotos = [];
  }

  /**
   * Adds a captured/exported photo to the current session memory gallery.
   * @param {string} dataUrl 
   * @returns {Object} Photo object
   */
  addSessionPhoto(dataUrl) {
    const photo = {
      id: `photo-${Date.now()}`,
      dataUrl: dataUrl,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    this.sessionPhotos.unshift(photo);
    return photo;
  }

  /**
   * Returns array of session photos.
   * @returns {Array<Object>}
   */
  getSessionPhotos() {
    return this.sessionPhotos;
  }

  /**
   * Removes a photo from session gallery.
   * @param {string} id 
   */
  removeSessionPhoto(id) {
    this.sessionPhotos = this.sessionPhotos.filter(p => p.id !== id);
  }
}

export const appUI = new AppUI();
