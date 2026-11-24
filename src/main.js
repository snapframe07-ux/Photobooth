import { sharePhoto, copyPhoto, printPhoto, isMobilePhotoDevice } from './modules/photoShare.js';
import { snapshotGifFrame, readGifFrames, encodePhotoGif } from './modules/photoGif.js';
import { FRAMES_CATALOG, STICKERS_CATALOG, STICKER_CATEGORIES, FILTERS_CATALOG } from './data/catalogs.js';
import { renderAppLayout } from './ui/appLayout.js';
import { bindCatalogDeleteButtons, loadSavedCatalog } from './ui/assetGallery.js';
import './style.css';
import { composePhotoStrip, getStripLayout, drawScaledLayers } from './modules/photoStrip.js';
import { buildBuiltinFrameDataUrl, isBuiltinFrame } from './modules/builtinFrames.js';
import { serializeCaptureFrame, restoreCaptureFrame, renderFrameToBlob } from './modules/templateFrame.js';
import { getFrameLayout, clearFrameRectangle, clearSelectedFrameSlots } from './modules/frameSlots.js';
import { applyPixelFilter } from './modules/imageFilters.js';
import { loadImageFromBlob } from './modules/imageLoader.js';
import { playCountdownBeep, playShutterSound } from './modules/soundEffects.js';
import { composeStoryCanvas } from './modules/storyExport.js';
import { exportLiveStripVideo } from './modules/liveStripVideo.js';

// Modules
import {
  initCamera,
  stopCamera,
  switchCamera,
  startCountdown,
  getFacingMode,
  setZoom
} from './modules/camera.js';

import {
  initCanvasEngine,
  setBaseLayerImage,
  addLayer,
  removeLayer,
  updateLayer,
  selectLayer,
  getSelectedLayerId,
  setOnSelectionChange,
  setOnCanvasResize,
  setTargetCanvas,
  loadImage,
  serializeDesignData,
  loadTemplateDesign,
  downloadImage,
  downloadDataUrl,
  exportImage,
  getLayers,
  undo,
  redo,
  resetHistory,
  setOnHistoryChange,
  setDrawMode,
  isDrawMode,
  clearDoodle,
  getDoodleCanvas
} from './modules/canvasEngine.js';

import { removeBackground, cutoutFrameSlots, loadFrameCanvas, floodFillRegion } from './modules/segmenter.js';
import { supabaseService, isSupabaseConfigured } from './modules/supabaseService.js';
import { appUI } from './ui/appUI.js';

let currentUser = null;
let lastUploadedStickerBlob = null;
let lastUploadedStickerUrl = null;

// Camera Studio State
let activeFilterIndex = 0;
let activeTimerSeconds = 3;
let activeBrightness = 1.0;
let activeZoom = 1.0;
// true = กล้องไม่รองรับซูมฮาร์ดแวร์ จึงต้องซูมด้วย CSS transform แทน
// ถ้าฮาร์ดแวร์รับงานแล้วยังใส่ CSS อีกจะกลายเป็นซูมซ้อนสองชั้น
let usingCssZoom = true;
let activeEditorFilter = 'none';   // ฟิลเตอร์ที่ใช้กับภาพถ่ายในหน้าตกแต่ง (เปลี่ยนย้อนกลับได้)
let activeStripBgColor = '#FFF5F7'; // สีพื้นหลังของ Photo Strip
let activeStripBgPattern = 'solid'; // ลายพื้นหลังของ Photo Strip
let activeStripFooterText = 'SnapFrame';
let activeStripShowDate = false;
let activeStripFooterFont = "'IBM Plex Sans Thai', sans-serif";

async function ensureFontLoaded(fontFamily, size = 54) {
  if (!fontFamily || typeof document === 'undefined' || !document.fonts?.load) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`700 ${size}px ${fontFamily}`),
        document.fonts.load(`800 ${size}px ${fontFamily}`)
      ]),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
  } catch (_) {}
}

const STRIP_BG_PRESETS = [
  { color: '#FFF5F7', name: 'ชมพูอ่อน' },
  { color: '#FFFFFF', name: 'ขาว' },
  { color: '#FAF7F2', name: 'ครีม' },
  { color: '#18181B', name: 'ดำ' },
  { color: '#FCE7F3', name: 'พาสเทลชมพู' },
  { color: '#E0F2FE', name: 'ฟ้าอ่อน' },
  { color: '#EDE9FE', name: 'ม่วงอ่อน' },
  { color: '#FEF3C7', name: 'เหลืองอ่อน' }
];

const STRIP_BG_PATTERNS = [
  { id: 'solid', name: 'สีล้วน' },
  { id: 'gradient-pastel', name: 'ไล่เฉดพาสเทล' },
  { id: 'gradient-sunset', name: 'ไล่เฉดซันเซต' },
  { id: 'gradient-mint', name: 'ไล่เฉดมิ้นต์' },
  { id: 'gradient-night', name: 'ไล่เฉดกลางคืน' },
  { id: 'checker', name: 'ตารางหมากรุก' },
  { id: 'dots', name: 'ลายจุด' }
];

// Camera Booth Feel State
let soundEnabled = true;
const RING_LIGHT_MODES = [
  { id: 'off', label: 'ปิด', cls: '' },
  { id: 'white', label: 'ขาว', cls: 'ring-light-white' },
  { id: 'warm', label: 'อุ่น', cls: 'ring-light-warm' },
  { id: 'pink', label: 'ชมพู', cls: 'ring-light-pink' }
];
let ringLightIndex = 0;
let manualShutterMode = false;
let burstGapSeconds = 1;
let manualShutterResolver = null;
let manualMirrorOverride = null; // null = auto ตามกล้องหน้า/หลัง

// Sticker Search / Category / Pin State
let activeStickerCategory = 'all';
let stickerSearchQuery = '';
const PINNED_STORAGE_KEY = 'snapframe-pinned-stickers';
let pinnedStickerIds = new Set((() => {
  try { return JSON.parse(localStorage.getItem(PINNED_STORAGE_KEY) || '[]'); } catch { return []; }
})());

// Doodle Brush State
const DRAW_COLOR_PRESETS = ['#ec4899', '#ffffff', '#18181b', '#facc15', '#38bdf8', '#a855f7', '#22c55e', '#ef4444'];
let activeDrawColor = '#ec4899';
let activeDrawSize = 10;
let activeDrawEraser = false;
let replacingShotIndex = null;
let activeBurstCount = 4;
let gifPhotos = [];
let capturedFrames = [];
let capturedGifFrames = [];
let capturedLiveClips = [];
let capturedContext = null;
let retakingShotIndex = null;
let shootPickTotal = 0; // 0 = ปกติ, 6 = ถ่าย 6 เลือก 4, 8 = ถ่าย 8 เลือก 4
let liveVideoMode = false;

let liveVideoPreviewState = null;

function clearLiveVideoPreview() {
  const player = document.querySelector('#liveVideoPreviewPlayer');
  if (player) {
    player.pause?.();
    player.removeAttribute('src');
    player.load?.();
  }
  const downloadBtn = document.querySelector('#btnDownloadLiveVideo');
  if (downloadBtn) downloadBtn.disabled = true;
  if (liveVideoPreviewState?.url) {
    URL.revokeObjectURL(liveVideoPreviewState.url);
  }
  liveVideoPreviewState = null;
}

function setLiveClips(clips) {
  capturedLiveClips = clips || [];
  const btn = document.querySelector('#btnExportLiveVideo');
  if (btn) {
    btn.disabled = capturedLiveClips.length === 0;
    btn.classList.toggle('hidden', capturedLiveClips.length === 0);
  }
  const dialog = document.querySelector('#liveVideoPreviewDialog');
  if (dialog?.open) dialog.close();
  clearLiveVideoPreview();
}

function setGifPhotos(photos) {
  gifPhotos = photos;
  document.querySelector('#btnExportGif').disabled = photos.length < 2;
  document.querySelector('#gifPreviewDialog').close();
  document.querySelector('#gifPreviewImage').removeAttribute('src');
}
let selectedStripFrame = FRAMES_CATALOG[0];
let stripOrientation = 'vertical';
let isCapturing = false;
let isChangingCamera = false;
let hasChosenStrip = false;
let activeCaptureTemplate = null;
let lastCaptureSettings = null;
let isGridActive = false;
let currentAspectRatio = '4:3';

// Application Layout
document.querySelector('#app').innerHTML = renderAppLayout(STICKERS_CATALOG.length);

// DOM Elements
const tabCamera = document.querySelector('#tabCamera');
const tabEditor = document.querySelector('#tabEditor');
const tabTemplateGallery = document.querySelector('#tabTemplateGallery');
const tabGallery = document.querySelector('#tabGallery');

const viewCamera = document.querySelector('#viewCamera');
const viewEditor = document.querySelector('#viewEditor');
const viewTemplateGallery = document.querySelector('#viewTemplateGallery');
const viewGallery = document.querySelector('#viewGallery');

const videoElement = document.querySelector('#webcam');
const canvasElement = document.querySelector('#photoCanvas');
const canvasContainer = document.querySelector('.canvas-container');
const editorFilterRow = document.querySelector('#editorFilterRow');
const editorFrameRow = document.querySelector('#editorFrameRow');
const editorBgBox = document.querySelector('#editorBgBox');
const editorBgColorRow = document.querySelector('#editorBgColorRow');

// ชุด id ของกรอบ/สติกเกอร์ที่ติดมากับแอป (เก็บก่อนมีการเพิ่มของผู้ใช้)
// ใช้ตัดสินว่าชิ้นไหนลบได้
const BUILTIN_FRAME_IDS = new Set(FRAMES_CATALOG.map(f => f.id));
const BUILTIN_STICKER_IDS = new Set(STICKERS_CATALOG.map(s => s.id));
const countdownOverlay = document.querySelector('#countdownOverlay');
const countdownShotBadge = document.querySelector('#countdownShotBadge');
const countdownNumber = document.querySelector('#countdownNumber');

const btnSwitch = document.querySelector('#btnSwitch');
const btnCapture = document.querySelector('#btnCapture');
const btnRetake = document.querySelector('#btnRetake');
const btnExport = document.querySelector('#btnExport');
const btnSaveToGallery = document.querySelector('#btnSaveToGallery');
const btnSaveTemplate = document.querySelector('#btnSaveTemplate');

// Camera Studio DOM Elements
const previewBox = document.querySelector('#previewBox');
const btnAspectActive = document.querySelector('#btnAspectActive');
const camFilterStrip = document.querySelector('#camFilterStrip');
const camSettingsDialog = document.querySelector('#camSettingsDialog');
const exportDialog = document.querySelector('#exportDialog');

const btnTimerActive = document.querySelector('#btnTimerActive');
const brightnessSlider = document.querySelector('#brightnessSlider');
const zoomSlider = document.querySelector('#zoomSlider');

const camGridOverlay = document.querySelector('#camGridOverlay');
const btnToolGrid = document.querySelector('#btnToolGrid');

const btnToolBurst = document.querySelector('#btnToolBurst');
const burstBadge = document.querySelector('#burstBadge');

const stickerTabCount = document.querySelector('#stickerTabCount');
const layerTabCount = document.querySelector('#layerTabCount');
const stickerSearchInput = document.querySelector('#stickerSearchInput');
const stickerCategoryBar = document.querySelector('#stickerCategoryBar');
const galleryStickers = document.querySelector('#galleryStickers');

let activeEditorTool = 'filter';

const stickerUploader = document.querySelector('#stickerUploader');
const chkRemoveBg = document.querySelector('#chkRemoveBg');
const progressContainer = document.querySelector('#progressContainer');
const progressBarFill = document.querySelector('#progressBarFill');
const progressText = document.querySelector('#progressText');
const btnSaveCustomSticker = document.querySelector('#btnSaveCustomSticker');

const layerList = document.querySelector('#layerList');
const sessionGalleryGrid = document.querySelector('#sessionGalleryGrid');
sessionGalleryGrid.addEventListener('click', async event => {
  const link = event.target.closest('a[download]');
  if (!link) return;
  event.preventDefault();
  try {
    await downloadDataUrl(link.href, link.download);
  } catch (error) {
    showError(`บันทึกรูปไม่สำเร็จ: ${error.message}`);
  }
});
const galleryCount = document.querySelector('#galleryCount');

const errorBanner = document.querySelector('#errorBanner');
const errorMessage = document.querySelector('#errorMessage');
const cameraStatus = document.querySelector('#cameraStatus');
const statusText = document.querySelector('#statusText');

const userBadge = document.querySelector('#userBadge');
const btnAuthModal = document.querySelector('#btnAuthModal');
const authModal = document.querySelector('#authModal');
const btnCloseAuthModal = document.querySelector('#btnCloseAuthModal');
const authForm = document.querySelector('#authForm');
const authEmail = document.querySelector('#authEmail');
const authPassword = document.querySelector('#authPassword');
const authModalTitle = document.querySelector('#authModalTitle');
const btnSubmitAuth = document.querySelector('#btnSubmitAuth');
const btnToggleAuthMode = document.querySelector('#btnToggleAuthMode');
const authToggleText = document.querySelector('#authToggleText');

const saveTemplateModal = document.querySelector('#saveTemplateModal');

const frameCutoutModal = document.querySelector('#frameCutoutModal');
const frameCutoutCanvas = document.querySelector('#frameCutoutCanvas');
const cutoutTolerance = document.querySelector('#cutoutTolerance');
const cutoutToleranceValue = document.querySelector('#cutoutToleranceValue');
const btnCloseCutoutModal = document.querySelector('#btnCloseCutoutModal');
const btnCutoutReset = document.querySelector('#btnCutoutReset');
const btnCutoutCancel = document.querySelector('#btnCutoutCancel');
const btnCutoutApply = document.querySelector('#btnCutoutApply');
const btnCloseTemplateModal = document.querySelector('#btnCloseTemplateModal');
const saveTemplateForm = document.querySelector('#saveTemplateForm');
const tplName = document.querySelector('#tplName');
const chkSharePublic = document.querySelector('#chkSharePublic');

const tabMyTemplates = document.querySelector('#tabMyTemplates');
const tabSharedTemplates = document.querySelector('#tabSharedTemplates');
const templateGrid = document.querySelector('#templateGrid');

let authMode = 'login';
let templateCategory = 'my';


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeImageSrc(src) {
  return typeof src === 'string' && /^(https?:\/\/|data:image\/(png|jpeg|webp|svg\+xml);|blob:|\/|\.)/i.test(src);
}

function showToast(message, type = 'info') {
  const container = document.querySelector('#toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `app-toast ${type}`;
  toast.textContent = message;
  container.append(toast);
  setTimeout(() => toast.remove(), 3500);
}

function openFeedbackDialog(message, { mode = 'confirm', defaultValue = '', confirmText = 'ตกลง', cancelText = 'ยกเลิก', danger = false } = {}) {
  const dialog = document.querySelector('#appFeedbackDialog');
  const msgEl = document.querySelector('#appFeedbackMessage');
  const inputEl = document.querySelector('#appFeedbackInput');
  const btnConfirm = document.querySelector('#appFeedbackConfirm');
  const btnCancel = document.querySelector('#appFeedbackCancel');
  if (!dialog) {
    return Promise.resolve(mode === 'prompt' ? defaultValue : true);
  }
  msgEl.textContent = message;
  btnConfirm.textContent = confirmText;
  btnCancel.textContent = cancelText;
  btnConfirm.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  if (mode === 'prompt') {
    inputEl.value = defaultValue;
    inputEl.classList.remove('hidden');
  } else {
    inputEl.classList.add('hidden');
  }
  return new Promise(resolve => {
    const cleanup = result => {
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
      inputEl.removeEventListener('keydown', onKeydown);
      if (dialog.open) dialog.close();
      resolve(result);
    };
    const onConfirm = () => cleanup(mode === 'prompt' ? inputEl.value : true);
    const onCancel = () => cleanup(mode === 'prompt' ? null : false);
    const onKeydown = e => { if (e.key === 'Enter') { e.preventDefault(); onConfirm(); } };
    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);
    inputEl.addEventListener('keydown', onKeydown);
    dialog.showModal();
    if (mode === 'prompt') inputEl.select();
  });
}

function showConfirmDialog(message, options = {}) {
  return openFeedbackDialog(message, { ...options, mode: 'confirm' });
}

function showPromptDialog(message, defaultValue = '', options = {}) {
  return openFeedbackDialog(message, { ...options, mode: 'prompt', defaultValue });
}

// Init Canvas Engine
initCanvasEngine(canvasElement);
renderStickerCategories();
renderStickerGallery();
renderEditorFilterRow();
renderEditorFrameRow();
renderEditorBgColorRow();
renderDrawColorRow();

