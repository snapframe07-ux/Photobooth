import './style.css';

// Modules
import {
  initCamera,
  stopCamera,
  switchCamera,
  startCountdown,
  getFacingMode
} from './modules/camera.js';

import {
  initCanvasEngine,
  captureFrame,
  addLayer,
  removeLayer,
  updateLayer,
  selectLayer,
  getSelectedLayerId,
  setOnSelectionChange,
  serializeDesignData,
  loadTemplateDesign,
  downloadImage,
  exportImage,
  getLayers
} from './modules/canvasEngine.js';

import { removeBackground } from './modules/segmenter.js';
import { supabaseService, isSupabaseConfigured } from './modules/supabaseService.js';
import { appUI } from './ui/appUI.js';

// Assets: 11 Frames
import frameVintageGold from './assets/frames/vintage-gold.svg';
import frameVintage from './assets/frames/vintage-frame.svg';
import frameNeonCyber from './assets/frames/neon-cyber.svg';
import frameFloralBloom from './assets/frames/floral-bloom.svg';
import frameRetroFilm from './assets/frames/retro-film.svg';
import frameCutePastel from './assets/frames/cute-pastel.svg';
import frameBirthdayParty from './assets/frames/birthday-party.svg';
import frameMinimalistBlack from './assets/frames/minimalist-black.svg';
import frameComicPop from './assets/frames/comic-pop.svg';
import frameLoveRomance from './assets/frames/love-romance.svg';
import frameFestiveSparkle from './assets/frames/festive-sparkle.svg';

// Assets: 10 Stickers
import stickerStar from './assets/stickers/star.svg';
import stickerHeart from './assets/stickers/heart.svg';
import stickerCrown from './assets/stickers/crown.svg';
import stickerSunglasses from './assets/stickers/sunglasses.svg';
import stickerSparkles from './assets/stickers/sparkles.svg';
import stickerCatEars from './assets/stickers/cat-ears.svg';
import stickerFire from './assets/stickers/fire.svg';
import stickerSpeechBubble from './assets/stickers/speech-bubble.svg';
import stickerPartyHat from './assets/stickers/party-hat.svg';
import stickerRibbonBow from './assets/stickers/ribbon-bow.svg';

const FRAMES_CATALOG = [
  { id: 'vintage-gold', name: 'Vintage Gold', src: frameVintageGold },
  { id: 'vintage-classic', name: 'Vintage Classic', src: frameVintage },
  { id: 'neon-cyber', name: 'Neon Cyberpunk', src: frameNeonCyber },
  { id: 'floral-bloom', name: 'Floral Bloom', src: frameFloralBloom },
  { id: 'retro-film', name: 'Retro 35mm Film', src: frameRetroFilm },
  { id: 'cute-pastel', name: 'Cute Pastel', src: frameCutePastel },
  { id: 'birthday-party', name: 'Party Festival', src: frameBirthdayParty },
  { id: 'minimalist-black', name: 'Minimalist Black', src: frameMinimalistBlack },
  { id: 'comic-pop', name: 'Comic Pop Art', src: frameComicPop },
  { id: 'love-romance', name: 'Love & Romance', src: frameLoveRomance },
  { id: 'festive-sparkle', name: 'Festive Sparkle', src: frameFestiveSparkle }
];

let STICKERS_CATALOG = [
  { id: 'star', name: 'Star', src: stickerStar },
  { id: 'heart', name: 'Heart', src: stickerHeart },
  { id: 'crown', name: 'Crown', src: stickerCrown },
  { id: 'sunglasses', name: 'Cool Glasses', src: stickerSunglasses },
  { id: 'sparkles', name: 'Magic Sparkles', src: stickerSparkles },
  { id: 'cat-ears', name: 'Cat Ears', src: stickerCatEars },
  { id: 'fire', name: 'Lit Fire', src: stickerFire },
  { id: 'speech-bubble', name: 'Snap Bubble', src: stickerSpeechBubble },
  { id: 'party-hat', name: 'Party Hat', src: stickerPartyHat },
  { id: 'ribbon-bow', name: 'Red Ribbon', src: stickerRibbonBow }
];

let currentUser = null;
let lastUploadedStickerBlob = null;
let lastUploadedStickerUrl = null;

// Application Layout
document.querySelector('#app').innerHTML = `
  <header class="app-header">
    <div class="logo-title">
      <span class="logo-icon">📸</span>
      <h2>SnapFrame</h2>
      <div class="auth-box">
        <span class="guest-badge" id="userBadge">Guest Mode</span>
        <button class="btn btn-sm btn-secondary" id="btnAuthModal">🔑 เข้าสู่ระบบ</button>
      </div>
    </div>
    <nav class="nav-tabs">
      <button class="nav-btn active" id="tabCamera">📷 ถ่ายภาพ</button>
      <button class="nav-btn" id="tabEditor">🎨 ตกแต่ง</button>
      <button class="nav-btn" id="tabTemplateGallery">📁 เทมเพลต</button>
      <button class="nav-btn" id="tabGallery">🖼️ คลังภาพ (<span id="galleryCount">0</span>)</button>
    </nav>
  </header>

  <main class="main-content">
    <!-- Status & Alerts -->
    <div class="status-bar">
      <div class="status-badge" id="cameraStatus">
        <span class="dot"></span>
        <span id="statusText">เตรียมพร้อมถ่ายภาพ</span>
      </div>
    </div>

    <div class="alert-error hidden" id="errorBanner">
      <span class="error-icon">⚠️</span>
      <span id="errorMessage"></span>
    </div>

    <!-- View 1: Camera View -->
    <section class="view-section" id="viewCamera">
      <div class="view-card">
        <div class="video-container">
          <video id="webcam" autoplay playsinline class="mirror"></video>
          <div class="countdown-overlay" id="countdownOverlay">
            <span class="countdown-number" id="countdownNumber">3</span>
          </div>
        </div>

        <div class="action-bar">
          <button class="btn btn-icon-round" id="btnSwitch" title="สลับกล้อง">🔄</button>
          <button class="btn btn-shutter" id="btnCapture">📸 ถ่ายภาพ</button>
          <button class="btn btn-icon-round" id="btnStopCamera" title="ปิดกล้อง">⏹️</button>
        </div>
      </div>
    </section>

    <!-- View 2: Photo Decorator View -->
    <section class="view-section hidden" id="viewEditor">
      <div class="view-card">
        <div class="canvas-container">
          <canvas id="photoCanvas" width="1280" height="720"></canvas>
        </div>

        <div class="editor-actions">
          <button class="btn btn-primary btn-large" id="btnExport">💾 ดาวน์โหลดภาพถ่าย</button>
          <div class="editor-sub-actions">
            <button class="btn btn-secondary" id="btnSaveTemplate">☁️ บันทึกเป็นเทมเพลต Supabase</button>
            <button class="btn btn-secondary" id="btnSaveToGallery">🖼️ บันทึกเข้าคลังภาพเซสชัน</button>
            <button class="btn btn-danger" id="btnRetake">📸 ถ่ายใหม่</button>
          </div>
        </div>

        <!-- Scrollable Asset Galleries -->
        <div class="asset-selector-box">
          <div class="asset-tabs">
            <button class="asset-tab-btn active" id="tabFrames">🖼️ กรอบรูป (${FRAMES_CATALOG.length})</button>
            <button class="asset-tab-btn" id="tabStickers">⭐ สติกเกอร์ (<span id="stickerTabCount">${STICKERS_CATALOG.length}</span>)</button>
            <button class="asset-tab-btn" id="tabUpload">📤 อัปโหลด AI</button>
          </div>

          <div class="scroll-gallery" id="galleryFrames">
            <div class="gallery-item none-item" id="btnRemoveFrame">
              <span class="none-icon">🚫</span>
              <span class="item-name">ไม่ใช้กรอบ</span>
            </div>
            ${FRAMES_CATALOG.map(f => `
              <div class="gallery-item frame-item" data-src="${f.src}" data-id="${f.id}">
                <img src="${f.src}" alt="${f.name}" />
                <span class="item-name">${f.name}</span>
              </div>
            `).join('')}
          </div>

          <div class="scroll-gallery hidden" id="galleryStickers"></div>

          <div class="upload-gallery-box hidden" id="galleryUpload">
            <label class="upload-dropzone">
              <span>📤 อัปโหลดสติกเกอร์ (JPG/PNG)</span>
              <input type="file" id="stickerUploader" accept="image/*" class="hidden-input">
            </label>

            <div class="mode-selector-box">
              <label class="select-label">
                <span>🤖 โหมดตัดพื้นหลัง AI:</span>
                <select id="selectSegmenterEngine" class="select-input">
                  <option value="onnx_ai">🤖 AI ตัดวัตถุ/น้องแมว/คน (ONNX Neural Engine)</option>
                  <option value="color_key">🎨 ตัดพื้นหลังสีสม่ำเสมอ (Smart Color Key)</option>
                </select>
              </label>
            </div>

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" id="chkRemoveBg" checked>
                <span>เปิดใช้งานระบบตัดพื้นหลังอัตโนมัติ</span>
              </label>

              <label class="checkbox-label">
                <input type="checkbox" id="chkInvertBg">
                <span>🔄 สลับส่วนที่ลบ (Invert Mask Cut)</span>
              </label>
            </div>

            <div class="progress-container hidden" id="progressContainer">
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" id="progressBarFill" style="width: 0%"></div>
              </div>
              <span class="progress-text" id="progressText">กำลังประมวลผล...</span>
            </div>

            <!-- Save Custom Sticker Button -->
            <button class="btn btn-sm btn-secondary hidden" id="btnSaveCustomSticker">💾 บันทึกสติกเกอร์นี้ลงคลังเพื่อใช้ซ้ำ</button>
          </div>
        </div>

        <div class="layer-manager-box">
          <h4>รายการ Layer ในภาพ:</h4>
          <div id="layerList" class="layer-list"></div>
        </div>
      </div>
    </section>

    <!-- View 3: Template Gallery -->
    <section class="view-section hidden" id="viewTemplateGallery">
      <div class="view-card">
        <h3>📁 คลังเทมเพลตกรอบรูปและสติกเกอร์ (Supabase)</h3>
        <p class="subtitle">เลือกโหลดเทมเพลตของคุณหรือเทมเพลตสาธารณะที่คนอื่นแชร์มาใช้งานได้ทันที</p>

        <div class="template-subtabs">
          <button class="btn btn-sm btn-secondary active" id="tabMyTemplates">👤 เทมเพลตของฉัน</button>
          <button class="btn btn-sm btn-secondary" id="tabSharedTemplates">🌐 เทมเพลตสาธารณะที่แชร์</button>
        </div>

        <div class="template-grid" id="templateGrid"></div>
      </div>
    </section>

    <!-- View 4: Session Photo Gallery -->
    <section class="view-section hidden" id="viewGallery">
      <div class="view-card">
        <h3>🖼️ คลังรูปภาพถ่ายในเซสชันนี้</h3>
        <p class="subtitle">ภาพทั้งหมดถูกบันทึกไว้ในหน่วยความจำเซสชันแบบส่วนตัว</p>

        <div class="session-gallery-grid" id="sessionGalleryGrid"></div>
      </div>
    </section>
  </main>

  <!-- Auth Modal -->
  <div class="modal-overlay hidden" id="authModal">
    <div class="modal-card">
      <button class="btn-close" id="btnCloseAuthModal">✖️</button>
      <h3 id="authModalTitle">🔑 เข้าสู่ระบบ SnapFrame</h3>
      
      <form id="authForm" class="form-box">
        <label>
          <span>อีเมล (Email)</span>
          <input type="email" id="authEmail" required placeholder="user@example.com">
        </label>

        <label>
          <span>รหัสผ่าน (Password)</span>
          <input type="password" id="authPassword" required minlength="6" placeholder="••••••••">
        </label>

        <button type="submit" class="btn btn-primary btn-large" id="btnSubmitAuth">เข้าสู่ระบบ</button>
      </form>

      <div class="auth-toggle">
        <span id="authToggleText">ยังไม่มีบัญชีสมาชิก?</span>
        <button type="button" class="btn-link" id="btnToggleAuthMode">สมัครสมาชิกใหม่</button>
      </div>
    </div>
  </div>

  <!-- Save Template Modal -->
  <div class="modal-overlay hidden" id="saveTemplateModal">
    <div class="modal-card">
      <button class="btn-close" id="btnCloseTemplateModal">✖️</button>
      <h3>☁️ บันทึกตำแหน่งเป็นเทมเพลต (Supabase)</h3>
      <p class="subtitle">ระบบจะบันทึกเฉพาะตำแหน่ง/ขนาดสติกเกอร์และกรอบรูป (ไม่มีการอัปโหลดรูปภาพส่วนตัว)</p>

      <form id="saveTemplateForm" class="form-box">
        <label>
          <span>ชื่อเทมเพลต</span>
          <input type="text" id="tplName" required placeholder="เช่น ปาร์ตี้วันเกิด 2026">
        </label>

        <label class="checkbox-label">
          <input type="checkbox" id="chkSharePublic">
          <span>แชร์เทมเพลตนี้ให้คนอื่นใช้งาน (Public Template)</span>
        </label>

        <button type="submit" class="btn btn-primary btn-large">บันทึกเทมเพลตลง Supabase</button>
      </form>
    </div>
  </div>
`;

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
const countdownOverlay = document.querySelector('#countdownOverlay');
const countdownNumber = document.querySelector('#countdownNumber');