const btnUndo = document.querySelector('#btnUndo');
const btnRedo = document.querySelector('#btnRedo');
setOnHistoryChange(({ canUndo, canRedo }) => {
  if (btnUndo) btnUndo.disabled = !canUndo;
  if (btnRedo) btnRedo.disabled = !canRedo;
});
btnUndo?.addEventListener('click', () => { undo(); refreshLayerListUI(); });
btnRedo?.addEventListener('click', () => { redo(); refreshLayerListUI(); });

// Keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo), Delete/Backspace (Remove selected layer)
window.addEventListener('keydown', e => {
  if (viewEditor.classList.contains('hidden')) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    refreshLayerListUI();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
    refreshLayerListUI();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    const selId = getSelectedLayerId();
    if (selId && selId !== 'base-layer') {
      e.preventDefault();
      removeLayer(selId);
      refreshLayerListUI();
    }
  }
});

// โหลดคลังภาพที่บันทึกไว้ใน IndexedDB เพื่อให้รูปอยู่ครบแม้รีเฟรชหน้า
appUI.initSessionPhotos().then(photos => {
  galleryCount.textContent = photos.length;
});

// แจ้งเตือนก่อนปิดหน้าหากกำลังตกแต่งภาพอยู่ หรืออุปกรณ์ไม่รองรับการจัดเก็บถาวร
window.addEventListener('beforeunload', event => {
  const hasUnsavedEditorWork = capturedFrames.length > 0 && !viewEditor.classList.contains('hidden');
  const hasVolatilePhotos = !appUI.hasPersistentStorage && appUI.getSessionPhotos().length > 0;
  if (hasUnsavedEditorWork || hasVolatilePhotos) {
    event.preventDefault();
    event.returnValue = '';
  }
});

setOnSelectionChange(() => {
  refreshLayerListUI();
});

// กล่อง canvas ยืดตามภาพจริงทุกครั้งที่ขนาดเปลี่ยน (ถ่ายใหม่ / ใส่กรอบคนละสัดส่วน / โหลดเทมเพลต)
setOnCanvasResize(() => syncCanvasContainerRatio());

// Request camera access only after choosing a frame.
renderStripSetup();
updateStatus(false, 'เลือกกรอบก่อนเริ่มถ่ายภาพ');

// Init Auth listener
if (isSupabaseConfigured) {
  let loadedStickersUserKey = null;
  const syncAuthAndStickers = user => {
    updateUserAuthUI(user);
    const key = user?.id || 'guest';
    if (loadedStickersUserKey !== key) {
      loadedStickersUserKey = key;
      loadSavedStickersFromSupabase();
    }
  };
  supabaseService.getCurrentUser().then(syncAuthAndStickers);
  supabaseService.onAuthStateChange(syncAuthAndStickers);
}

function updateUserAuthUI(user) {
  currentUser = user;
  if (user) {
    userBadge.textContent = `👤 ${user.email.split('@')[0]}`;
    userBadge.classList.add('member');
    btnAuthModal.textContent = '🚪 ออกจากระบบ';
  } else {
    userBadge.textContent = 'Guest Mode';
    userBadge.classList.remove('member');
    btnAuthModal.textContent = '🔑 เข้าสู่ระบบ';
  }
}

function savePinnedStickers() {
  try { localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...pinnedStickerIds])); } catch (_) {}
}

function renderStickerCategories() {
  if (!stickerCategoryBar) return;
  stickerCategoryBar.innerHTML = STICKER_CATEGORIES.map(cat => `
    <button type="button" class="bg-pattern-chip ${activeStickerCategory === cat.id ? 'selected' : ''}" data-cat="${cat.id}">${escapeHtml(cat.name)}</button>
  `).join('');
  stickerCategoryBar.querySelectorAll('.bg-pattern-chip').forEach(btn => {
    btn.addEventListener('click', e => {
      activeStickerCategory = e.currentTarget.dataset.cat;
      renderStickerCategories();
      renderStickerGallery();
    });
  });
}

stickerSearchInput?.addEventListener('input', e => {
  stickerSearchQuery = e.target.value.trim().toLowerCase();
  renderStickerGallery();
});

/**
 * Render Sticker Gallery Carousel (with search, category filter & pinning)
 */
function renderStickerGallery() {
  const filtered = STICKERS_CATALOG
    .filter(s => {
      if (activeStickerCategory === 'pinned' && !pinnedStickerIds.has(s.id)) return false;
      if (activeStickerCategory !== 'all' && activeStickerCategory !== 'pinned' && (s.category || 'doodle') !== activeStickerCategory) return false;
      if (stickerSearchQuery && !s.name.toLowerCase().includes(stickerSearchQuery)) return false;
      return true;
    })
    .sort((a, b) => Number(pinnedStickerIds.has(b.id)) - Number(pinnedStickerIds.has(a.id)));

  if (filtered.length === 0) {
    galleryStickers.innerHTML = '<p class="empty-layers" style="width:100%">ไม่พบสติกเกอร์ในหมวดหมู่นี้</p>';
    stickerTabCount.textContent = STICKERS_CATALOG.length;
    return;
  }

  galleryStickers.innerHTML = filtered.map(s => {
    const isPinned = pinnedStickerIds.has(s.id);
    return `
      <div class="gallery-item sticker-item" data-src="${escapeHtml(s.src)}" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.name)}">
        <button type="button" class="btn-item-pin ${isPinned ? 'pinned' : ''}" data-pin="${escapeHtml(s.id)}" title="${isPinned ? 'เลิกปักหมุด' : 'ปักหมุดสติกเกอร์นี้'}">📌</button>
        <img src="${escapeHtml(s.src)}" alt="${escapeHtml(s.name)}" />
        <span class="item-name">${escapeHtml(s.name)}</span>
        ${BUILTIN_STICKER_IDS.has(s.id) ? '' : `<button class="btn-item-del" data-del="${escapeHtml(s.id)}" title="ลบสติกเกอร์นี้">✖️</button>`}
      </div>
    `;
  }).join('');

  galleryStickers.querySelectorAll('.btn-item-pin').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.pin;
      if (pinnedStickerIds.has(id)) pinnedStickerIds.delete(id);
      else pinnedStickerIds.add(id);
      savePinnedStickers();
      renderStickerGallery();
    });
  });

  bindCatalogDeleteButtons(galleryStickers, STICKERS_CATALOG, {
    label: 'สติกเกอร์',
    render: renderStickerGallery,
    deleteRemote: id => currentUser && isSupabaseConfigured ? supabaseService.deleteSticker(id) : null,
    showError,
    confirmAction: msg => showConfirmDialog(msg, { confirmText: 'ลบ', danger: true })
  });

  galleryStickers.querySelectorAll('.sticker-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (isDrawMode()) toggleDrawMode(false);
      const src = e.currentTarget.dataset.src;
      const id = e.currentTarget.dataset.id;
      const name = e.currentTarget.dataset.name || 'สติกเกอร์';
      await addLayer({
        type: 'sticker',
        image: src,
        label: name,
        id: `sticker-${id}-${Date.now().toString().substring(8)}`,
        x: (canvasElement.width || 960) * (0.3 + Math.random() * 0.4),
        y: (canvasElement.height || 720) * (0.25 + Math.random() * 0.4),
        scale: 1,
        rotation: 0
      });
      refreshLayerListUI();
    });
  });

  stickerTabCount.textContent = STICKERS_CATALOG.length;
}

/**
 * ประกอบ Photo Strip ใหม่จากภาพดิบแต่ละช็อต + ฟิลเตอร์เฉพาะรูป + พื้นหลัง + กรอบ
 * ทำให้เปลี่ยนฟิลเตอร์ย้อนกลับได้ และฟิลเตอร์ไม่ย้อมสีพื้นหลังหรือกรอบรูป
 */
function rebuildEditorStrip() {
  if (capturedFrames.length > 0 && capturedContext) {
    const strip = composePhotoStrip(
      capturedFrames,
      capturedContext.decoration,
      capturedContext.aspectRatio,
      capturedContext.frameLayout,
      capturedContext.stripOrientation,
      {
        bgColor: activeStripBgColor,
        bgPattern: activeStripBgPattern,
        filter: activeEditorFilter,
        footerText: activeStripFooterText,
        showDate: activeStripShowDate,
        footerFont: activeStripFooterFont
      }
    );
    setTargetCanvas(canvasElement);
    setBaseLayerImage(strip);
    updateLayer('base-layer', { filter: 'none' });
  } else {
    updateLayer('base-layer', { filter: activeEditorFilter });
  }
}

/**
 * แถวฟิลเตอร์ในหน้าตกแต่ง — เปลี่ยนฟิลเตอร์หลังถ่ายได้โดยไม่ย้อมสีกรอบหรือพื้นหลังแถบ
 */
function renderEditorFilterRow() {
  if (!editorFilterRow) return;

  editorFilterRow.innerHTML = FILTERS_CATALOG.map(f => `
    <div class="gallery-item filter-item ${f.css === activeEditorFilter ? 'selected' : ''}" data-css="${f.css}">
      <div class="filter-swatch-box ${f.class}"></div>
      <span class="item-name">${f.name}</span>
    </div>
  `).join('');

  editorFilterRow.querySelectorAll('.filter-item').forEach(item => {
    item.addEventListener('click', (e) => {
      activeEditorFilter = e.currentTarget.dataset.css;
      rebuildEditorStrip();
      renderEditorFilterRow();
    });
  });
}

/**
 * แถวเปลี่ยนกรอบรูปในหน้าตกแต่ง (หลังถ่าย)
 */
function renderEditorFrameRow() {
  if (!editorFrameRow) return;
  const shotCount = capturedFrames.length;
  const availableFrames = FRAMES_CATALOG.filter(f =>
    BUILTIN_FRAME_IDS.has(f.id) || (f.stripUpload && (!f.layout || !shotCount || f.layout.slots.length === shotCount))
  );
  const currentFrameId = capturedContext ? (capturedContext.frame?.id || null) : (selectedStripFrame?.id || null);

  editorFrameRow.innerHTML = `
    <div class="gallery-item none-item ${currentFrameId === null ? 'selected' : ''}" data-frame-id="">
      <span class="none-icon">🚫</span>
      <span class="item-name">ไม่ใช้กรอบ</span>
    </div>
    ${availableFrames.map(f => `
      <div class="gallery-item frame-item ${f.id === currentFrameId ? 'selected' : ''}" data-frame-id="${escapeHtml(f.id)}">
        <img src="${escapeHtml(f.src)}" alt="${escapeHtml(f.name)}" />
        <span class="item-name">${escapeHtml(f.name)}</span>
      </div>
    `).join('')}
  `;

  editorFrameRow.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.frameId;
      const nextFrame = id ? availableFrames.find(f => f.id === id) || null : null;
      selectedStripFrame = nextFrame;
      try {
        hideError();
        if (capturedFrames.length > 0 && capturedContext) {
          const nextLayout = nextFrame?.layout || null;
          const outputLayout = nextLayout || getStripLayout(
            capturedFrames.length, 960, capturedContext.aspectRatio, capturedContext.stripOrientation
          );
          const decoration = await loadStripDecoration(nextFrame, outputLayout.width, outputLayout.height);
          capturedContext = { ...capturedContext, frame: nextFrame, decoration, frameLayout: nextLayout };
          if (lastCaptureSettings) {
            lastCaptureSettings = {
              ...lastCaptureSettings,
              frame: serializeCaptureFrame(nextFrame, decoration, outputLayout)
            };
          }
          rebuildEditorStrip();
        } else {
          const existingFrame = getLayers().find(l => l.type === 'frame');
          if (!nextFrame) {
            if (existingFrame) removeLayer(existingFrame.id);
          } else {
            const src = buildBuiltinFrameDataUrl(nextFrame.id, canvasElement.width, canvasElement.height) || nextFrame.src;
            await addLayer({ type: 'frame', image: src, label: nextFrame.name, id: `frame-${nextFrame.id}` });
          }
          refreshLayerListUI();
        }
        renderEditorFrameRow();
        renderEditorBgColorRow();
      } catch (err) {
        showError(`เปลี่ยนกรอบไม่สำเร็จ: ${err.message}`);
      }
    });
  });
}

/**
 * แถวเลือกสีพื้นหลังของ Photo Strip ในหน้าตกแต่ง
 */
function renderEditorBgColorRow() {
  if (!editorBgColorRow || !editorBgBox) return;
  const canChangeBg = capturedFrames.length > 0 && capturedContext && !capturedContext.frameLayout;
  const tabBg = document.querySelector('#toolTabBg');
  tabBg?.classList.toggle('hidden', !canChangeBg);
  editorBgBox.classList.toggle('hidden', !canChangeBg);
  if (!canChangeBg) {
    if (activeEditorTool === 'bg') switchEditorTool('filter');
    return;
  }

  editorBgColorRow.innerHTML = `
    ${STRIP_BG_PRESETS.map(p => `
      <button type="button"
        class="bg-color-swatch ${activeStripBgColor.toLowerCase() === p.color.toLowerCase() ? 'selected' : ''}"
        data-color="${p.color}"
        style="background: ${p.color}"
        title="${p.name}"
        aria-label="สีพื้นหลัง ${p.name}"
        aria-pressed="${activeStripBgColor.toLowerCase() === p.color.toLowerCase()}"></button>
    `).join('')}
    <label class="bg-color-picker" title="เลือกสีพื้นหลังเอง">
      <span>กำหนดเอง</span>
      <input type="color" id="editorBgColorInput" value="${activeStripBgColor}" aria-label="เลือกสีพื้นหลังแถบภาพเอง">
    </label>
  `;

  editorBgColorRow.querySelectorAll('.bg-color-swatch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeStripBgColor = e.currentTarget.dataset.color;
      rebuildEditorStrip();
      renderEditorBgColorRow();
    });
  });

  const colorInput = editorBgColorRow.querySelector('#editorBgColorInput');
  colorInput?.addEventListener('input', (e) => {
    activeStripBgColor = e.target.value;
    rebuildEditorStrip();
    editorBgColorRow.querySelectorAll('.bg-color-swatch').forEach(b => b.classList.remove('selected'));
  });

  const patternRow = document.querySelector('#editorBgPatternRow');
  if (patternRow) {
    patternRow.innerHTML = STRIP_BG_PATTERNS.map(p => `
      <button type="button" class="bg-pattern-chip ${activeStripBgPattern === p.id ? 'selected' : ''}" data-pattern="${p.id}">${p.name}</button>
    `).join('');
    patternRow.querySelectorAll('.bg-pattern-chip').forEach(btn => {
      btn.addEventListener('click', e => {
        activeStripBgPattern = e.currentTarget.dataset.pattern;
        rebuildEditorStrip();
        renderEditorBgColorRow();
      });
    });
  }
}

document.querySelector('#stripFooterTextInput')?.addEventListener('input', e => {
  activeStripFooterText = e.target.value;
  rebuildEditorStrip();
});
document.querySelector('#stripFooterFontSelect')?.addEventListener('change', async e => {
  activeStripFooterFont = e.target.value;
  const input = document.querySelector('#stripFooterTextInput');
  if (input) input.style.fontFamily = activeStripFooterFont;
  await ensureFontLoaded(activeStripFooterFont, 20);
  rebuildEditorStrip();
});
document.querySelector('#chkStripShowDate')?.addEventListener('change', e => {
  activeStripShowDate = e.target.checked;
  rebuildEditorStrip();
});

function loadSavedStickersFromSupabase() {
  if (!isSupabaseConfigured) return;
  return loadSavedCatalog(STICKERS_CATALOG, {
    fetchRecords: () => supabaseService.getStickers(),
    idKey: 'sticker_id',
    fallbackName: 'สติกเกอร์บันทึก',
    render: renderStickerGallery
  });
}

function syncEditorTabState() {
  const hasPhoto = getLayers().some(layer => layer.type === 'base');
  if (tabEditor) {
    tabEditor.disabled = !hasPhoto;
    tabEditor.title = hasPhoto ? 'ตกแต่งภาพถ่าย' : 'ถ่ายหรือนำเข้าภาพก่อนเพื่อเข้าหน้าตกแต่ง';
  }
}

/**
 * Tab Navigation
 */