const btnStartCamera = document.querySelector('#btnStart');
const btnStopCamera = document.querySelector('#btnStopCamera');
const btnSwitch = document.querySelector('#btnSwitch');
const btnCapture = document.querySelector('#btnCapture');
const btnRetake = document.querySelector('#btnRetake');
const btnExport = document.querySelector('#btnExport');
const btnSaveToGallery = document.querySelector('#btnSaveToGallery');
const btnSaveTemplate = document.querySelector('#btnSaveTemplate');

const tabFrames = document.querySelector('#tabFrames');
const tabStickers = document.querySelector('#tabStickers');
const tabUpload = document.querySelector('#tabUpload');
const stickerTabCount = document.querySelector('#stickerTabCount');

const galleryFrames = document.querySelector('#galleryFrames');
const galleryStickers = document.querySelector('#galleryStickers');
const galleryUpload = document.querySelector('#galleryUpload');

const stickerUploader = document.querySelector('#stickerUploader');
const selectSegmenterEngine = document.querySelector('#selectSegmenterEngine');
const chkRemoveBg = document.querySelector('#chkRemoveBg');
const chkInvertBg = document.querySelector('#chkInvertBg');
const progressContainer = document.querySelector('#progressContainer');
const progressBarFill = document.querySelector('#progressBarFill');
const progressText = document.querySelector('#progressText');
const btnSaveCustomSticker = document.querySelector('#btnSaveCustomSticker');