function switchTab(tabName) {
  if (isCapturing || isChangingCamera) return;
  if (tabName === 'camera' && !hasChosenStrip) tabName = 'setup';
  syncEditorTabState();
  if (tabName === 'editor' && !getLayers().some(layer => layer.type === 'base')) {
    showError('เลือกกรอบและถ่ายภาพก่อนดูรูปที่ได้');
    return;
  }
  document.querySelector('#tabSetup').classList.remove('active');
  document.querySelector('#viewSetup').classList.add('hidden');
  if (tabName !== 'camera') {
    if (camSettingsDialog?.open) camSettingsDialog.close();
    handleStopCamera();
  }
  if (tabName !== 'editor' && isDrawMode()) toggleDrawMode(false);
  tabCamera.classList.remove('active');
  tabEditor.classList.remove('active');
  tabTemplateGallery.classList.remove('active');
  tabGallery.classList.remove('active');

  viewCamera.classList.add('hidden');
  viewEditor.classList.add('hidden');
  viewTemplateGallery.classList.add('hidden');
  viewGallery.classList.add('hidden');

  if (tabName === 'setup') {
    document.querySelector('#tabSetup').classList.add('active');
    document.querySelector('#viewSetup').classList.remove('hidden');
    renderStripSetup();
    updateStatus(false, 'เลือกกรอบก่อนเริ่มถ่ายภาพ');
  } else if (tabName === 'camera') {
    updateStripSummary();
    tabCamera.classList.add('active');
    viewCamera.classList.remove('hidden');
    handleStartCamera();
  } else if (tabName === 'editor') {
    tabEditor.classList.add('active');
    viewEditor.classList.remove('hidden');
    refreshLayerListUI();
  } else if (tabName === 'templates') {
    tabTemplateGallery.classList.add('active');
    viewTemplateGallery.classList.remove('hidden');
    loadTemplateGallery();
  } else if (tabName === 'gallery') {
    tabGallery.classList.add('active');
    viewGallery.classList.remove('hidden');
    renderSessionGallery();
  }
}

tabCamera.addEventListener('click', () => { retakingShotIndex = null; switchTab('camera'); });
tabEditor.addEventListener('click', () => switchTab('editor'));
tabTemplateGallery.addEventListener('click', () => switchTab('templates'));
tabGallery.addEventListener('click', () => switchTab('gallery'));

function switchEditorTool(tool) {
  activeEditorTool = tool;
  if (tool !== 'draw' && isDrawMode()) toggleDrawMode(false);
  document.querySelectorAll('.editor-tool-tab').forEach(btn => {
    const isMatch = btn.dataset.tool === tool;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-selected', String(isMatch));
  });
  document.querySelectorAll('.editor-tool-panel').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.panel !== tool);
  });
}

document.querySelectorAll('.editor-tool-tab').forEach(btn => {
  btn.addEventListener('click', () => switchEditorTool(btn.dataset.tool));
});

// Unified Export / Save Dialog
document.querySelector('#btnOpenExportDialog')?.addEventListener('click', () => {
  if (exportDialog && !exportDialog.open) exportDialog.showModal();
});
document.querySelector('#btnCloseExportDialog')?.addEventListener('click', () => {
  exportDialog?.close();
});

// Text Layer Builder
function buildTextLayerDataUrl(text, { font, color, stroke, showBg, bgColor }) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const fontSize = 54;
  g.font = `800 ${fontSize}px ${font}`;
  const metrics = g.measureText(text);
  const padX = showBg ? 36 : 22;
  const padY = showBg ? 24 : 18;
  c.width = Math.max(120, Math.ceil(metrics.width + padX * 2));
  c.height = Math.ceil(fontSize * 1.35 + padY * 2);

  if (showBg) {
    const r = Math.min(28, c.height / 2);
    g.fillStyle = bgColor;
    g.beginPath();
    g.moveTo(r, 0);
    g.lineTo(c.width - r, 0);
    g.quadraticCurveTo(c.width, 0, c.width, r);
    g.lineTo(c.width, c.height - r);
    g.quadraticCurveTo(c.width, c.height, c.width - r, c.height);
    g.lineTo(r, c.height);
    g.quadraticCurveTo(0, c.height, 0, c.height - r);
    g.lineTo(0, r);
    g.quadraticCurveTo(0, 0, r, 0);
    g.closePath();
    g.fill();
  }

  g.font = `800 ${fontSize}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (stroke) {
    g.lineJoin = 'round';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(24, 24, 27, 0.72)';
    g.strokeText(text, c.width / 2, c.height / 2);
  }
  g.fillStyle = color;
  g.fillText(text, c.width / 2, c.height / 2);
  return c.toDataURL('image/png');
}

const textLayerFontSelect = document.querySelector('#textLayerFont');
const textLayerInputEl = document.querySelector('#textLayerInput');
const syncTextInputFont = async () => {
  const font = textLayerFontSelect?.value || "'IBM Plex Sans Thai', sans-serif";
  if (textLayerInputEl) textLayerInputEl.style.fontFamily = font;
  await ensureFontLoaded(font, 54);
};
textLayerFontSelect?.addEventListener('change', syncTextInputFont);
syncTextInputFont();

document.querySelector('#btnAddTextLayer')?.addEventListener('click', async () => {
  const input = document.querySelector('#textLayerInput');
  const text = input?.value.trim();
  if (!text) {
    showToast('กรุณาพิมพ์ข้อความก่อนเพิ่มลงภาพ');
    input?.focus();
    return;
  }
  const font = document.querySelector('#textLayerFont')?.value || "'IBM Plex Sans Thai', sans-serif";
  await ensureFontLoaded(font, 54);
  const src = buildTextLayerDataUrl(text, {
    font,
    color: document.querySelector('#textLayerColor')?.value || '#ffffff',
    stroke: Boolean(document.querySelector('#chkTextStroke')?.checked),
    showBg: Boolean(document.querySelector('#chkTextBg')?.checked),
    bgColor: document.querySelector('#textLayerBgColor')?.value || '#ec4899'
  });
  await addLayer({
    type: 'sticker',
    image: src,
    label: `ข้อความ: ${text}`,
    id: `text-${Date.now()}`,
    x: (canvasElement.width || 960) / 2,
    y: (canvasElement.height || 720) / 2,
    scale: 1,
    rotation: 0
  });
  input.value = '';
  refreshLayerListUI();
  showToast('เพิ่มข้อความลงภาพแล้ว — ลาก ย่อ/ขยาย หรือหมุนได้เลย', 'success');
});

// Doodle / Brush Pen Controls
function toggleDrawMode(force) {
  const next = typeof force === 'boolean' ? force : !isDrawMode();
  setDrawMode(next, { color: activeDrawColor, size: activeDrawSize, eraser: activeDrawEraser });
  const btn = document.querySelector('#btnToggleDrawMode');
  if (btn) {
    btn.setAttribute('aria-pressed', String(next));
    btn.textContent = next ? '✅ เสร็จสิ้นการวาด' : '✏️ เริ่มวาดบนภาพ';
    btn.classList.toggle('btn-primary', !next);
    btn.classList.toggle('btn-secondary', next);
  }
}

function renderDrawColorRow() {
  const row = document.querySelector('#drawColorRow');
  if (!row) return;
  row.innerHTML = DRAW_COLOR_PRESETS.map(c => `
    <button type="button" class="bg-color-swatch ${!activeDrawEraser && activeDrawColor.toLowerCase() === c.toLowerCase() ? 'selected' : ''}" data-draw-color="${c}" style="background:${c}" aria-label="สีแปรง ${c}"></button>
  `).join('');
  row.querySelectorAll('.bg-color-swatch').forEach(btn => {
    btn.addEventListener('click', e => {
      activeDrawColor = e.currentTarget.dataset.drawColor;
      activeDrawEraser = false;
      document.querySelector('#drawColorInput').value = activeDrawColor;
      document.querySelector('#btnDrawEraser')?.classList.remove('active');
      document.querySelector('#btnDrawEraser')?.setAttribute('aria-pressed', 'false');
      if (isDrawMode()) setDrawMode(true, { color: activeDrawColor, eraser: false });
      renderDrawColorRow();
    });
  });
}

document.querySelector('#btnToggleDrawMode')?.addEventListener('click', () => toggleDrawMode());
document.querySelector('#drawColorInput')?.addEventListener('input', e => {
  activeDrawColor = e.target.value;
  activeDrawEraser = false;
  document.querySelector('#btnDrawEraser')?.classList.remove('active');
  if (isDrawMode()) setDrawMode(true, { color: activeDrawColor, eraser: false });
  renderDrawColorRow();
});
document.querySelector('#drawSizeSlider')?.addEventListener('input', e => {
  activeDrawSize = Number(e.target.value) || 10;
  document.querySelector('#drawSizeValue').textContent = String(activeDrawSize);
  if (isDrawMode()) setDrawMode(true, { size: activeDrawSize });
});
document.querySelector('#btnDrawEraser')?.addEventListener('click', e => {
  activeDrawEraser = !activeDrawEraser;
  e.currentTarget.classList.toggle('active', activeDrawEraser);
  e.currentTarget.setAttribute('aria-pressed', String(activeDrawEraser));
  if (!isDrawMode() && activeDrawEraser) toggleDrawMode(true);
  else if (isDrawMode()) setDrawMode(true, { eraser: activeDrawEraser });
  renderDrawColorRow();
});
document.querySelector('#btnClearDoodle')?.addEventListener('click', () => {
  clearDoodle();
  showToast('ล้างเส้นวาดทั้งหมดแล้ว');
});

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
}

function updateStatus(active, text) {
  if (active) {
    cameraStatus.classList.add('active');
  } else {
    cameraStatus.classList.remove('active');
  }
  statusText.textContent = text;
}

function updateMirrorState() {
  const shouldMirror = manualMirrorOverride !== null ? manualMirrorOverride : (getFacingMode() === 'user');
  videoElement.classList.toggle('mirror', shouldMirror);
  const btnMirror = document.querySelector('#btnToolMirror');
  if (btnMirror) {
    btnMirror.classList.toggle('active', shouldMirror);
    btnMirror.setAttribute('aria-pressed', String(shouldMirror));
  }
}

document.querySelector('#btnToolMirror')?.addEventListener('click', () => {
  const currentlyMirrored = videoElement.classList.contains('mirror');
  manualMirrorOverride = !currentlyMirrored;
  updateMirrorState();
  applyLiveStreamFilters();
});

function updateCameraModesBadge() {
  const badge = document.querySelector('#camActiveModesBadge');
  if (!badge) return;
  const parts = [];
  if (liveVideoMode) parts.push('🎬 Live Strip');
  if (shootPickTotal > 0 && !selectedStripFrame?.layout) parts.push(`ถ่าย ${shootPickTotal} เลือก ${activeBurstCount}`);
  if (manualShutterMode) parts.push('👆 กดทีละช็อต');
  if (!soundEnabled) parts.push('🔇 ปิดเสียง');
  if (activeZoom > 1) parts.push(`🔍 ${activeZoom.toFixed(1)}x`);
  if (Math.abs(activeBrightness - 1) >= 0.05) parts.push(`☀️ ${Math.round(activeBrightness * 100)}%`);
  badge.textContent = parts.join(' · ');
  badge.classList.toggle('hidden', parts.length === 0);
}

document.querySelector('#btnOpenCamSettings')?.addEventListener('click', () => {
  if (camSettingsDialog && !camSettingsDialog.open) camSettingsDialog.showModal();
});
document.querySelector('#btnCloseCamSettings')?.addEventListener('click', () => {
  camSettingsDialog?.close();
});

document.querySelector('#btnToolSound')?.addEventListener('click', e => {
  soundEnabled = !soundEnabled;
  e.currentTarget.setAttribute('aria-pressed', String(soundEnabled));
  e.currentTarget.classList.toggle('active', soundEnabled);
  e.currentTarget.textContent = soundEnabled ? '🔊 เสียง' : '🔇 ปิดเสียง';
  updateCameraModesBadge();
});

document.querySelector('#btnToolRingLight')?.addEventListener('click', e => {
  const card = document.querySelector('.cam-studio-card');
  RING_LIGHT_MODES.forEach(m => { if (m.cls) card?.classList.remove(m.cls); });
  ringLightIndex = (ringLightIndex + 1) % RING_LIGHT_MODES.length;
  const mode = RING_LIGHT_MODES[ringLightIndex];
  if (mode.cls) card?.classList.add(mode.cls);
  const label = document.querySelector('#ringLightLabel');
  if (label) label.textContent = `ไฟ: ${mode.label}`;
  e.currentTarget.classList.toggle('active', ringLightIndex > 0);
});

const burstGapSelect = document.querySelector('#burstGapSelect');
document.querySelector('#btnToolShutterMode')?.addEventListener('click', e => {
  manualShutterMode = !manualShutterMode;
  e.currentTarget.textContent = manualShutterMode ? '👆 กดทีละช็อต' : '⚡ ถ่ายรัวอัตโนมัติ';
  e.currentTarget.classList.toggle('active', manualShutterMode);
  burstGapSelect?.classList.toggle('hidden', manualShutterMode);
  updateCameraModesBadge();
});
burstGapSelect?.addEventListener('change', e => {
  burstGapSeconds = Math.max(1, Math.min(3, Number(e.target.value) || 1));
});

function triggerScreenFlash() {
  const flash = document.querySelector('#camFlashOverlay');
  if (flash) {
    flash.classList.add('flash');
    requestAnimationFrame(() => {
      setTimeout(() => flash.classList.remove('flash'), 45);
    });
  }
  if (soundEnabled) playShutterSound();
}

function renderCamShotPreview(frames, total) {
  const strip = document.querySelector('#camShotPreviewStrip');
  if (!strip) return;
  if (total <= 1) {
    strip.classList.add('hidden');
    strip.replaceChildren();
    return;
  }
  strip.classList.remove('hidden');
  strip.replaceChildren(...Array.from({ length: total }, (_, i) => {
    const slot = document.createElement('div');
    slot.className = `cam-shot-thumb ${frames[i] ? 'captured' : ''}`;
    if (frames[i]) {
      const img = document.createElement('img');
      img.src = frames[i].toDataURL('image/jpeg', 0.65);
      img.alt = `ช็อต ${i + 1}`;
      slot.append(img);
    } else {
      slot.textContent = `${i + 1}`;
    }
    return slot;
  }));
}

function updateProgress(percentage, message) {
  progressContainer.classList.remove('hidden');
  progressBarFill.style.width = `${percentage}%`;
  progressText.textContent = `${message} (${percentage}%)`;
}

function hideProgress() {
  progressContainer.classList.add('hidden');
}

function applyLiveStreamFilters() {
  const currentFilter = FILTERS_CATALOG[activeFilterIndex].css;
  const brightnessStr = `brightness(${activeBrightness})`;
  const filterCombined = currentFilter === 'none' ? brightnessStr : `${currentFilter} ${brightnessStr}`;

  videoElement.style.filter = filterCombined;

  // Zoom & Mirror transforms
  const isMirrored = videoElement.classList.contains('mirror');
  const mirrorScale = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
  const zoomScale = `scale(${usingCssZoom ? activeZoom : 1})`;
  videoElement.style.transform = `${mirrorScale} ${zoomScale}`;
}

document.querySelector('#shootPickSelect')?.addEventListener('change', e => {
  shootPickTotal = Number(e.target.value) || 0;
  updateCameraModesBadge();
});

document.querySelector('#btnToolLiveVideo')?.addEventListener('click', e => {
  liveVideoMode = !liveVideoMode;
  e.currentTarget.classList.toggle('active', liveVideoMode);
  e.currentTarget.setAttribute('aria-pressed', String(liveVideoMode));
  e.currentTarget.textContent = liveVideoMode ? '🎬 เปิดอยู่' : '🎬 ปิดอยู่';
  updateCameraModesBadge();
  showToast(liveVideoMode ? 'เปิดโหมด Live Strip แล้ว — จะอัดคลิปสั้น ~2 วิในแต่ละช็อต' : 'ปิดโหมด Live Strip แล้ว');
});

// 1. Aspect Ratio Cycling (4:3 -> 1:1 -> 16:9)
const ASPECT_STEPS = ['4:3', '1:1', '16:9'];

function cycleAspectRatio() {
  const currentIdx = ASPECT_STEPS.indexOf(currentAspectRatio);
  const nextIdx = (currentIdx + 1) % ASPECT_STEPS.length;
  currentAspectRatio = ASPECT_STEPS[nextIdx];
  if (btnAspectActive) btnAspectActive.textContent = currentAspectRatio;
  previewBox.style.aspectRatio = currentAspectRatio.replace(':', ' / ');
  updateStripSummary();
}

btnAspectActive?.addEventListener('click', cycleAspectRatio);

// 2. Horizontal Live Filter Strip
function renderCameraFilterStrip() {
  if (!camFilterStrip) return;
  camFilterStrip.innerHTML = FILTERS_CATALOG.map((f, i) => `
    <button type="button" class="gallery-item filter-item ${i === activeFilterIndex ? 'selected' : ''}" data-index="${i}">
      <div class="filter-swatch-box ${f.class}"></div>
      <span class="item-name">${f.name}</span>
    </button>
  `).join('');

  camFilterStrip.querySelectorAll('.filter-item').forEach(item => {
    item.addEventListener('click', e => {
      selectFilter(parseInt(e.currentTarget.dataset.index, 10));
    });
  });
}

function selectFilter(index) {
  activeFilterIndex = index;
  renderCameraFilterStrip();
  applyLiveStreamFilters();
}

renderCameraFilterStrip();

// 3. Countdown Timer Cycle (0, 3, 5, 10)
const TIMER_STEPS = [0, 3, 5, 10];

function cycleTimer() {
  const currentIdx = TIMER_STEPS.indexOf(activeTimerSeconds);
  const nextIdx = (currentIdx + 1) % TIMER_STEPS.length;
  activeTimerSeconds = TIMER_STEPS[nextIdx];
  const label = document.querySelector('#timerBadgeLabel');
  if (label) label.textContent = activeTimerSeconds === 0 ? 'ไม่ตั้งเวลา' : `${activeTimerSeconds} วิ`;
  btnTimerActive?.classList.toggle('active', activeTimerSeconds > 0);
}

btnTimerActive?.addEventListener('click', cycleTimer);

// 4. Brightness & Zoom Sliders
brightnessSlider?.addEventListener('input', (e) => {
  activeBrightness = parseFloat(e.target.value);
  const label = document.querySelector('#brightnessValueLabel');
  if (label) label.textContent = `${Math.round(activeBrightness * 100)}%`;
  applyLiveStreamFilters();
  updateCameraModesBadge();
});

zoomSlider?.addEventListener('input', async (e) => {
  activeZoom = parseFloat(e.target.value);
  const label = document.querySelector('#zoomValueLabel');
  if (label) label.textContent = `${activeZoom.toFixed(1)}x`;
  // ต้องรู้ผลของซูมฮาร์ดแวร์ก่อน ถึงจะตัดสินใจได้ว่าต้องซูมด้วย CSS ซ้ำหรือไม่
  usingCssZoom = !(await setZoom(activeZoom));
  applyLiveStreamFilters();
  updateCameraModesBadge();
});

/**
 * พื้นที่ของวิดีโอที่ "มองเห็นจริง" บนพรีวิว
 * จำลองสูตรเดียวกับที่ CSS ทำ: object-fit: cover ของ .cam-preview-box
 * แล้วตามด้วย transform: scale() ตอนซูม — เพื่อให้ภาพที่ถ่ายได้ตรงกับที่ตาเห็น
 */
function getCaptureCrop(slotAspect = null) {
  const vw = videoElement.videoWidth || 1280;
  const vh = videoElement.videoHeight || 720;

  const [aw, ah] = currentAspectRatio.split(':').map(Number);
  const target = slotAspect || aw / ah;

  // object-fit: cover — ครอปกลางภาพให้ได้อัตราส่วนของกล่องพรีวิว
  let sw, sh;
  if (vw / vh > target) {
    sh = vh;
    sw = vh * target;
  } else {
    sw = vw;
    sh = vw / target;
  }

  // CSS scale() ย่อพื้นที่ที่มองเห็นลงอีก (เฉพาะตอนที่ซูมด้วย CSS จริง)
  const z = usingCssZoom ? (activeZoom || 1) : 1;
  sw /= z;
  sh /= z;

  return {
    sx: (vw - sw) / 2,
    sy: (vh - sh) / 2,
    sw: Math.max(1, Math.round(sw)),
    sh: Math.max(1, Math.round(sh))
  };
}

/**
 * ให้กล่อง canvas ในหน้าตกแต่งยืดตามอัตราส่วนของภาพจริง
 * (CSS ตั้ง 16/9 ไว้เป็นค่าเริ่มต้น ถ้าไม่เขียนทับภาพ 1:1 จะมีแถบดำซ้าย-ขวา)
 */
function syncCanvasContainerRatio() {
  if (!canvasContainer || !canvasElement.width || !canvasElement.height) return;
  canvasContainer.style.aspectRatio = `${canvasElement.width} / ${canvasElement.height}`;
  canvasContainer.style.maxWidth = canvasElement.height > canvasElement.width
    ? `${Math.round(680 * canvasElement.width / canvasElement.height)}px` : '';
  canvasContainer.style.marginInline = 'auto';
}

// 5. Grid Overlay Toggle
btnToolGrid?.addEventListener('click', () => {
  isGridActive = !isGridActive;
  btnToolGrid.classList.toggle('active', isGridActive);
  btnToolGrid.setAttribute('aria-pressed', String(isGridActive));
  camGridOverlay.classList.toggle('active', isGridActive);
});

// 6. Shot count cycle (1, 2, 3, 4)
const BURST_STEPS = [1, 2, 3, 4];

btnToolBurst?.addEventListener('click', () => {
  if (activeCaptureTemplate || selectedStripFrame?.layout) return;
  const currentIdx = BURST_STEPS.indexOf(activeBurstCount);
  const nextIdx = (currentIdx + 1) % BURST_STEPS.length;
  activeBurstCount = BURST_STEPS[nextIdx];
  burstBadge.textContent = `${activeBurstCount}x`;
  btnToolBurst.classList.toggle('active', activeBurstCount > 1);
  updateStripSummary();
});

/**
 * Camera Actions (Updated with Realtime Filters, Timer, & Burst Mode)
 */
async function handleStartCamera() {
  if (isChangingCamera) return;
  isChangingCamera = true;
  btnSwitch.disabled = true;
  hideError();
  try {
    await initCamera(videoElement);
    if (viewCamera.classList.contains('hidden')) {
      handleStopCamera();
      return;
    }
    updateMirrorState();
    usingCssZoom = true; // กล้องคนละตัวรองรับซูมฮาร์ดแวร์ไม่เหมือนกัน ต้องเริ่มใหม่
    applyLiveStreamFilters();
    updateStatus(true, `พร้อมใช้งาน (${getFacingMode() === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'})`);
  } catch (error) {
    showError(error.message);
    updateStatus(false, 'ไม่สามารถเปิดกล้องได้');
  } finally {
    isChangingCamera = false;
    btnSwitch.disabled = false;
  }
}

function handleStopCamera() {
  stopCamera();
  videoElement.srcObject = null;
  updateStatus(false, 'กล้องปิดอยู่');
}

async function handleSwitchCamera() {
  if (isCapturing || isChangingCamera) return;
  isChangingCamera = true;
  hideError();
  if (btnSwitch) btnSwitch.disabled = true;
  try {
    await switchCamera(videoElement);
    manualMirrorOverride = null;
    updateMirrorState();
    usingCssZoom = true;
    applyLiveStreamFilters();
    updateStatus(true, `พร้อมใช้งาน (${getFacingMode() === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'})`);
  } catch (error) {
    showError(error.message);
  } finally {
    isChangingCamera = false;
    if (btnSwitch) btnSwitch.disabled = false;
    updateMirrorState();
    usingCssZoom = true;
    applyLiveStreamFilters();
  }
}

/**
 * Captures a single frame from video with filters and returns an offscreen canvas.
 */
function captureSingleFrame(filterOptions) {
  // ครอปให้ตรงกับที่เห็นบนพรีวิว (อัตราส่วน + ซูม) เหมือนโหมดถ่ายเดี่ยว
  const crop = filterOptions.crop || getCaptureCrop();
  const w = crop.sw;
  const h = crop.sh;

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const offCtx = offscreen.getContext('2d');

  const isMirrored = videoElement.classList.contains('mirror');
  if (isMirrored) {
    offCtx.translate(w, 0);
    offCtx.scale(-1, 1);
  }
  const nativeFilter = 'filter' in offCtx;
  if (nativeFilter && filterOptions.filter && filterOptions.filter !== 'none') {
    offCtx.filter = filterOptions.filter;
  }
  offCtx.drawImage(videoElement, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  if (!nativeFilter) applyPixelFilter(offscreen, filterOptions.filter);
  return offscreen;
}

/**
 * --- ตัวเลือกช่องเอง (คลิกชี้ช่องที่จะเจาะ) ---
 * ใช้เมื่อระบบตรวจหาช่องอัตโนมัติไม่เจอ หรือผู้ใช้อยากแก้เอง
 */
let cutoutState = null;

function drawCutoutPreview() {
  if (!cutoutState) return;
  const { w, h, imageData, workCtx, work } = cutoutState;
  const previewData = new ImageData(new Uint8ClampedArray(imageData.data), w, h);
  clearSelectedFrameSlots(previewData, cutoutState.candidates);
  workCtx.putImageData(previewData, 0, 0);

  const g = frameCutoutCanvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const c1 = css.getPropertyValue('--surface').trim() || '#ffffff';
  const c2 = css.getPropertyValue('--surface-sunken').trim() || '#e5dce8';

  // พื้นตารางให้เห็นชัดว่าตรงไหนเจาะโปร่งแล้ว
  const S = Math.max(10, Math.round(w / 48));
  for (let y = 0; y < h; y += S) {
    for (let x = 0; x < w; x += S) {
      g.fillStyle = ((Math.floor(x / S) + Math.floor(y / S)) % 2 === 0) ? c1 : c2;
      g.fillRect(x, y, S, S);
    }
  }
  g.drawImage(work, 0, 0);

  for (const [index, slot] of cutoutState.candidates.entries()) {
    const cx = Math.round((slot.minX + slot.maxX) / 2);
    const cy = Math.round((slot.minY + slot.maxY) / 2);
    if (!slot.selected || cutoutState.editingCandidate === index) {
      g.save();
      g.setLineDash([8, 6]);
      g.strokeStyle = cutoutState.editingCandidate === index ? '#00a65a' : '#ff0066';
      g.lineWidth = Math.max(2, w / 260);
      g.strokeRect(slot.minX, slot.minY, slot.maxX - slot.minX + 1, slot.maxY - slot.minY + 1);
      g.restore();
    }
    const r = Math.max(14, Math.round(w / 34));
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = slot.selected ? 'rgba(14, 102, 71, 0.9)' : 'rgba(176, 36, 85, 0.82)';
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = `bold ${Math.max(14, Math.round(r * 1.15))}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(index + 1), cx, cy);
  }
}

function renderCutoutCandidates() {
  const list = document.querySelector('#cutoutCandidates');
  list.replaceChildren();
  cutoutState.candidates.forEach((slot, index) => {
    const row = document.createElement('div');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = slot.selected;
    checkbox.addEventListener('change', () => {
      slot.selected = checkbox.checked;
      drawCutoutPreview();
    });
    label.append(checkbox, ` ช่อง ${index + 1} `);
    const adjust = document.createElement('button');
    adjust.type = 'button';
    adjust.className = 'btn btn-sm btn-secondary';
    adjust.textContent = 'ปรับขอบเอง';
    adjust.addEventListener('click', () => {
      cutoutState.editingCandidate = index;
      cutoutState.firstCorner = null;
      document.querySelector('#cutoutStatus').textContent = `แตะ 2 มุมใหม่สำหรับช่อง ${index + 1}`;
      drawCutoutPreview();
    });
    row.append(label, adjust);
    list.append(row);
  });
}

async function openCutoutPicker(source, requireSlots = false, candidates = []) {
  if (!source) return null;
  const { canvas, ctx, w, h } = await loadFrameCanvas(source);
  const imageData = ctx.getImageData(0, 0, w, h);
  const autoSelect = candidates.length > 0 && candidates.length <= 4;

  cutoutState = {
    work: canvas,
    workCtx: ctx,
    w,
    h,
    imageData,
    original: new Uint8ClampedArray(imageData.data),
    requireSlots,
    candidates: candidates.map(slot => ({
      ...slot,
      pixelSet: Array.isArray(slot.pixels) ? new Set(slot.pixels) : null,
      selected: autoSelect
    })),
    editingCandidate: null,
    firstCorner: null,
    resolve: null
  };

  frameCutoutCanvas.width = w;
  frameCutoutCanvas.height = h;
  document.querySelector('#cutoutSelectionMode').value = 'color';
  document.querySelector('#cutoutStatus').textContent = autoSelect
    ? `พบ ${candidates.length} ช่องใส่รูปอัตโนมัติแล้ว (พื้นที่ตารางหมากรุก) — กด "✅ ใช้กรอบนี้" ได้เลย หรือแตะที่ช่องเพื่อเปิด/ปิด`
    : 'แตะ 1 ครั้งตรงพื้นที่สีขาว/ช่องว่างในกรอบเพื่อเจาะช่องใส่รูป (ทำซ้ำได้ 1–4 ช่อง) แล้วกด "✅ ใช้กรอบนี้"';
  renderCutoutCandidates();
  drawCutoutPreview();
  frameCutoutModal.classList.remove('hidden');

  return new Promise((resolve) => { cutoutState.resolve = resolve; });
}

function closeCutoutPicker(result) {
  frameCutoutModal.classList.add('hidden');
  const done = cutoutState && cutoutState.resolve;
  cutoutState = null;
  if (done) done(result);
}

frameCutoutCanvas?.addEventListener('click', (e) => {
  if (!cutoutState) return;
  const { w, h, imageData } = cutoutState;

  // แปลงพิกัดคลิกเป็นพิกัด canvas แบบเดียวกับ getCanvasCoordinates ใน canvasEngine
  const rect = frameCutoutCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (w / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (h / rect.height));
  if (x < 0 || y < 0 || x >= w || y >= h) return;

  if (cutoutState.editingCandidate !== null || document.querySelector('#cutoutSelectionMode').value === 'rectangle') {
    const status = document.querySelector('#cutoutStatus');
    if (!cutoutState.firstCorner) {
      cutoutState.firstCorner = { x, y };
      status.textContent = 'เลือกมุมแรกแล้ว แตะมุมตรงข้ามเพื่อเจาะช่องภาพ';
      const context = frameCutoutCanvas.getContext('2d');
      context.strokeStyle = '#ff0066';
      context.lineWidth = Math.max(2, w / 300);
      context.strokeRect(x - 6, y - 6, 12, 12);
      return;
    }
    try {
      if (cutoutState.editingCandidate !== null) {
        const first = cutoutState.firstCorner;
        if (first.x === x || first.y === y) throw new Error('กรุณาเลือกสองมุมให้เป็นช่องภาพสี่เหลี่ยม');
        Object.assign(cutoutState.candidates[cutoutState.editingCandidate], {
          minX: Math.min(first.x, x), minY: Math.min(first.y, y),
          maxX: Math.max(first.x, x), maxY: Math.max(first.y, y),
          pixels: null, pixelSet: null, selected: true
        });
        cutoutState.editingCandidate = null;
        renderCutoutCandidates();
      } else {
        clearFrameRectangle(imageData, cutoutState.firstCorner, { x, y });
      }
      status.textContent = 'เจาะช่องแล้ว กด "✅ ใช้กรอบนี้" หรือแตะเพื่อเพิ่มช่องอีกได้';
    } catch (error) {
      status.textContent = error.message;
    }
    cutoutState.firstCorner = null;
    drawCutoutPreview();
    return;
  }

  const idx = y * w + x;
  // ถ้าแตะโดนช่องที่ระบบตรวจพบไว้แล้ว ให้สลับเปิด/ปิดช่องนั้นทันที
  const hitCandidate = cutoutState.candidates.find(slot =>
    slot.pixelSet
      ? slot.pixelSet.has(idx)
      : (x >= slot.minX && x <= slot.maxX && y >= slot.minY && y <= slot.maxY)
  );
  if (hitCandidate) {
    hitCandidate.selected = !hitCandidate.selected;
    renderCutoutCandidates();
    drawCutoutPreview();
    return;
  }

  if (imageData.data[idx * 4 + 3] === 0) return; // ตรงนี้โปร่งอยู่แล้ว

  const base = parseInt(cutoutTolerance.value, 10) || 35;
  const region = floodFillRegion(imageData.data, w, h, idx, base);
  for (const p of region.pixels) imageData.data[p * 4 + 3] = 0;
  document.querySelector('#cutoutStatus').textContent = 'เจาะช่องตามรูปทรงแล้ว กด "✅ ใช้กรอบนี้" หรือแตะช่องอื่นเพิ่มได้';
  drawCutoutPreview();
});

cutoutTolerance?.addEventListener('input', (e) => {
  cutoutToleranceValue.textContent = e.target.value;
});

btnCutoutReset?.addEventListener('click', () => {
  if (!cutoutState) return;
  cutoutState.firstCorner = null;
  cutoutState.imageData.data.set(cutoutState.original);
  cutoutState.editingCandidate = null;
  cutoutState.candidates.forEach(slot => { slot.selected = false; });
  renderCutoutCandidates();
  drawCutoutPreview();
});

btnCutoutCancel?.addEventListener('click', () => closeCutoutPicker(null));
btnCloseCutoutModal?.addEventListener('click', () => closeCutoutPicker(null));

btnCutoutApply?.addEventListener('click', async () => {
  if (!cutoutState) return closeCutoutPicker(null);
  const { work, workCtx } = cutoutState;
  const imageData = new ImageData(new Uint8ClampedArray(cutoutState.imageData.data), cutoutState.w, cutoutState.h);
  if (cutoutState.firstCorner || cutoutState.editingCandidate !== null) {
    document.querySelector('#cutoutStatus').textContent = 'กรุณาเลือกสองมุมให้ครบก่อนยืนยัน';
    return;
  }
  clearSelectedFrameSlots(imageData, cutoutState.candidates);
  if (cutoutState.requireSlots) {
    try {
      getFrameLayout(imageData, { allowEdgeSlots: true });
    } catch (error) {
      document.querySelector('#cutoutStatus').textContent = error.message;
      return;
    }
  }
  workCtx.putImageData(imageData, 0, 0);
  const blob = await new Promise((resolve) => work.toBlob(resolve, 'image/png'));
  if (!blob) {
    document.querySelector('#cutoutStatus').textContent = 'บันทึกกรอบไม่สำเร็จ กรุณาลองอีกครั้ง';
    return;
  }
  closeCutoutPicker(blob);
});

/**
 * Custom Sticker Upload with AI + Smart Color-Key Background Removal
 */
async function handleStickerUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  hideError();
  stickerUploader.disabled = true;
  chkRemoveBg.disabled = true;
  let finalBlob = file;

  try {
    if (chkRemoveBg.checked) {
      try {
        updateProgress(10, 'กำลังประมวลผลระบบตัดพื้นหลัง...');
        await new Promise(resolve => requestAnimationFrame(resolve));
        finalBlob = await removeBackground(file, {
          onProgress: ({ progress, message }) => updateProgress(progress, message),
          onError: (err) => showError(`ไม่สามารถตัดพื้นหลังได้: ${err.message}`)
        });
      } catch (err) {
        console.warn('Background removal failed:', err);
        finalBlob = file;
      } finally {
        setTimeout(hideProgress, 1200);
      }
    }

    lastUploadedStickerBlob = finalBlob;
    lastUploadedStickerUrl = URL.createObjectURL(finalBlob);

    await addLayer({
      type: 'sticker',
      image: lastUploadedStickerUrl,
      label: 'สติกเกอร์ที่อัปโหลด',
      id: `custom-sticker-${Date.now()}`,
      x: 500,
      y: 300,
      scale: 1,
      rotation: 0
    });

    btnSaveCustomSticker.classList.remove('hidden');
    refreshLayerListUI();
  } finally {
    stickerUploader.value = '';
    stickerUploader.disabled = false;
    chkRemoveBg.disabled = false;
  }
}

stickerUploader.addEventListener('change', handleStickerUpload);

/**
 * Save Custom Sticker to Gallery Catalog (and Supabase Storage)
 */
btnSaveCustomSticker.addEventListener('click', async () => {
  if (!lastUploadedStickerUrl) return;

  const enteredName = await showPromptDialog('ตั้งชื่อสติกเกอร์ที่ต้องการบันทึก:', 'สติกเกอร์ส่วนตัว', { confirmText: 'บันทึก' });
  if (enteredName === null) return;
  const stickerName = enteredName.trim() || 'สติกเกอร์ส่วนตัว';
  let finalUrl = lastUploadedStickerUrl;
  let stickerId = `custom-${Date.now()}`;

  if (currentUser && isSupabaseConfigured && lastUploadedStickerBlob) {
    try {
      const stickerRecord = await supabaseService.uploadSticker(lastUploadedStickerBlob, stickerName);
      if (stickerRecord && stickerRecord.image_url) {
        finalUrl = stickerRecord.image_url;
        stickerId = stickerRecord.sticker_id || stickerId;
      }
    } catch (err) {
      console.warn('Could not upload sticker to Supabase:', err.message);
    }
  }

  // Add to local catalog
  const newSticker = {
    id: stickerId,
    name: stickerName,
    src: finalUrl
  };

  STICKERS_CATALOG.unshift(newSticker);
  renderStickerGallery();

  showToast(`บันทึกสติกเกอร์ "${stickerName}" เรียบร้อยแล้ว`, 'success');
  btnSaveCustomSticker.classList.add('hidden');
});

function getLayerDisplayName(layer) {
  if (layer.type === 'base') return 'ภาพถ่ายหลัก';
  if (layer.label) return layer.label;
  if (layer.type === 'sticker') {
    const matched = STICKERS_CATALOG.find(s => layer.id.startsWith(`sticker-${s.id}-`) || layer.src === s.src);
    return matched ? matched.name : 'สติกเกอร์';
  }
  if (layer.type === 'frame') {
    const matched = FRAMES_CATALOG.find(f => layer.id === `frame-${f.id}` || layer.src === f.src);
    return matched ? matched.name : 'กรอบรูป';
  }
  return 'องค์ประกอบ';
}

/**
 * Layer List UI
 */
function refreshLayerListUI() {
  const layers = getLayers();
  const selectedId = getSelectedLayerId();
  syncEditorTabState();
  if (layerTabCount) {
    layerTabCount.textContent = String(layers.filter(l => l.type !== 'base').length);
  }
  layerList.innerHTML = '';

  if (layers.length === 0) {
    layerList.innerHTML = '<p class="empty-layers">ยังไม่มี Layer ในภาพ</p>';
    return;
  }

  layers.forEach((layer) => {
    const item = document.createElement('div');
    const isSelected = layer.id === selectedId;
    item.className = `layer-item ${isSelected ? 'selected' : ''}`;

    const info = document.createElement('div');
    info.className = 'layer-info';
    info.addEventListener('click', () => selectLayer(layer.id));

    if (layer.type !== 'base' && isSafeImageSrc(layer.src)) {
      const thumb = document.createElement('img');
      thumb.className = 'layer-thumb';
      thumb.src = layer.src;
      thumb.alt = '';
      info.append(thumb);
    } else {
      const ico = document.createElement('span');
      ico.className = 'layer-thumb-icon';
      ico.textContent = layer.type === 'base' ? '📸' : layer.type === 'frame' ? '🖼️' : '⭐';
      info.append(ico);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'layer-name';
    nameSpan.textContent = getLayerDisplayName(layer);
    info.append(nameSpan);
    item.append(info);

    if (layer.type !== 'base') {
      const controls = document.createElement('div');
      controls.className = 'layer-controls';

      const rotLabel = document.createElement('label');
      rotLabel.textContent = 'หมุน: ';
      const rotSlider = document.createElement('input');
      rotSlider.type = 'range';
      rotSlider.className = 'rot-slider';
      rotSlider.min = '0';
      rotSlider.max = '360';
      rotSlider.value = String(layer.rotation || 0);
      rotSlider.addEventListener('input', e => updateLayer(layer.id, { rotation: parseFloat(e.target.value) }));
      rotLabel.append(rotSlider);

      const scaleLabel = document.createElement('label');
      scaleLabel.textContent = 'ขนาด: ';
      const scaleSlider = document.createElement('input');
      scaleSlider.type = 'range';
      scaleSlider.className = 'scale-slider';
      scaleSlider.min = '0.2';
      scaleSlider.max = '3';
      scaleSlider.step = '0.1';
      scaleSlider.value = String(layer.scale || 1);
      scaleSlider.addEventListener('input', e => updateLayer(layer.id, { scale: parseFloat(e.target.value) }));
      scaleLabel.append(scaleSlider);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-icon btn-del';
      delBtn.textContent = '🗑️';
      delBtn.title = 'ลบชั้นนี้';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        removeLayer(layer.id);
      });

      controls.append(rotLabel, scaleLabel, delBtn);
      item.append(controls);
    }

    layerList.appendChild(item);
  });
}

/**
 * Authentication Modal Logic
 */
btnAuthModal.addEventListener('click', async () => {
  if (currentUser) {
    if (await showConfirmDialog('คุณต้องการออกจากระบบหรือไม่?', { confirmText: 'ออกจากระบบ', danger: true })) {
      await supabaseService.signOut();
      updateUserAuthUI(null);
      showToast('ออกจากระบบเรียบร้อยแล้ว');
    }
  } else {
    authModal.classList.remove('hidden');
  }
});

btnCloseAuthModal.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

btnToggleAuthMode.addEventListener('click', () => {
  if (authMode === 'login') {
    authMode = 'register';
    authModalTitle.textContent = '📝 สมัครสมาชิกใหม่ SnapFrame';
    btnSubmitAuth.textContent = 'สมัครสมาชิก';
    authToggleText.textContent = 'มีบัญชีสมาชิกอยู่แล้ว?';
    btnToggleAuthMode.textContent = 'เข้าสู่ระบบ';
  } else {
    authMode = 'login';
    authModalTitle.textContent = '🔑 เข้าสู่ระบบ SnapFrame';
    btnSubmitAuth.textContent = 'เข้าสู่ระบบ';
    authToggleText.textContent = 'ยังไม่มีบัญชีสมาชิก?';
    btnToggleAuthMode.textContent = 'สมัครสมาชิกใหม่';
  }
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  try {
    let user;
    if (authMode === 'login') {
      user = await supabaseService.signIn(email, password);
      showToast('เข้าสู่ระบบสำเร็จ!', 'success');
    } else {
      user = await supabaseService.signUp(email, password);
      showToast('สมัครสมาชิกสำเร็จ!', 'success');
    }
    updateUserAuthUI(user);
    authModal.classList.add('hidden');
  } catch (err) {
    showError(err.message);
  }
});

/**
 * สร้างภาพปกเทมเพลตขนาดย่อ (เฉพาะพื้นหลัง + กรอบ + สติกเกอร์ ไม่รวมรูปถ่ายส่วนตัว)
 */
async function buildTemplateCoverBlob() {
  const w = canvasElement.width || 960;
  const h = canvasElement.height || 720;
  const scale = Math.min(1, 480 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');
  g.fillStyle = activeStripBgColor || '#FFF5F7';
  g.fillRect(0, 0, cw, ch);

  const layout = capturedContext?.frameLayout
    || (capturedFrames.length
      ? getStripLayout(capturedFrames.length, 960, capturedContext?.aspectRatio || 4 / 3, capturedContext?.stripOrientation || 'vertical')
      : null);
  if (layout) {
    const sx = cw / layout.width;
    const sy = ch / layout.height;
    g.fillStyle = '#E5DCEB';
    layout.slots.forEach(slot => {
      g.fillRect(slot.x * sx, slot.y * sy, slot.width * sx, slot.height * sy);
    });
  }

  if (capturedContext?.decoration) {
    g.drawImage(capturedContext.decoration, 0, 0, cw, ch);
  }
  drawScaledLayers(g, getLayers().filter(l => l.type !== 'base'), { width: w, height: h }, cw, ch);
  return new Promise(resolve => c.toBlob(resolve, 'image/png'));
}

/**
 * Save Template Modal Logic
 */
btnSaveTemplate.addEventListener('click', () => {
  if (exportDialog?.open) exportDialog.close();
  if (!currentUser) {
    showToast('กรุณาเข้าสู่ระบบก่อนเพื่อบันทึกเทมเพลต');
    authModal.classList.remove('hidden');
    return;
  }
  saveTemplateModal.classList.remove('hidden');
});

btnCloseTemplateModal.addEventListener('click', () => {
  saveTemplateModal.classList.add('hidden');
});

saveTemplateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const name = tplName.value.trim();
  const isShared = chkSharePublic.checked;
  const submitBtn = saveTemplateForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  try {
    const designData = serializeDesignData();
    if (lastCaptureSettings) {
      const capture = { ...lastCaptureSettings };
      // อัปโหลดกรอบแบบกำหนดเองขึ้น Storage เพื่อเก็บเป็น URL แทน Base64 ขนาดใหญ่ในฐานข้อมูล
      if (capturedContext?.frame && capturedContext?.decoration && !isBuiltinFrame(capturedContext.frame.id)) {
        const outputLayout = capturedContext.frameLayout
          || getStripLayout(capture.count, 960, capturedContext.aspectRatio, capturedContext.stripOrientation);
        try {
          const frameBlob = await renderFrameToBlob(capturedContext.decoration, outputLayout);
          const frameUrl = await supabaseService.uploadTemplateImage(frameBlob, 'template-frames');
          if (frameUrl) {
            capture.frame = {
              name: capturedContext.frame.name,
              src: frameUrl,
              layout: capturedContext.frame.layout ? structuredClone(outputLayout) : null
            };
          }
        } catch (uploadErr) {
          console.warn('Upload template frame to storage failed, falling back:', uploadErr.message);
        }
      }
      designData.capture = capture;
    }

    let coverImageUrl = null;
    try {
      const coverBlob = await buildTemplateCoverBlob();
      if (coverBlob) coverImageUrl = await supabaseService.uploadTemplateImage(coverBlob, 'template-covers');
    } catch (coverErr) {
      console.warn('Upload template cover failed:', coverErr.message);
    }

    await supabaseService.saveTemplate({
      name,
      designData,
      coverImageUrl,
      isShared
    });

    showToast('บันทึกเทมเพลตบนคลาวด์เรียบร้อยแล้ว!', 'success');
    saveTemplateModal.classList.add('hidden');
    tplName.value = '';
    chkSharePublic.checked = false;
  } catch (err) {
    showError(err.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

/**
 * Template Gallery Logic
 */
tabMyTemplates.addEventListener('click', () => {
  templateCategory = 'my';
  tabMyTemplates.classList.add('active');
  tabSharedTemplates.classList.remove('active');
  loadTemplateGallery();
});

tabSharedTemplates.addEventListener('click', () => {
  templateCategory = 'shared';
  tabSharedTemplates.classList.add('active');
  tabMyTemplates.classList.remove('active');
  loadTemplateGallery();
});

function getTemplatePreviewSrc(template) {
  if (isSafeImageSrc(template.cover_image_url)) return template.cover_image_url;
  const design = typeof template.design_data === 'string'
    ? (() => { try { return JSON.parse(template.design_data); } catch { return null; } })()
    : template.design_data;
  const frame = design?.capture?.frame;
  if (frame?.builtinId && isBuiltinFrame(frame.builtinId)) {
    return buildBuiltinFrameDataUrl(frame.builtinId, 480, 320);
  }
  if (isSafeImageSrc(frame?.src)) return frame.src;
  return null;
}

async function loadTemplateGallery() {
  templateGrid.innerHTML = '<p class="loading-text">กำลังโหลดเทมเพลตจากคลาวด์...</p>';

  try {
    let templates = [];
    if (templateCategory === 'my') {
      if (!currentUser) {
        templateGrid.innerHTML = `
          <div class="empty-gallery-state">
            <span>🔐</span>
            <p>กรุณาเข้าสู่ระบบเพื่อดูเทมเพลตของคุณ</p>
            <button class="btn btn-primary" onclick="document.querySelector('#btnAuthModal').click()">เข้าสู่ระบบ</button>
          </div>
        `;
        return;
      }
      templates = await supabaseService.getMyTemplates();
    } else {
      templates = await supabaseService.getSharedTemplates();
    }

    if (templates.length === 0) {
      templateGrid.innerHTML = `
        <div class="empty-gallery-state">
          <span>📁</span>
          <p>ยังไม่มีเทมเพลตในหมวดหมู่นี้</p>
        </div>
      `;
      return;
    }

    templateGrid.innerHTML = '';
    templates.forEach(t => {
      const card = document.createElement('div');
      card.className = 'template-card';

      const thumbBox = document.createElement('div');
      thumbBox.className = 'template-thumb';
      const previewSrc = getTemplatePreviewSrc(t);
      if (previewSrc) {
        const img = document.createElement('img');
        img.src = previewSrc;
        img.alt = t.name || 'ตัวอย่างเทมเพลต';
        img.loading = 'lazy';
        thumbBox.append(img);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'template-thumb-placeholder';
        placeholder.textContent = '🖼️';
        thumbBox.append(placeholder);
      }

      const header = document.createElement('div');
      header.className = 'template-card-header';
      const titleEl = document.createElement('h4');
      titleEl.textContent = t.name || 'เทมเพลตไม่มีชื่อ';
      const badge = document.createElement('span');
      badge.className = t.is_shared ? 'badge-shared' : 'badge-private';
      badge.textContent = t.is_shared ? '🌐 สาธารณะ' : '🔒 ส่วนตัว';
      header.append(titleEl, badge);

      const dateEl = document.createElement('p');
      dateEl.className = 'template-date';
      dateEl.textContent = `📅 ${new Date(t.created_at).toLocaleDateString('th-TH')}`;

      const actions = document.createElement('div');
      actions.className = 'template-card-actions';
      const btnLoad = document.createElement('button');
      btnLoad.type = 'button';
      btnLoad.className = 'btn btn-sm btn-primary btn-load-tpl';
      btnLoad.textContent = '⚡ โหลดใช้งาน';
      actions.append(btnLoad);

      card.append(thumbBox, header, dateEl, actions);
      templateGrid.appendChild(card);

      btnLoad.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        hideError();
        try {
          const design = typeof t.design_data === 'string' ? JSON.parse(t.design_data) : structuredClone(t.design_data);
          let count = design?.capture?.count;
          if (!Number.isInteger(count) || count < 1 || count > 4) {
            const answer = await showPromptDialog(
              'เทมเพลตเก่านี้ยังไม่ระบุจำนวนภาพ ต้องการใช้กี่ภาพ (1–4)?',
              '4',
              { confirmText: 'ยืนยัน' }
            );
            if (answer === null) return;
            count = Number(answer);
            if (!Number.isInteger(count) || count < 1 || count > 4) throw new Error('กรุณาระบุจำนวนภาพเป็นเลข 1–4');
          }
          const capture = {
            count,
            orientation: design?.capture?.orientation === 'horizontal' ? 'horizontal' : 'vertical',
            aspect: ['4:3', '1:1', '16:9'].includes(design?.capture?.aspect) ? design.capture.aspect : currentAspectRatio
          };
          const templateFrame = restoreCaptureFrame(design?.capture?.frame, count);
          // Verify the saved decoration can be read before opening the camera.
          if (templateFrame) await loadStripDecoration(templateFrame);
          await loadTemplateDesign(design);
          setGifPhotos([]);
          activeCaptureTemplate = { name: t.name, design, capture };
          activeBurstCount = count;
          stripOrientation = capture.orientation;
          currentAspectRatio = capture.aspect;
          selectedStripFrame = templateFrame;
          hasChosenStrip = true;
          switchTab('camera');
        } catch (error) {
          showError(`โหลดเทมเพลตไม่สำเร็จ: ${error.message}`);
        } finally {
          button.disabled = false;
        }
      });

      if (templateCategory === 'my') {
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn-icon btn-del-tpl';
        btnDel.textContent = '🗑️';
        btnDel.title = 'ลบเทมเพลตนี้';
        actions.append(btnDel);

        btnDel.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (await showConfirmDialog(`คุณต้องการลบเทมเพลต "${t.name}" หรือไม่?`, { confirmText: 'ลบเทมเพลต', danger: true })) {
            await supabaseService.deleteTemplate(t.template_id);
            showToast('ลบเทมเพลตเรียบร้อยแล้ว');
            loadTemplateGallery();
          }
        });
      }
    });
  } catch (err) {
    templateGrid.innerHTML = '';
    const errEl = document.createElement('p');
    errEl.className = 'alert-error';
    errEl.textContent = `เกิดข้อผิดพลาด: ${err.message}`;
    templateGrid.append(errEl);
  }
}

/**
 * Session Gallery Actions
 */
function handleSaveToSessionGallery() {
  try {
    const dataUrl = exportImage('image/png');
    appUI.addSessionPhoto(dataUrl);
    galleryCount.textContent = appUI.getSessionPhotos().length;
    showToast('บันทึกภาพลงในคลังภาพเรียบร้อยแล้ว!', 'success');
  } catch (err) {
    showError(err.message);
  }
}

function renderSessionGallery() {
  const photos = appUI.getSessionPhotos();
  galleryCount.textContent = photos.length;
  sessionGalleryGrid.innerHTML = '';

  if (photos.length === 0) {
    sessionGalleryGrid.innerHTML = `
      <div class="empty-gallery-state">
        <span>📸</span>
        <p>ยังไม่มีภาพถ่ายในเซสชันนี้</p>
        <button class="btn btn-primary" onclick="document.querySelector('#tabCamera').click()">เริ่มถ่ายภาพเลย</button>
      </div>
    `;
    return;
  }

  photos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'session-photo-card';
    card.innerHTML = `
      <div class="photo-thumb">
        <img src="${p.dataUrl}" alt="Session Photo" />
      </div>
      <div class="photo-footer">
        <span class="photo-time">⏰ ${p.timestamp}</span>
        <button class="btn btn-primary btn-sm btn-edit-photo" data-id="${p.id}">🎨 แก้ไข</button>
        <a class="btn btn-secondary btn-sm" href="${p.dataUrl}" download="snapframe-${p.id}.png">📥 ดาวน์โหลด</a>
        <button class="btn btn-danger btn-sm btn-del-photo" data-id="${p.id}" title="ลบภาพนี้">🗑️</button>
      </div>
    `;
    sessionGalleryGrid.appendChild(card);
  });

  // Attach edit button handlers
  document.querySelectorAll('.btn-edit-photo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const photoId = e.target.dataset.id;
      const photo = photos.find(p => p.id === photoId);
      if (photo) loadPhotoToEditor(photo.dataUrl);
    });
  });

  // ลบภาพในคลังภาพ
  document.querySelectorAll('.btn-del-photo').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const photoId = e.currentTarget.dataset.id;
      if (!(await showConfirmDialog('ลบภาพนี้ออกจากคลังภาพ?', { confirmText: 'ลบภาพ', danger: true }))) return;
      appUI.removeSessionPhoto(photoId);
      renderSessionGallery();
      showToast('ลบภาพเรียบร้อยแล้ว');
    });
  });
}

/**
 * Loads a photo dataUrl into canvasEngine as base layer and switches to editor.
 */
async function loadPhotoToEditor(dataUrl) {
  try {
    const img = await loadImage(dataUrl);

    setTargetCanvas(canvasElement);

    // Create offscreen canvas for base layer
    const offscreen = document.createElement('canvas');
    offscreen.width = img.width;
    offscreen.height = img.height;
    offscreen.getContext('2d').drawImage(img, 0, 0);

    // ล้างสติกเกอร์ กรอบ และเส้นวาดของรูปก่อนหน้าไม่ให้ค้างติดมา
    getLayers().filter(layer => layer.type !== 'base').forEach(layer => removeLayer(layer.id, { recordHistory: false }));
    clearDoodle({ recordHistory: false });
    resetHistory();

    // setBaseLayerImage ปรับขนาด canvas ให้ตรงกับภาพให้เอง
    // (ของเดิมเรียก captureFrame() ซึ่งไปตั้งขนาด canvas เป็นขนาดวิดีโอ ไม่ใช่ขนาดภาพ)
    setBaseLayerImage(offscreen);
    capturedFrames = [];
    capturedGifFrames = [];
    setLiveClips([]);
    capturedContext = null;
    retakingShotIndex = null;
    renderShotRetakeBar();
    setGifPhotos([]);
    activeEditorFilter = 'none';
    renderEditorFilterRow();
    renderEditorFrameRow();
    renderEditorBgColorRow();

    refreshLayerListUI();
    switchEditorTool('filter');
    switchTab('editor');
    updateStatus(true, '📸 โหลดภาพจากคลังเรียบร้อย - แก้ไขเพิ่มเติมได้!');
  } catch (err) {
    showError(`ไม่สามารถโหลดภาพได้: ${err.message}`);
  }
}

// Global Event Listeners
btnSwitch?.addEventListener('click', handleSwitchCamera);
btnCapture?.addEventListener('click', handleCapture);
btnRetake?.addEventListener('click', () => {
  setGifPhotos([]);
  setLiveClips([]);
  capturedFrames = [];
  capturedGifFrames = [];
  capturedContext = null;
  retakingShotIndex = null;
  renderShotRetakeBar();
  // ล้างสติกเกอร์และเส้นวาดของช็อตที่แล้ว แต่คงกรอบไว้ (กรอบมักเป็นธีมของงานที่ใช้ซ้ำทุกช็อต)
  getLayers()
    .filter(l => l.type === 'sticker')
    .forEach(l => removeLayer(l.id, { recordHistory: false }));
  clearDoodle({ recordHistory: false });
  resetHistory();
  refreshLayerListUI();
  switchTab('camera');
});

btnExport?.addEventListener('click', async () => {
  try {
    if (exportDialog?.open) exportDialog.close();
    await downloadImage('snapframe-photo.png', 'image/png');
    handleSaveToSessionGallery();
  } catch (error) {
    showError(`บันทึกรูปไม่สำเร็จ: ${error.message}`);
  }
});

btnSaveToGallery?.addEventListener('click', handleSaveToSessionGallery);

// IG Story / TikTok 9:16 Export
const storyPreviewDialog = document.querySelector('#storyPreviewDialog');
const storyBgStyleSelect = document.querySelector('#storyBgStyleSelect');
const storyPreviewImage = document.querySelector('#storyPreviewImage');

async function renderStoryPreview() {
  const cleanDataUrl = exportImage('image/png');
  const img = await loadImage(cleanDataUrl).catch(() => {
    throw new Error('เตรียมภาพ IG Story ไม่สำเร็จ');
  });
  const storyCanvas = composeStoryCanvas(img, {
    bgStyle: storyBgStyleSelect?.value || 'blur',
    bgColor: activeStripBgColor
  });
  storyPreviewImage.src = storyCanvas.toDataURL('image/png');
}

document.querySelector('#btnExportStory')?.addEventListener('click', async () => {
  if (exportDialog?.open) exportDialog.close();
  try {
    await renderStoryPreview();
    storyPreviewDialog?.showModal();
  } catch (err) {
    showError(`สร้างภาพ IG Story ไม่สำเร็จ: ${err.message}`);
  }
});

storyBgStyleSelect?.addEventListener('change', () => {
  if (storyPreviewDialog?.open) renderStoryPreview().catch(err => showError(err.message));
});

document.querySelector('#btnCloseStoryPreview')?.addEventListener('click', () => storyPreviewDialog?.close());
document.querySelector('#btnDownloadStory')?.addEventListener('click', async () => {
  const dataUrl = storyPreviewImage?.getAttribute('src');
  if (!dataUrl) return;
  try {
    await downloadDataUrl(dataUrl, 'snapframe-story-9x16.png', 'image/png');
    storyPreviewDialog?.close();
    showToast('บันทึกภาพ IG Story (9:16) เรียบร้อยแล้ว!', 'success');
  } catch (err) {
    showError(`บันทึกภาพ IG Story ไม่สำเร็จ: ${err.message}`);
  }
});

// GIF / Boomerang Export with Live Speed & Boomerang Toggle
async function renderGifPreview({ openDialog = false } = {}) {
  const button = document.querySelector('#btnExportGif');
  const status = document.querySelector('#gifStatus');
  const previewStatus = document.querySelector('#gifPreviewStatus');
  const photos = gifPhotos;
  if (photos.length < 2) return;
  button.disabled = true;
  if (previewStatus) previewStatus.textContent = 'กำลังสร้าง GIF...';
  try {
    let frameOverlay = getLayers().find(l => l.type === 'frame')?.image || null;
    if (!frameOverlay && capturedContext?.frame && !capturedContext.frameLayout && photos[0]) {
      frameOverlay = await loadStripDecoration(capturedContext.frame, photos[0].width, photos[0].height);
    }
    const stickers = getLayers().filter(l => l.type === 'sticker');
    const sourceSize = { width: canvasElement.width, height: canvasElement.height };
    const delay = Number(document.querySelector('#gifSpeedSelect')?.value) || 450;
    const boomerang = Boolean(document.querySelector('#chkGifBoomerang')?.checked);
    const stripLayout = capturedContext
      ? (capturedContext.frameLayout || getStripLayout(photos.length, 960, capturedContext.aspectRatio, capturedContext.stripOrientation))
      : null;
    const blob = await encodePhotoGif(
      readGifFrames(photos, frameOverlay, stickers, sourceSize, {
        filter: activeEditorFilter,
        doodle: getDoodleCanvas(),
        slots: stripLayout?.slots || null
      }),
      (current, total) => {
        const msg = `กำลังสร้าง ${boomerang ? 'Boomerang' : 'GIF'} ${current}/${total}…`;
        status.textContent = msg;
        if (previewStatus) previewStatus.textContent = msg;
      },
      { delay, boomerang }
    );
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('อ่านไฟล์ GIF ไม่สำเร็จ'));
      reader.readAsDataURL(blob);
    });
    if (photos !== gifPhotos) return;
    const preview = document.querySelector('#gifPreviewImage');
    preview.src = dataUrl;
    await preview.decode();
    if (photos !== gifPhotos) return;
    if (previewStatus) previewStatus.textContent = '';
    if (openDialog && !gifPreviewDialog.open) gifPreviewDialog.showModal();
    status.textContent = 'พรีวิวพร้อมแล้ว ปรับความเร็วหรือเปิด Boomerang แล้วกดดาวน์โหลดได้เลย';
  } catch (error) {
    status.textContent = `สร้าง GIF ไม่สำเร็จ: ${error.message}`;
    if (previewStatus) previewStatus.textContent = `สร้าง GIF ไม่สำเร็จ: ${error.message}`;
  } finally {
    button.disabled = gifPhotos.length < 2;
  }
}

document.querySelector('#btnExportGif').addEventListener('click', () => {
  if (exportDialog?.open) exportDialog.close();
  renderGifPreview({ openDialog: true });
});
document.querySelector('#gifSpeedSelect')?.addEventListener('change', () => {
  if (gifPreviewDialog.open) renderGifPreview({ openDialog: false });
});
document.querySelector('#chkGifBoomerang')?.addEventListener('change', () => {
  if (gifPreviewDialog.open) renderGifPreview({ openDialog: false });
});

// Live Strip Video Preview & Download (MP4/WebM)
const liveVideoPreviewDialog = document.querySelector('#liveVideoPreviewDialog');
const liveVideoPreviewPlayer = document.querySelector('#liveVideoPreviewPlayer');
const liveVideoPreviewStatus = document.querySelector('#liveVideoPreviewStatus');
const btnDownloadLiveVideo = document.querySelector('#btnDownloadLiveVideo');

document.querySelector('#btnExportLiveVideo')?.addEventListener('click', async e => {
  if (exportDialog?.open) exportDialog.close();
  const button = e.currentTarget;
  const status = document.querySelector('#gifStatus');
  const clipsSnapshot = capturedLiveClips;
  if (!clipsSnapshot.length || !capturedContext) return;
  button.disabled = true;
  clearLiveVideoPreview();
  if (liveVideoPreviewStatus) liveVideoPreviewStatus.textContent = 'กำลังสร้างวิดีโอ Live Strip...';
  if (liveVideoPreviewDialog && !liveVideoPreviewDialog.open) liveVideoPreviewDialog.showModal();
  try {
    const stickers = getLayers().filter(l => l.type === 'sticker');
    const sourceSize = { width: canvasElement.width, height: canvasElement.height };
    const { blob, ext } = await exportLiveStripVideo(
      clipsSnapshot,
      {
        decoration: capturedContext.decoration,
        aspectRatio: capturedContext.aspectRatio,
        frameLayout: capturedContext.frameLayout,
        stripOrientation: capturedContext.stripOrientation,
        stripOptions: {
          bgColor: activeStripBgColor,
          bgPattern: activeStripBgPattern,
          filter: activeEditorFilter,
          footerText: activeStripFooterText,
          showDate: activeStripShowDate,
          footerFont: activeStripFooterFont
        },
        stickers,
        doodle: getDoodleCanvas(),
        sourceSize
      },
      (cur, total) => {
        const msg = `กำลังสร้างวิดีโอ Live Strip ${Math.round((cur / total) * 100)}%…`;
        status.textContent = msg;
        if (liveVideoPreviewStatus) liveVideoPreviewStatus.textContent = msg;
      }
    );
    if (clipsSnapshot !== capturedLiveClips || !liveVideoPreviewDialog?.open) return;
    const url = URL.createObjectURL(blob);
    liveVideoPreviewState = { url, ext, mimeType: blob.type || `video/${ext}` };
    if (liveVideoPreviewPlayer) {
      liveVideoPreviewPlayer.src = url;
      liveVideoPreviewPlayer.play?.().catch(() => {});
    }
    if (btnDownloadLiveVideo) btnDownloadLiveVideo.disabled = false;
    if (liveVideoPreviewStatus) liveVideoPreviewStatus.textContent = `พรีวิวพร้อมแล้ว (.${ext}) ตรวจสอบวิดีโอแล้วกดดาวน์โหลดได้เลย`;
    status.textContent = `พรีวิววิดีโอ Live Strip (.${ext}) พร้อมแล้ว`;
  } catch (err) {
    const msg = `สร้างวิดีโอ Live Strip ไม่สำเร็จ: ${err.message}`;
    status.textContent = msg;
    if (liveVideoPreviewStatus) liveVideoPreviewStatus.textContent = msg;
    showError(err.message);
  } finally {
    button.disabled = capturedLiveClips.length === 0;
  }
});

document.querySelector('#btnCloseLiveVideoPreview')?.addEventListener('click', () => liveVideoPreviewDialog?.close());
liveVideoPreviewDialog?.addEventListener('close', () => {
  clearLiveVideoPreview();
  document.querySelector('#btnExportLiveVideo')?.focus();
});
btnDownloadLiveVideo?.addEventListener('click', async event => {
  if (!liveVideoPreviewState?.url) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await downloadDataUrl(
      liveVideoPreviewState.url,
      `snapframe-live-strip.${liveVideoPreviewState.ext}`,
      liveVideoPreviewState.mimeType
    );
    showToast(`ดาวน์โหลดวิดีโอ Live Strip (.${liveVideoPreviewState.ext}) เรียบร้อยแล้ว!`, 'success');
    liveVideoPreviewDialog?.close();
  } catch (err) {
    if (liveVideoPreviewStatus) liveVideoPreviewStatus.textContent = `บันทึกวิดีโอไม่สำเร็จ: ${err.message}`;
    showError(`บันทึกวิดีโอไม่สำเร็จ: ${err.message}`);
  } finally {
    button.disabled = !liveVideoPreviewState?.url;
  }
});

const gifPreviewDialog = document.querySelector('#gifPreviewDialog');
document.querySelector('#btnCloseGifPreview').addEventListener('click', () => gifPreviewDialog.close());
gifPreviewDialog.addEventListener('close', () => {
  document.querySelector('#gifPreviewImage').removeAttribute('src');
  document.querySelector('#btnExportGif').focus();
});
document.querySelector('#btnDownloadGif').addEventListener('click', async event => {
  const dataUrl = document.querySelector('#gifPreviewImage').getAttribute('src');
  if (!dataUrl) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await downloadDataUrl(dataUrl, 'snapframe-animation.gif', 'image/gif');
    // On iOS the save-image overlay must be visible above the page, outside this modal.
    gifPreviewDialog.close();
  } catch (error) {
    document.querySelector('#gifPreviewStatus').textContent = `บันทึก GIF ไม่สำเร็จ: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

const mobilePhotoDevice = isMobilePhotoDevice();
btnExport.textContent = mobilePhotoDevice ? '💾 บันทึกภาพ' : '💾 ดาวน์โหลดภาพ';
document.querySelector('#btnSharePhoto').textContent = '📤 แชร์ภาพ';
document.querySelector('#btnSharePhoto').classList.toggle('hidden',
  !mobilePhotoDevice || !navigator.share || !navigator.canShare);
document.querySelector('#btnCopyPhoto').classList.toggle('hidden', mobilePhotoDevice);

document.querySelector('#btnSharePhoto').addEventListener('click', async event => {
  const button = event.currentTarget;
  const status = document.querySelector('#sharePhotoStatus');
  button.disabled = true;
  status.textContent = '';
  try {
    const dataUrl = exportImage('image/png');
    const result = await sharePhoto(dataUrl);
    if (result === 'unsupported') {
      status.textContent = 'อุปกรณ์นี้แชร์ไฟล์โดยตรงไม่ได้ กรุณากดบันทึกภาพ แล้วแนบภาพในแอปที่ต้องการ';
    } else if (result === 'shared') {
      status.textContent = 'เปิดหน้าต่างแชร์ภาพแล้ว กรุณาตรวจรูปในแอปปลายทางก่อนส่ง';
    } else if (result === 'cancelled') {
      status.textContent = 'ยกเลิกการแชร์แล้ว';
    }
  } catch (error) {
    status.textContent = `แชร์ภาพไม่สำเร็จ: ${error.message} ลองกดบันทึกภาพแล้วแนบไฟล์ในแอปแชต`;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#btnPrintPhoto').addEventListener('click', async event => {
  const button = event.currentTarget;
  const status = document.querySelector('#sharePhotoStatus');
  button.disabled = true;
  status.textContent = '';
  try {
    const result = await printPhoto(exportImage('image/png'));
    status.textContent = result === 'printed'
      ? 'เปิดหน้าต่างพิมพ์แล้ว เลือกเครื่องพิมพ์และขนาดกระดาษที่ต้องการ'
      : 'เบราว์เซอร์นี้ไม่รองรับการสั่งพิมพ์โดยตรง กรุณาดาวน์โหลดภาพแล้วสั่งพิมพ์จากเครื่อง';
  } catch (error) {
    status.textContent = `สั่งพิมพ์ไม่สำเร็จ: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#btnCopyPhoto').addEventListener('click', async event => {
  const button = event.currentTarget;
  const status = document.querySelector('#sharePhotoStatus');
  button.disabled = true;
  status.textContent = '';
  try {
    const result = await copyPhoto(exportImage('image/png'));
    status.textContent = result === 'copied'
      ? 'คัดลอกภาพแล้ว วางในช่องแชตหรือโปรแกรมที่รองรับการวางรูปภาพได้ หากวางไม่ได้ให้ดาวน์โหลดแล้วแนบไฟล์'
      : 'เบราว์เซอร์หรือการเชื่อมต่อนี้ไม่รองรับคัดลอกภาพ กรุณากดดาวน์โหลดภาพแล้วแนบไฟล์แทน';
  } catch (error) {
    status.textContent = error.name === 'NotAllowedError'
      ? 'เบราว์เซอร์ไม่อนุญาตให้คัดลอกภาพ กรุณาอนุญาตการใช้คลิปบอร์ด หรือดาวน์โหลดภาพแล้วแนบไฟล์'
      : `คัดลอกภาพไม่สำเร็จ: ${error.message} กรุณาดาวน์โหลดภาพแล้วแนบไฟล์`;
  } finally {
    button.disabled = false;
  }
});

function updateStripSummary() {
  const layout = selectedStripFrame?.layout;
  if (activeCaptureTemplate) activeBurstCount = activeCaptureTemplate.capture.count;
  if (btnToolBurst) {
    btnToolBurst.disabled = !!activeCaptureTemplate || !!layout;
    btnToolBurst.title = activeCaptureTemplate ? 'จำนวนภาพถูกล็อคตามเทมเพลต' : 'ถ่ายภาพเรียงต่อกัน';
  }
  if (burstBadge) burstBadge.textContent = `${activeBurstCount}x`;
  document.querySelector('#stripCameraSummary').textContent = `${activeCaptureTemplate ? `เทมเพลต ${activeCaptureTemplate.name}` : selectedStripFrame?.name || 'ไม่ใช้กรอบ'} · ${activeBurstCount} ภาพ${getStripDirectionLabel()}`;
  if (btnAspectActive) {
    btnAspectActive.disabled = !!layout;
    btnAspectActive.textContent = layout ? 'ตามกรอบ' : currentAspectRatio;
  }
  previewBox.style.aspectRatio = layout
    ? `${layout.slots[0].width} / ${layout.slots[0].height}` : currentAspectRatio.replace(':', ' / ');
  updateCameraModesBadge();
}

function renderStripSetup() {
  const layout = selectedStripFrame?.layout;
  const locked = !!layout || !!activeCaptureTemplate;
  document.querySelectorAll('#stripOrientationChips .setup-chip').forEach(btn => {
    const active = btn.dataset.orientation === stripOrientation;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.disabled = locked;
  });
  document.querySelector('#stripOrientationHint').textContent = layout
    ? 'กรอบนี้จัดภาพตามช่องที่กำหนดไว้ เลือกกรอบสำเร็จรูปเพื่อเปลี่ยนแนวการเรียงภาพ'
    : 'แนวนอนเรียงจากซ้ายไปขวา เมื่อเลือก 4 ภาพจะจัดเป็น 2 แถว แถวละ 2 ภาพ';
  if (layout) activeBurstCount = layout.slots.length;
  if (activeCaptureTemplate) activeBurstCount = activeCaptureTemplate.capture.count;
  document.querySelectorAll('#stripShotCountChips .setup-chip').forEach(btn => {
    const active = Number(btn.dataset.count) === activeBurstCount;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.disabled = locked;
  });
  if (btnToolBurst) btnToolBurst.disabled = locked;
  if (burstBadge) burstBadge.textContent = `${activeBurstCount}x`;
  const choices = document.querySelector('#stripFrameChoices');
  choices.replaceChildren();
  [null, ...FRAMES_CATALOG.filter(frame => BUILTIN_FRAME_IDS.has(frame.id) || frame.stripUpload)].forEach(frame => {
    const button = document.createElement('button');
    button.className = 'strip-frame-choice';
    button.type = 'button';
    button.setAttribute('aria-pressed', String((frame?.id || null) === (selectedStripFrame?.id || null)));
    if (frame) {
      const img = document.createElement('img');
      img.src = frame.src;
      img.alt = '';
      button.append(img);
    }
    const label = document.createElement('span');
    label.textContent = frame?.name || 'ไม่ใช้กรอบ';
    button.append(label);
    button.addEventListener('click', () => { activeCaptureTemplate = null; selectedStripFrame = frame; renderStripSetup(); });
    choices.append(button);
  });
  document.querySelector('#stripPreviewLabel').textContent = `${selectedStripFrame?.name || 'ไม่ใช้กรอบ'} · ${activeBurstCount} ภาพ${getStripDirectionLabel()}`;
  renderStripPreview(document.querySelector('#stripPreview'));
  updateStripSummary();
}

function getStripDirectionLabel() {
  if (!selectedStripFrame?.layout && stripOrientation === 'horizontal' && activeBurstCount === 4) return 'จัดแบบ 2×2';
  return selectedStripFrame?.layout ? 'ตามช่องในกรอบ' : stripOrientation === 'horizontal' ? 'เรียงแนวนอน' : 'เรียงแนวตั้ง';
}

function renderStripPreview(preview) {
  preview.replaceChildren();
  const [aw, ah] = currentAspectRatio.split(':').map(Number);
  const layout = selectedStripFrame?.layout || getStripLayout(activeBurstCount, 960, aw / ah, stripOrientation);
  preview.classList.toggle('strip-preview-horizontal', layout.width > layout.height);
  preview.setAttribute('aria-label', `ตัวอย่าง ${activeBurstCount} ภาพ${getStripDirectionLabel()}`);
  preview.style.aspectRatio = `${layout.width} / ${layout.height}`;
  preview.style.background = selectedStripFrame?.layout ? '' : activeStripBgColor;
  layout.slots.forEach((rect, index) => {
    const slot = document.createElement('div');
    slot.className = 'strip-preview-slot';
    slot.style.left = `${rect.x / layout.width * 100}%`;
    slot.style.top = `${rect.y / layout.height * 100}%`;
    slot.style.width = `${rect.width / layout.width * 100}%`;
    slot.style.height = `${rect.height / layout.height * 100}%`;
    slot.textContent = `ภาพที่ ${index + 1}`;
    preview.append(slot);
  });
  const brand = document.createElement('small');
  brand.textContent = 'SnapFrame';
  if (!selectedStripFrame?.layout) preview.append(brand);
  if (selectedStripFrame) {
    const overlay = document.createElement('img');
    overlay.className = 'strip-whole-frame';
    overlay.src = buildBuiltinFrameDataUrl(selectedStripFrame.id, layout.width, layout.height) || selectedStripFrame.src;
    overlay.alt = 'กรอบเดียวคลุมทั้งแถบ';
    preview.append(overlay);
  }
}

function swapCapturedShots(indexA, indexB) {
  if (!capturedFrames[indexA] || !capturedFrames[indexB]) return;
  [capturedFrames[indexA], capturedFrames[indexB]] = [capturedFrames[indexB], capturedFrames[indexA]];
  if (capturedGifFrames[indexA] && capturedGifFrames[indexB]) {
    [capturedGifFrames[indexA], capturedGifFrames[indexB]] = [capturedGifFrames[indexB], capturedGifFrames[indexA]];
    setGifPhotos([...capturedGifFrames]);
  }
  if (capturedLiveClips[indexA] && capturedLiveClips[indexB]) {
    [capturedLiveClips[indexA], capturedLiveClips[indexB]] = [capturedLiveClips[indexB], capturedLiveClips[indexA]];
    setLiveClips([...capturedLiveClips]);
  }
  rebuildEditorStrip();
  renderShotRetakeBar();
}

function renderShotRetakeBar() {
  const bar = document.querySelector('#shotRetakeBar');
  const container = document.querySelector('#shotRetakeButtons');
  const tabShots = document.querySelector('#toolTabShots');
  if (!bar || !container) return;
  if (capturedFrames.length < 1) {
    tabShots?.classList.add('hidden');
    if (activeEditorTool === 'shots') switchEditorTool('filter');
    container.replaceChildren();
    return;
  }
  tabShots?.classList.remove('hidden');
  container.replaceChildren(...capturedFrames.map((frameCanvas, index) => {
    const card = document.createElement('div');
    card.className = 'shot-manage-card';

    const thumb = document.createElement('img');
    thumb.className = 'shot-manage-thumb';
    thumb.src = frameCanvas.toDataURL('image/jpeg', 0.6);
    thumb.alt = `ช็อต ${index + 1}`;
    card.append(thumb);

    const num = document.createElement('span');
    num.textContent = `#${index + 1}`;
    card.append(num);

    if (capturedFrames.length > 1) {
      const btnLeft = document.createElement('button');
      btnLeft.type = 'button';
      btnLeft.className = 'btn-mini';
      btnLeft.textContent = '◀';
      btnLeft.title = 'เลื่อนไปก่อนหน้า';
      btnLeft.disabled = index === 0;
      btnLeft.addEventListener('click', () => swapCapturedShots(index, index - 1));

      const btnRight = document.createElement('button');
      btnRight.type = 'button';
      btnRight.className = 'btn-mini';
      btnRight.textContent = '▶';
      btnRight.title = 'เลื่อนไปถัดไป';
      btnRight.disabled = index === capturedFrames.length - 1;
      btnRight.addEventListener('click', () => swapCapturedShots(index, index + 1));
      card.append(btnLeft, btnRight);
    }

    const btnRetakeShot = document.createElement('button');
    btnRetakeShot.type = 'button';
    btnRetakeShot.className = 'btn-mini';
    btnRetakeShot.textContent = '📷';
    btnRetakeShot.title = `ถ่ายซ่อมช็อต ${index + 1}`;
    btnRetakeShot.addEventListener('click', () => {
      retakingShotIndex = index;
      hasChosenStrip = true;
      switchTab('camera');
      updateStatus(true, `ถ่ายซ่อมช็อตที่ ${index + 1}/${capturedFrames.length} — กดปุ่มถ่ายภาพ`);
    });

    const btnReplace = document.createElement('button');
    btnReplace.type = 'button';
    btnReplace.className = 'btn-mini';
    btnReplace.textContent = '📁';
    btnReplace.title = `เปลี่ยนช็อต ${index + 1} ด้วยรูปจากเครื่อง`;
    btnReplace.addEventListener('click', () => {
      replacingShotIndex = index;
      document.querySelector('#shotReplaceUploader')?.click();
    });

    card.append(btnRetakeShot, btnReplace);
    return card;
  }));
}

async function fileToFittedCanvas(file, targetAspect) {
  const img = await loadImageFromBlob(file).catch(() => {
    throw new Error(`อ่านไฟล์ "${file.name}" ไม่สำเร็จ`);
  });
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  let sw = iw, sh = ih;
  if (iw / ih > targetAspect) {
    sh = ih;
    sw = Math.round(ih * targetAspect);
  } else {
    sw = iw;
    sh = Math.round(iw / targetAspect);
  }
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * scale));
  c.height = Math.max(1, Math.round(sh * scale));
  c.getContext('2d').drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, c.width, c.height);
  return c;
}