const layerList = document.querySelector('#layerList');
const sessionGalleryGrid = document.querySelector('#sessionGalleryGrid');
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
const btnCloseTemplateModal = document.querySelector('#btnCloseTemplateModal');
const saveTemplateForm = document.querySelector('#saveTemplateForm');
const tplName = document.querySelector('#tplName');
const chkSharePublic = document.querySelector('#chkSharePublic');

const tabMyTemplates = document.querySelector('#tabMyTemplates');
const tabSharedTemplates = document.querySelector('#tabSharedTemplates');
const templateGrid = document.querySelector('#templateGrid');

let authMode = 'login';
let templateCategory = 'my';

// Init Canvas Engine
initCanvasEngine(canvasElement);
renderStickerGallery();

setOnSelectionChange(() => {
  refreshLayerListUI();
});

// Auto Start Camera
handleStartCamera();

// Init Auth listener
if (isSupabaseConfigured) {
  supabaseService.getCurrentUser().then(user => {
    updateUserAuthUI(user);
    loadSavedStickersFromSupabase();
  });

  supabaseService.onAuthStateChange((user) => {
    updateUserAuthUI(user);
    loadSavedStickersFromSupabase();
  });
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

/**
 * Render Sticker Gallery Carousel
 */
function renderStickerGallery() {
  galleryStickers.innerHTML = STICKERS_CATALOG.map(s => `
    <div class="gallery-item sticker-item" data-src="${s.src}" data-id="${s.id}">
      <img src="${s.src}" alt="${s.name}" />
      <span class="item-name">${s.name}</span>
    </div>
  `).join('');

  galleryStickers.querySelectorAll('.sticker-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const src = e.currentTarget.dataset.src;
      const id = e.currentTarget.dataset.id;
      await addLayer({
        type: 'sticker',
        image: src,
        id: `sticker-${id}-${Date.now().toString().substring(8)}`,
        x: 350 + Math.random() * 300,
        y: 200 + Math.random() * 200,
        scale: 1,
        rotation: 0
      });
      refreshLayerListUI();
    });
  });

  stickerTabCount.textContent = STICKERS_CATALOG.length;
}