async function openStripInEditor({
  frames,
  animationFrames,
  liveClips = [],
  filterCss = 'none',
  decoration,
  aspectRatio,
  frameLayout,
  savedFrame,
  applyTemplateDesign = false
}) {
  activeEditorFilter = filterCss;
  capturedFrames = frames;
  capturedGifFrames = animationFrames;
  setLiveClips(liveClips);
  capturedContext = {
    frame: selectedStripFrame,
    decoration,
    aspectRatio,
    frameLayout,
    stripOrientation
  };
  setTargetCanvas(canvasElement);
  getLayers().filter(layer => layer.type !== 'base').forEach(layer => removeLayer(layer.id, { recordHistory: false }));
  clearDoodle({ recordHistory: false });
  resetHistory();
  rebuildEditorStrip();
  if (applyTemplateDesign && activeCaptureTemplate) {
    await loadTemplateDesign(activeCaptureTemplate.design);
  }
  renderShotRetakeBar();
  setGifPhotos(animationFrames);
  lastCaptureSettings = { count: frames.length, orientation: stripOrientation, aspect: currentAspectRatio, frame: savedFrame };
  renderEditorFilterRow();
  renderEditorFrameRow();
  renderEditorBgColorRow();
  syncEditorTabState();
  switchEditorTool('filter');
}