async function loadSavedStickersFromSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    const stickers = await supabaseService.getStickers();
    if (stickers && stickers.length > 0) {
      stickers.forEach(st => {
        if (!STICKERS_CATALOG.some(s => s.id === st.sticker_id)) {
          STICKERS_CATALOG.unshift({
            id: st.sticker_id,
            name: st.name || 'สติกเกอร์บันทึก',
            src: st.image_url
          });
        }
      });
      renderStickerGallery();
    }
  } catch (e) {
    console.warn('Could not load stickers from Supabase:', e.message);
  }
}

/**
 * Tab Navigation
 */
function switchTab(tabName) {
  tabCamera.classList.remove('active');
  tabEditor.classList.remove('active');
  tabTemplateGallery.classList.remove('active');
  tabGallery.classList.remove('active');

  viewCamera.classList.add('hidden');
  viewEditor.classList.add('hidden');
  viewTemplateGallery.classList.add('hidden');
  viewGallery.classList.add('hidden');

  if (tabName === 'camera') {
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

tabCamera.addEventListener('click', () => switchTab('camera'));
tabEditor.addEventListener('click', () => switchTab('editor'));
tabTemplateGallery.addEventListener('click', () => switchTab('templates'));
tabGallery.addEventListener('click', () => switchTab('gallery'));

tabFrames.addEventListener('click', () => {
  tabFrames.classList.add('active');
  tabStickers.classList.remove('active');
  tabUpload.classList.remove('active');
  galleryFrames.classList.remove('hidden');
  galleryStickers.classList.add('hidden');
  galleryUpload.classList.add('hidden');
});

tabStickers.addEventListener('click', () => {
  tabStickers.classList.add('active');
  tabFrames.classList.remove('active');
  tabUpload.classList.remove('active');
  galleryStickers.classList.remove('hidden');
  galleryFrames.classList.add('hidden');
  galleryUpload.classList.add('hidden');
});

tabUpload.addEventListener('click', () => {
  tabUpload.classList.add('active');
  tabFrames.classList.remove('active');
  tabStickers.classList.remove('active');
  galleryUpload.classList.remove('hidden');
  galleryFrames.classList.add('hidden');
  galleryStickers.classList.add('hidden');
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
  const mode = getFacingMode();
  if (mode === 'user') {
    videoElement.classList.add('mirror');
  } else {
    videoElement.classList.remove('mirror');
  }
}

function updateProgress(percentage, message) {
  progressContainer.classList.remove('hidden');
  progressBarFill.style.width = `${percentage}%`;
  progressText.textContent = `${message} (${percentage}%)`;
}

function hideProgress() {
  progressContainer.classList.add('hidden');
}

/**
 * Camera Actions
 */
async function handleStartCamera() {
  hideError();
  try {
    await initCamera(videoElement);
    updateMirrorState();
    updateStatus(true, `พร้อมใช้งาน (${getFacingMode() === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'})`);
  } catch (error) {
    showError(error.message);
    updateStatus(false, 'ไม่สามารถเปิดกล้องได้');
  }
}

function handleStopCamera() {
  stopCamera();
  videoElement.srcObject = null;
  updateStatus(false, 'กล้องปิดอยู่');
}

async function handleSwitchCamera() {
  hideError();
  btnSwitch.disabled = true;
  try {
    await switchCamera(videoElement);
    updateMirrorState();
    updateStatus(true, `พร้อมใช้งาน (${getFacingMode() === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'})`);
  } catch (error) {
    showError(error.message);
  } finally {
    btnSwitch.disabled = false;
  }
}

function handleCapture() {
  hideError();
  btnCapture.disabled = true;
  countdownOverlay.classList.add('active');

  startCountdown(
    3,
    (remaining) => {
      if (remaining > 0) {
        countdownNumber.textContent = remaining;
      }
    },
    async () => {
      countdownNumber.textContent = '📸';
      await captureFrame(videoElement);

      setTimeout(() => {
        countdownOverlay.classList.remove('active');
        btnCapture.disabled = false;
        switchTab('editor');
        updateStatus(true, 'ถ่ายภาพแล้ว - ตกแต่งและใส่กรอบได้เลย!');
      }, 400);
    }
  );
}

/**
 * Frame Catalog Handler
 */
document.querySelectorAll('.frame-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    const src = e.currentTarget.dataset.src;
    const id = e.currentTarget.dataset.id;
    await addLayer({
      type: 'frame',
      image: src,
      id: `frame-${id}`
    });
    refreshLayerListUI();
  });
});