document.querySelector('#shotReplaceUploader')?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || replacingShotIndex === null || !capturedContext) return;
  const idx = replacingShotIndex;
  replacingShotIndex = null;
  try {
    const slot = capturedContext.frameLayout?.slots[idx];
    const ratio = slot ? (slot.width / slot.height) : capturedContext.aspectRatio;
    const newCanvas = await fileToFittedCanvas(file, ratio);
    capturedFrames[idx] = newCanvas;
    capturedGifFrames[idx] = snapshotGifFrame(newCanvas, null);
    if (capturedLiveClips.length > idx) {
      capturedLiveClips[idx] = [newCanvas];
      setLiveClips([...capturedLiveClips]);
    }
    rebuildEditorStrip();
    renderShotRetakeBar();
    setGifPhotos([...capturedGifFrames]);
    showToast(`เปลี่ยนรูปช็อต ${idx + 1} เรียบร้อยแล้ว`, 'success');
  } catch (err) {
    showError(err.message);
  }
});

document.querySelector('#stripPhotoUploader')?.addEventListener('change', async e => {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  if (!files.length) return;
  hideError();
  try {
    const frameLayout = selectedStripFrame?.layout || null;
    const maxCount = frameLayout ? frameLayout.slots.length : 4;
    if (frameLayout && files.length !== maxCount) {
      throw new Error(`กรอบนี้มี ${maxCount} ช่อง กรุณาเลือกรูปให้ครบ ${maxCount} ภาพ`);
    }
    const picked = files.slice(0, maxCount);
    const [aw, ah] = currentAspectRatio.split(':').map(Number);
    const baseAspect = aw / ah;
    const frames = [];
    const animationFrames = [];
    for (let i = 0; i < picked.length; i++) {
      const slot = frameLayout?.slots[i];
      const ratio = slot ? (slot.width / slot.height) : baseAspect;
      const canvas = await fileToFittedCanvas(picked[i], ratio);
      frames.push(canvas);
      animationFrames.push(snapshotGifFrame(canvas, null));
    }
    activeBurstCount = frames.length;
    const outputLayout = frameLayout || getStripLayout(frames.length, 960, baseAspect, stripOrientation);
    const decoration = await loadStripDecoration(selectedStripFrame, outputLayout.width, outputLayout.height);
    const savedFrame = serializeCaptureFrame(selectedStripFrame, decoration, outputLayout);

    await openStripInEditor({
      frames,
      animationFrames,
      liveClips: [],
      filterCss: 'none',
      decoration,
      aspectRatio: baseAspect,
      frameLayout,
      savedFrame
    });
    hasChosenStrip = true;
    switchTab('editor');
    showToast(`นำเข้า ${frames.length} ภาพจัดเป็น Photo Strip แล้ว!`, 'success');
  } catch (err) {
    showError(err.message);
  }
});

function openShotPickerDialog(allFrames, pickCount) {
  const dialog = document.querySelector('#shotPickerDialog');
  const grid = document.querySelector('#shotPickerGrid');
  const counter = document.querySelector('#shotPickerCounter');
  const btnConfirm = document.querySelector('#btnConfirmShotPick');
  const btnCancel = document.querySelector('#btnCancelShotPick');
  const chosen = [];

  const renderGrid = () => {
    counter.textContent = `เลือกแล้ว ${chosen.length} / ${pickCount} รูป (เรียงตามลำดับที่กดเลือก)`;
    btnConfirm.disabled = chosen.length !== pickCount;
    grid.replaceChildren(...allFrames.map((frameCanvas, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const order = chosen.indexOf(idx);
      btn.className = `shot-pick-item ${order >= 0 ? 'picked' : ''}`;
      const img = document.createElement('img');
      img.src = frameCanvas.toDataURL('image/jpeg', 0.7);
      img.alt = `ช็อต ${idx + 1}`;
      btn.append(img);
      if (order >= 0) {
        const badge = document.createElement('span');
        badge.className = 'shot-pick-badge';
        badge.textContent = String(order + 1);
        btn.append(badge);
      }
      btn.addEventListener('click', () => {
        const pos = chosen.indexOf(idx);
        if (pos >= 0) chosen.splice(pos, 1);
        else if (chosen.length < pickCount) chosen.push(idx);
        renderGrid();
      });
      return btn;
    }));
  };

  renderGrid();
  return new Promise(resolve => {
    const cleanup = result => {
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      resolve(result);
    };
    const onConfirm = () => cleanup([...chosen]);
    const onCancel = () => cleanup(null);
    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);
    dialog.showModal();
  });
}