document.querySelector('#btnRemoveFrame').addEventListener('click', () => {
  const layers = getLayers();
  const frameLayer = layers.find(l => l.type === 'frame');
  if (frameLayer) {
    removeLayer(frameLayer.id);
  }
  refreshLayerListUI();
});

/**
 * Custom Sticker Upload with Multi-Engine AI (ONNX + Smart Color Key)
 */
async function handleStickerUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  hideError();
  let finalBlob = file;

  if (chkRemoveBg.checked) {
    try {
      const selectedEngine = selectSegmenterEngine ? selectSegmenterEngine.value : 'onnx_ai';
      updateProgress(10, 'กำลังเตรียมการตัดพื้นหลังด้วย AI...');

      finalBlob = await removeBackground(file, {
        mode: selectedEngine,
        invertCut: chkInvertBg ? chkInvertBg.checked : false,
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
    id: `custom-sticker-${Date.now()}`,
    x: 500,
    y: 300,
    scale: 1,
    rotation: 0
  });

  btnSaveCustomSticker.classList.remove('hidden');
  stickerUploader.value = '';
  refreshLayerListUI();
}

stickerUploader.addEventListener('change', handleStickerUpload);

/**
 * Save Custom Sticker to Gallery Catalog (and Supabase Storage)
 */
btnSaveCustomSticker.addEventListener('click', async () => {
  if (!lastUploadedStickerUrl) return;

  const stickerName = prompt('ตั้งชื่อสติกเกอร์ที่ต้องการบันทึก:', 'สติกเกอร์ส่วนตัว') || 'สติกเกอร์ส่วนตัว';
  let finalUrl = lastUploadedStickerUrl;

  if (currentUser && isSupabaseConfigured && lastUploadedStickerBlob) {
    try {
      const stickerRecord = await supabaseService.uploadSticker(lastUploadedStickerBlob, stickerName);
      if (stickerRecord && stickerRecord.image_url) {
        finalUrl = stickerRecord.image_url;
      }
    } catch (err) {
      console.warn('Could not upload sticker to Supabase:', err.message);
    }
  }

  const newSticker = {
    id: `custom-${Date.now()}`,
    name: stickerName,
    src: finalUrl
  };

  STICKERS_CATALOG.unshift(newSticker);
  renderStickerGallery();

  alert(`🎉 บันทึกสติกเกอร์ "${stickerName}" เรียบร้อยแล้ว! สามารถเลือกใช้งานได้จากแถบ ⭐ สติกเกอร์`);
  btnSaveCustomSticker.classList.add('hidden');
});

/**
 * Layer List UI
 */
function refreshLayerListUI() {
  const layers = getLayers();
  const selectedId = getSelectedLayerId();
  layerList.innerHTML = '';

  if (layers.length === 0) {
    layerList.innerHTML = '<p class="empty-layers">ยังไม่มี Layer ในภาพ</p>';
    return;
  }

  layers.forEach((layer) => {
    const item = document.createElement('div');
    const isSelected = layer.id === selectedId;
    item.className = `layer-item ${isSelected ? 'selected' : ''}`;

    const typeTag = layer.type === 'base' ? '[L1 Base]' : layer.type === 'sticker' ? '[L2 Sticker]' : '[L3 Frame]';

    item.innerHTML = `
      <div class="layer-info" data-id="${layer.id}">
        <span class="layer-tag ${layer.type}">${typeTag}</span>
        <span class="layer-name">${layer.id}</span>
      </div>
      ${
        layer.type !== 'base'
          ? `<div class="layer-controls">
              <label>Rot: <input type="range" class="rot-slider" min="0" max="360" value="${layer.rotation || 0}" data-id="${layer.id}"></label>
              <label>Scale: <input type="range" class="scale-slider" min="0.2" max="3" step="0.1" value="${layer.scale || 1}" data-id="${layer.id}"></label>
              <button class="btn-icon btn-del" data-id="${layer.id}">🗑️</button>
            </div>`
          : ''
      }
    `;

    layerList.appendChild(item);
  });

  document.querySelectorAll('.layer-info').forEach(info => {
    info.addEventListener('click', (e) => selectLayer(e.currentTarget.dataset.id));
  });

  document.querySelectorAll('.rot-slider').forEach(slider => {
    slider.addEventListener('input', (e) => updateLayer(e.target.dataset.id, { rotation: parseFloat(e.target.value) }));
  });

  document.querySelectorAll('.scale-slider').forEach(slider => {
    slider.addEventListener('input', (e) => updateLayer(e.target.dataset.id, { scale: parseFloat(e.target.value) }));
  });

  document.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeLayer(e.target.dataset.id);
    });
  });
}