async function recordLiveShotClip(filterOptions, frameCount = 20, intervalMs = 85) {
  const clip = [];
  for (let k = 0; k < frameCount; k++) {
    clip.push(captureSingleFrame(filterOptions));
    if (k < frameCount - 1) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return clip;
}

async function handleCapture() {
  // หากอยู่ในโหมดกดถ่ายทีละช็อตและกำลังรอให้กดชัตเตอร์ช็อตถัดไป
  if (manualShutterResolver) {
    const next = manualShutterResolver;
    manualShutterResolver = null;
    next();
    return;
  }
  if (isCapturing || isChangingCamera) return;
  if (!videoElement.videoWidth || videoElement.readyState < 2) {
    showError('กล้องยังไม่พร้อม กรุณาอนุญาตการใช้กล้องและรอภาพปรากฏก่อนถ่าย');
    return;
  }
  hideError();
  isCapturing = true;
  const singleRetakeIndex = retakingShotIndex !== null && capturedFrames[retakingShotIndex] && capturedContext
    ? retakingShotIndex : null;
  if (singleRetakeIndex === null) setGifPhotos([]);
  const controls = [...document.querySelectorAll('.nav-tabs button, #viewCamera button, #viewCamera input, #viewCamera select')];
  const disabledStates = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  const count = activeCaptureTemplate?.capture.count || activeBurstCount;
  const frameLayout = singleRetakeIndex !== null ? capturedContext.frameLayout : (selectedStripFrame?.layout || null);
  const aspect = currentAspectRatio.split(':').map(Number);
  const filterCss = FILTERS_CATALOG[activeFilterIndex].css;
  // เก็บภาพดิบโดยไม่ฝังฟิลเตอร์สีลงพิกเซล เพื่อให้เปลี่ยนหรือย้อนกลับเป็นสีปกติได้ในหน้าตกแต่ง
  const filterOptions = {
    filter: activeBrightness !== 1 ? `brightness(${activeBrightness})` : 'none',
    crop: getCaptureCrop()
  };
  let completed = false;
  try {
    if (singleRetakeIndex !== null) {
      const slot = frameLayout?.slots[singleRetakeIndex];
      if (slot) {
        previewBox.style.aspectRatio = `${slot.width} / ${slot.height}`;
        filterOptions.crop = getCaptureCrop(slot.width / slot.height);
      }
      countdownShotBadge.textContent = `ช็อต ${singleRetakeIndex + 1}/${capturedFrames.length}`;
      countdownShotBadge.classList.remove('hidden');
      countdownOverlay.classList.add('active');
      updateStatus(true, `กำลังถ่ายซ่อมช็อต ${singleRetakeIndex + 1}/${capturedFrames.length}`);
      await new Promise(resolve => startCountdown(activeTimerSeconds, remaining => {
        if (soundEnabled && remaining > 0) playCountdownBeep(remaining === 1);
        countdownNumber.textContent = remaining > 0 ? String(remaining) : '📸';
      }, resolve));
      countdownOverlay.classList.remove('active');
      let newFrame;
      if (liveVideoMode && capturedLiveClips.length > singleRetakeIndex) {
        updateStatus(true, `🎬 กำลังอัดคลิป Live Strip ซ่อมช็อต ${singleRetakeIndex + 1}/${capturedFrames.length}...`);
        const clip = await recordLiveShotClip(filterOptions);
        capturedLiveClips[singleRetakeIndex] = clip;
        setLiveClips([...capturedLiveClips]);
        triggerScreenFlash();
        newFrame = clip[clip.length - 1];
      } else {
        triggerScreenFlash();
        newFrame = captureSingleFrame(filterOptions);
        if (capturedLiveClips.length > singleRetakeIndex) {
          capturedLiveClips[singleRetakeIndex] = [newFrame];
          setLiveClips([...capturedLiveClips]);
        }
      }
      capturedFrames[singleRetakeIndex] = newFrame;
      capturedGifFrames[singleRetakeIndex] = snapshotGifFrame(newFrame, null);
      rebuildEditorStrip();
      renderShotRetakeBar();
      setGifPhotos([...capturedGifFrames]);
      retakingShotIndex = null;
      completed = true;
    } else {
      const outputLayout = frameLayout || getStripLayout(count, 960, aspect[0] / aspect[1], stripOrientation);
      const decoration = await loadStripDecoration(selectedStripFrame, outputLayout.width, outputLayout.height);
      const savedFrame = serializeCaptureFrame(selectedStripFrame, decoration, outputLayout);
      const totalToShoot = (!frameLayout && shootPickTotal > count) ? shootPickTotal : count;
      const frames = [];
      const animationFrames = [];
      const liveClips = [];
      renderCamShotPreview(frames, totalToShoot);
      for (let i = 1; i <= totalToShoot; i++) {
        if (frameLayout) {
          const slot = frameLayout.slots[i - 1];
          previewBox.style.aspectRatio = `${slot.width} / ${slot.height}`;
          filterOptions.crop = getCaptureCrop(slot.width / slot.height);
        }
        if (totalToShoot > 1) {
          countdownShotBadge.textContent = `ช็อต ${i}/${totalToShoot}`;
          countdownShotBadge.classList.remove('hidden');
        } else {
          countdownShotBadge.classList.add('hidden');
        }
        countdownOverlay.classList.add('active');
        updateStatus(true, `กำลังถ่ายภาพ ${i}/${totalToShoot}`);
        await new Promise(resolve => startCountdown(activeTimerSeconds, remaining => {
          if (soundEnabled && remaining > 0) playCountdownBeep(remaining === 1);
          countdownNumber.textContent = remaining > 0 ? String(remaining) : '📸';
        }, resolve));
        countdownOverlay.classList.remove('active');
        if (liveVideoMode) {
          updateStatus(true, `🎬 กำลังอัดคลิป Live Strip ช็อต ${i}/${totalToShoot}...`);
          const clip = await recordLiveShotClip(filterOptions);
          liveClips.push(clip);
          triggerScreenFlash();
          frames.push(clip[clip.length - 1]);
        } else {
          triggerScreenFlash();
          frames.push(captureSingleFrame(filterOptions));
        }
        renderCamShotPreview(frames, totalToShoot);
        // เก็บเฟรม GIF แบบดิบ แล้วค่อยใส่ฟิลเตอร์/กรอบ/สติกเกอร์ตอนสร้าง GIF ให้ตรงกับหน้าตกแต่ง
        animationFrames.push(snapshotGifFrame(frames[frames.length - 1], null));
        if (i < totalToShoot) {
          if (manualShutterMode) {
            btnCapture.disabled = false;
            updateStatus(true, `ถ่ายแล้ว ${i}/${totalToShoot} — จัดท่าแล้วกดปุ่มชัตเตอร์สำหรับช็อตที่ ${i + 1}`);
            await new Promise(resolve => { manualShutterResolver = resolve; });
            btnCapture.disabled = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, burstGapSeconds * 1000));
          }
        }
      }

      let finalFrames = frames;
      let finalAnimFrames = animationFrames;
      let finalLiveClips = liveClips;
      if (totalToShoot > count) {
        const pickedIndices = await openShotPickerDialog(frames, count);
        if (!pickedIndices) return;
        finalFrames = pickedIndices.map(idx => frames[idx]);
        finalAnimFrames = pickedIndices.map(idx => animationFrames[idx]);
        if (liveClips.length === frames.length) {
          finalLiveClips = pickedIndices.map(idx => liveClips[idx]);
        }
      }

      await openStripInEditor({
        frames: finalFrames,
        animationFrames: finalAnimFrames,
        liveClips: finalLiveClips,
        filterCss,
        decoration,
        aspectRatio: aspect[0] / aspect[1],
        frameLayout,
        savedFrame,
        applyTemplateDesign: true
      });
      completed = true;
    }
  } catch (err) {
    showError(`เกิดข้อผิดพลาดในการถ่ายภาพ: ${err.message}`);
  } finally {
    manualShutterResolver = null;
    countdownOverlay.classList.remove('active');
    countdownShotBadge.classList.add('hidden');
    document.querySelector('#camShotPreviewStrip')?.classList.add('hidden');
    isCapturing = false;
    controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
  }
  if (completed) {
    switchTab('editor');
    updateStatus(true, `เรียบร้อย! ${count} ภาพ${getStripDirectionLabel()} พร้อมดาวน์โหลด`);
  }
}

function loadStripDecoration(frame = selectedStripFrame, width = null, height = null) {
  if (!frame) return Promise.resolve(null);
  const src = (width && height ? buildBuiltinFrameDataUrl(frame.id, width, height) : null) || frame.src;
  return loadImage(src).catch(() => {
    throw new Error('โหลดกรอบไม่สำเร็จ กรุณาเลือกกรอบใหม่แล้วลองอีกครั้ง');
  });
}

document.querySelector('#tabSetup').addEventListener('click', () => switchTab('setup'));
document.querySelector('#btnChangeStripFrame').addEventListener('click', () => switchTab('setup'));
document.querySelector('#btnBeginStrip').addEventListener('click', () => {
  hasChosenStrip = true;
  switchTab('camera');
});
document.querySelectorAll('#stripOrientationChips .setup-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    if (activeCaptureTemplate || selectedStripFrame?.layout) return;
    stripOrientation = btn.dataset.orientation;
    renderStripSetup();
  });
});
document.querySelectorAll('#stripShotCountChips .setup-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    if (activeCaptureTemplate || selectedStripFrame?.layout) return;
    activeBurstCount = Number(btn.dataset.count);
    if (burstBadge) burstBadge.textContent = `${activeBurstCount}x`;
    renderStripSetup();
  });
});

const customFrameUploadDialog = document.querySelector('#customFrameUploadDialog');
document.querySelector('#btnOpenCustomFrameUpload')?.addEventListener('click', () => {
  document.querySelector('#stripUploadStatus').textContent = '';
  customFrameUploadDialog?.showModal();
});
document.querySelector('#btnCloseCustomFrameUpload')?.addEventListener('click', () => {
  customFrameUploadDialog?.close();
});

document.querySelector('#stripFrameUpload').addEventListener('change', async event => {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  const status = document.querySelector('#stripUploadStatus');
  let url;
  input.disabled = true;
  try {
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type)
      && !(file.type === '' && /\.(png|webp|jpe?g)$/i.test(file.name))) {
      throw new Error('กรุณาเลือกไฟล์ PNG, WebP หรือ JPG/JPEG');
    }
    if (file.size > 15 * 1024 * 1024) throw new Error('กรุณาเลือกไฟล์ขนาดไม่เกิน 15 MB');
    let manuallySelected = false;
    status.textContent = 'กำลังตรวจสอบกรอบ…';
    url = URL.createObjectURL(file);
    let img = await loadImage(url).catch(() => {
      throw new Error('ไม่สามารถอ่านไฟล์รูปนี้ได้');
    });
    const check = document.createElement('canvas');
    check.width = Math.min(img.naturalWidth, 512);
    check.height = Math.max(1, Math.round(check.width * img.naturalHeight / img.naturalWidth));
    if (check.height > 4096) throw new Error('กรอบยาวเกินไป กรุณาใช้สัดส่วนใกล้เคียงตัวอย่าง');
    const ctx = check.getContext('2d');
    ctx.drawImage(img, 0, 0, check.width, check.height);
    const pixels = ctx.getImageData(0, 0, check.width, check.height).data;
    let transparent = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) { transparent = true; break; }
    }
    if (!transparent) {
      status.textContent = 'กำลังค้นหาช่องใส่รูปอัตโนมัติ…';
      await new Promise(resolve => setTimeout(resolve, 0));
      const result = await cutoutFrameSlots(file, {
        detectOnly: true,
        onProgress: progress => { status.textContent = progress.message; }
      });
      customFrameUploadDialog?.close();
      const processed = await openCutoutPicker(file, true, result.candidates);
      manuallySelected = true;
      if (!processed) {
        status.textContent = 'ยกเลิกการเพิ่มกรอบแล้ว';
        return;
      }
      URL.revokeObjectURL(url);
      url = URL.createObjectURL(processed);
      img = await loadImage(url).catch(() => {
        throw new Error('ไม่สามารถอ่านกรอบหลังเจาะช่องได้');
      });
      ctx.clearRect(0, 0, check.width, check.height);
      ctx.drawImage(img, 0, 0, check.width, check.height);
    }
    const layout = getFrameLayout(ctx.getImageData(0, 0, check.width, check.height), { allowEdgeSlots: manuallySelected });
    const frame = { id: `strip-${crypto.randomUUID()}`, name: file.name.replace(/\.[^.]+$/, ''), src: url, stripUpload: true, layout };
    FRAMES_CATALOG.unshift(frame);
    activeCaptureTemplate = null;
    selectedStripFrame = frame;
    url = null; // Keep the object URL alive while this session uses the frame.
    renderStripSetup();
    status.textContent = `พบ ${layout.slots.length} ช่อง ระบบจะถ่ายและครอปรูปให้พอดีแต่ละช่อง ตรวจตัวอย่างก่อนถ่าย กรอบนี้ใช้ได้จนกว่าจะรีเฟรชหน้าเว็บ`;
    customFrameUploadDialog?.close();
    showToast(`เพิ่มกรอบ "${frame.name}" (${layout.slots.length} ช่อง) เรียบร้อยแล้ว`, 'success');
  } catch (error) {
    status.textContent = error.message;
  } finally {
    if (url) URL.revokeObjectURL(url);
    input.disabled = false;
    input.value = '';
  }
});

document.querySelector('#cutoutSelectionMode').addEventListener('change', () => {
  if (!cutoutState) return;
  cutoutState.firstCorner = null;
  drawCutoutPreview();
  document.querySelector('#cutoutStatus').textContent = 'เลือกพื้นที่ใหม่ได้เลย หากเจาะเกินให้กดล้างทั้งหมด';
});