/**
 * Authentication Modal Logic
 */
btnAuthModal.addEventListener('click', async () => {
  if (currentUser) {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
      await supabaseService.signOut();
      updateUserAuthUI(null);
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
      alert('🎉 เข้าสู่ระบบสำเร็จ!');
    } else {
      user = await supabaseService.signUp(email, password);
      alert('🎉 สมัครสมาชิกสำเร็จ!');
    }
    updateUserAuthUI(user);
    authModal.classList.add('hidden');
  } catch (err) {
    showError(err.message);
  }
});

/**
 * Save Template Modal Logic
 */
btnSaveTemplate.addEventListener('click', () => {
  if (!currentUser) {
    alert('กรุณาเข้าสู่ระบบก่อนเพื่อบันทึกเทมเพลต');
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
  const designData = serializeDesignData();

  try {
    await supabaseService.saveTemplate({
      name,
      designData,
      isShared
    });

    alert('☁️ บันทึกเทมเพลตลง Supabase เรียบร้อยแล้ว!');
    saveTemplateModal.classList.add('hidden');
    tplName.value = '';
    chkSharePublic.checked = false;
  } catch (err) {
    showError(err.message);
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

async function loadTemplateGallery() {
  templateGrid.innerHTML = '<p class="loading-text">กำลังโหลดเทมเพลตจาก Supabase...</p>';

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
      card.innerHTML = `
        <div class="template-card-header">
          <h4>${t.name}</h4>
          ${t.is_shared ? '<span class="badge-shared">🌐 สาธารณะ</span>' : '<span class="badge-private">🔒 ส่วนตัว</span>'}
        </div>
        <p class="template-date">📅 ${new Date(t.created_at).toLocaleDateString('th-TH')}</p>
        <div class="template-card-actions">
          <button class="btn btn-sm btn-primary btn-load-tpl" data-id="${t.template_id}">⚡ โหลดใช้งาน</button>
          ${templateCategory === 'my' ? `<button class="btn-icon btn-del-tpl" data-id="${t.template_id}">🗑️</button>` : ''}
        </div>
      `;
      templateGrid.appendChild(card);

      card.querySelector('.btn-load-tpl').addEventListener('click', async () => {
        await loadTemplateDesign(t.design_data);
        switchTab('editor');
        alert(`📂 โหลดเทมเพลต "${t.name}" สำเร็จ!`);
      });

      const btnDel = card.querySelector('.btn-del-tpl');
      if (btnDel) {
        btnDel.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`คุณต้องการลบเทมเพลต "${t.name}" หรือไม่?`)) {
            await supabaseService.deleteTemplate(t.template_id);
            loadTemplateGallery();
          }
        });
      }
    });
  } catch (err) {
    templateGrid.innerHTML = `<p class="alert-error">เกิดข้อผิดพลาด: ${err.message}</p>`;
  }
}

/**
 * Session Gallery Actions
 */
function handleSaveToSessionGallery() {
  try {
    const dataUrl = exportImage('image/png');
    const photo = appUI.addSessionPhoto(dataUrl);
    galleryCount.textContent = appUI.getSessionPhotos().length;
    alert('🎉 บันทึกภาพลงในคลังภาพเซสชันสำเร็จ!');
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
        <a class="btn btn-secondary btn-sm" href="${p.dataUrl}" download="snapframe-${p.id}.png">📥 ดาวน์โหลด</a>
      </div>
    `;
    sessionGalleryGrid.appendChild(card);
  });
}

// Global Event Listeners
btnStartCamera?.addEventListener('click', handleStartCamera);
btnStopCamera?.addEventListener('click', handleStopCamera);
btnSwitch?.addEventListener('click', handleSwitchCamera);
btnCapture?.addEventListener('click', handleCapture);
btnRetake?.addEventListener('click', () => switchTab('camera'));

btnExport?.addEventListener('click', () => {
  downloadImage('snapframe-photo.png', 'image/png');
  handleSaveToSessionGallery();
});

btnSaveToGallery?.addEventListener('click', handleSaveToSessionGallery);
