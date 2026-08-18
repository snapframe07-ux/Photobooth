import './style.css';

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
  captureFrame,
  setBaseLayerImage,
  addLayer,
  removeLayer,
  updateLayer,
  selectLayer,
  getSelectedLayerId,
  setOnSelectionChange,
  setTargetCanvas,
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

const FILTERS_CATALOG = [
  { id: 'classic', name: 'Classic', css: 'none', class: 'swatch-classic' },
  { id: 'sunlit', name: 'Sunlit', css: 'sepia(0.35) saturate(1.4) brightness(1.05)', class: 'swatch-sunlit' },
  { id: 'frost', name: 'Frost', css: 'hue-rotate(180deg) saturate(1.2) brightness(1.1)', class: 'swatch-frost' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.2) brightness(0.95)', class: 'swatch-noir' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.8) contrast(1.1)', class: 'swatch-vivid' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.2) saturate(1.3) hue-rotate(-10deg)', class: 'swatch-warm' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.5) contrast(1.15) brightness(0.9)', class: 'swatch-vintage' }
];

let currentUser = null;
let lastUploadedStickerBlob = null;
let lastUploadedStickerUrl = null;

// Camera Studio State
let activeFilterIndex = 0;
let activeTimerSeconds = 3;
let activeBrightness = 1.0;
let activeZoom = 1.0;
let camPreviewLayers = [];  // preview layers (frames/stickers) on camera view
let camPreviewRAF = null;   // requestAnimationFrame id for preview loop
let activeBurstCount = 1;
let isGridActive = false;
let currentAspectRatio = '4:3';

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

    <!-- View 1: Photobooth Studio Camera View (Figma Redesign) -->
    <section class="view-section" id="viewCamera">
      <div class="cam-studio-card">
        <div class="cam-header-title">กล้องหลัก</div>

        <div class="cam-studio-wrapper">
          <!-- Film Holes Left & Right -->
          <div class="film-side-holes left">
            <div class="film-hole"></div><div class="film-hole"></div><div class="film-hole"></div>
            <div class="film-hole"></div><div class="film-hole"></div><div class="film-hole"></div>
            <div class="film-hole"></div><div class="film-hole"></div><div class="film-hole"></div>
          </div>

          <div class="film-side-holes right">
            <div class="film-hole"></div><div class="film-hole"></div><div class="film-hole"></div>
            <div class="film-hole"></div><div class="film-hole"></div><div class="film-hole"></div>
            <div class="film-hole"></div><div class="film-hole"></div><div class="film-hole"></div>
          </div>

          <!-- Main Workspace Grid -->
          <div class="cam-workspace">
            <!-- Left Panel -->
            <div class="cam-left-panel">
              <!-- Aspect Ratio Selector -->
              <div class="aspect-ratio-group">
                <button class="btn-aspect-opt active" id="btnAspectActive" title="กดเปลี่ยนอัตราส่วนภาพ">4:3</button>
                <button class="btn-arrow-toggle" id="btnAspectArrow" title="กดเปลี่ยนอัตราส่วนภาพ">▼</button>
              </div>

              <!-- Filter Swatches (3 visible at a time) -->
              <div class="filter-group">
                <button class="btn-arrow-toggle" id="btnFilterUp">▲</button>
                <div class="filter-carousel-viewport">
                  <div class="filter-carousel-track" id="filterCarouselTrack">
                    <!-- Filter items populated dynamically -->
                  </div>
                </div>
                <button class="btn-arrow-toggle" id="btnFilterDown">▼</button>
              </div>
            </div>

            <!-- Center Preview Area -->
            <div class="cam-center-area">
              <div class="cam-preview-box" id="previewBox" style="aspect-ratio: 4 / 3;">
                <video id="webcam" autoplay playsinline class="mirror"></video>
                <canvas id="camPreviewCanvas"></canvas>

                <!-- Grid 3x3 Overlay -->
                <div class="cam-grid-overlay" id="camGridOverlay">
                  <div class="cam-grid-cell"></div><div class="cam-grid-cell"></div><div class="cam-grid-cell"></div>
                  <div class="cam-grid-cell"></div><div class="cam-grid-cell"></div><div class="cam-grid-cell"></div>
                  <div class="cam-grid-cell"></div><div class="cam-grid-cell"></div><div class="cam-grid-cell"></div>
                </div>

                <!-- Countdown Overlay -->
                <div class="countdown-overlay" id="countdownOverlay">
                  <span class="countdown-number" id="countdownNumber">3</span>
                </div>

                <!-- Zoom Ruler Bar -->
                <div class="zoom-ruler-bar">
                  <span class="zoom-icon">🔍-</span>
                  <div class="zoom-ruler-track">
                    <input type="range" class="zoom-ruler-input" id="zoomSlider" min="1" max="3" step="0.1" value="1">
                  </div>
                  <span class="zoom-icon">🔍+</span>
                </div>
              </div>
            </div>

            <!-- Right Panel -->
            <div class="cam-right-panel">
              <!-- Timer Selector -->
              <div class="timer-group">
                <button class="btn-timer-opt active" id="btnTimerActive">3s</button>
                <button class="btn-arrow-toggle" id="btnTimerArrow">▼</button>
              </div>

              <!-- Brightness Slider -->
              <div class="brightness-group">
                <span class="brightness-icon">☀️</span>
                <div class="brightness-slider-wrap">
                  <input type="range" class="brightness-input" id="brightnessSlider" min="0.5" max="1.5" step="0.05" value="1">
                </div>
                <span class="brightness-icon">🔆</span>
              </div>
            </div>
          </div>

          <!-- Bottom Film Strip Toolbar -->
          <div class="cam-bottom-filmstrip">
            <div class="film-holes-horizontal">
              <div class="film-hole-h"></div><div class="film-hole-h"></div><div class="film-hole-h"></div>
              <div class="film-hole-h"></div><div class="film-hole-h"></div><div class="film-hole-h"></div>
            </div>

            <div class="cam-toolbar">
              <!-- Frame Popup Button -->
              <button class="btn-tool-icon" id="btnToolFrame" title="เลือกกรอบรูป">
                🖼️
              </button>

              <!-- Sticker Popup Button -->
              <button class="btn-tool-icon" id="btnToolSticker" title="เลือกสติกเกอร์">
                ⭐
                <span class="badge-plus">+</span>
              </button>

              <!-- Shutter / Capture Button -->
              <button class="btn-shutter-rec" id="btnCapture" title="ถ่ายภาพ">
                <div class="shutter-inner-dot"></div>
              </button>

              <!-- Burst Mode Button -->
              <button class="btn-tool-icon" id="btnToolBurst" title="ถ่ายภาพเรียงต่อกัน">
                🎞️
                <span class="badge-count" id="burstBadge">1x</span>
              </button>

              <!-- Grid Overlay Button -->
              <button class="btn-tool-icon" id="btnToolGrid" title="เปิด/ปิด Grid">
                #
              </button>
            </div>
          </div>
        </div>

        <!-- Frame Floating Popup Modal -->
        <div class="cam-popup-modal hidden" id="framePopupModal">
          <div class="cam-popup-header">
            <span class="cam-popup-title">🖼️ เลือกกรอบรูปในคลัง Database</span>
            <button class="btn-popup-action" id="btnGoToEditorFromFrame">🎨 หน้าตกแต่ง / เพิ่มกรอบใหม่</button>
            <button class="btn-popup-action" id="btnCloseFramePopup">▼ พับหน้าต่าง</button>
          </div>
          <div class="cam-popup-grid" id="framePopupGrid"></div>
        </div>

        <!-- Sticker Floating Popup Modal -->
        <div class="cam-popup-modal hidden" id="stickerPopupModal">
          <div class="cam-popup-header">
            <span class="cam-popup-title">⭐ เลือกสติกเกอร์ในคลัง Database</span>
            <button class="btn-popup-action" id="btnGoToEditorFromSticker">🎨 หน้าตกแต่ง / เพิ่มสติกเกอร์ใหม่</button>
            <button class="btn-popup-action" id="btnCloseStickerPopup">▼ พับหน้าต่าง</button>
          </div>
          <div class="cam-popup-grid" id="stickerPopupGrid"></div>
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

            <label class="checkbox-label">
              <input type="checkbox" id="chkRemoveBg" checked>
              <span>ตัดพื้นหลังอัตโนมัติ (MediaPipe AI + Smart Color Key)</span>
            </label>

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

const btnStopCamera = document.querySelector('#btnStopCamera');
const btnSwitch = document.querySelector('#btnSwitch');
const btnCapture = document.querySelector('#btnCapture');
const btnRetake = document.querySelector('#btnRetake');
const btnExport = document.querySelector('#btnExport');
const btnSaveToGallery = document.querySelector('#btnSaveToGallery');
const btnSaveTemplate = document.querySelector('#btnSaveTemplate');

// Camera Studio DOM Elements
const previewBox = document.querySelector('#previewBox');
const camPreviewCanvas = document.querySelector('#camPreviewCanvas');
const btnAspectActive = document.querySelector('#btnAspectActive');
const aspectCollapsible = document.querySelector('#aspectCollapsible');
const btnAspectArrow = document.querySelector('#btnAspectArrow');

const filterCarouselTrack = document.querySelector('#filterCarouselTrack');
const btnFilterUp = document.querySelector('#btnFilterUp');
const btnFilterDown = document.querySelector('#btnFilterDown');

const btnTimerActive = document.querySelector('#btnTimerActive');
const btnTimerArrow = document.querySelector('#btnTimerArrow');

const brightnessSlider = document.querySelector('#brightnessSlider');
const zoomSlider = document.querySelector('#zoomSlider');

const camGridOverlay = document.querySelector('#camGridOverlay');
const btnToolGrid = document.querySelector('#btnToolGrid');

const btnToolBurst = document.querySelector('#btnToolBurst');
const burstBadge = document.querySelector('#burstBadge');

const btnToolFrame = document.querySelector('#btnToolFrame');
const framePopupModal = document.querySelector('#framePopupModal');
const framePopupGrid = document.querySelector('#framePopupGrid');
const btnGoToEditorFromFrame = document.querySelector('#btnGoToEditorFromFrame');
const btnCloseFramePopup = document.querySelector('#btnCloseFramePopup');

const btnToolSticker = document.querySelector('#btnToolSticker');
const stickerPopupModal = document.querySelector('#stickerPopupModal');
const stickerPopupGrid = document.querySelector('#stickerPopupGrid');
const btnGoToEditorFromSticker = document.querySelector('#btnGoToEditorFromSticker');
const btnCloseStickerPopup = document.querySelector('#btnCloseStickerPopup');

const tabFrames = document.querySelector('#tabFrames');
const tabStickers = document.querySelector('#tabStickers');
const tabUpload = document.querySelector('#tabUpload');
const stickerTabCount = document.querySelector('#stickerTabCount');

const galleryFrames = document.querySelector('#galleryFrames');
const galleryStickers = document.querySelector('#galleryStickers');
const galleryUpload = document.querySelector('#galleryUpload');

const stickerUploader = document.querySelector('#stickerUploader');
const chkRemoveBg = document.querySelector('#chkRemoveBg');
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

function applyLiveStreamFilters() {
  const currentFilter = FILTERS_CATALOG[activeFilterIndex].css;
  const brightnessStr = `brightness(${activeBrightness})`;
  const filterCombined = currentFilter === 'none' ? brightnessStr : `${currentFilter} ${brightnessStr}`;

  videoElement.style.filter = filterCombined;

  // Zoom & Mirror transforms
  const isMirrored = videoElement.classList.contains('mirror');
  const mirrorScale = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
  const zoomScale = `scale(${activeZoom})`;
  videoElement.style.transform = `${mirrorScale} ${zoomScale}`;
}

// 1. Aspect Ratio Cycling (4:3 -> 1:1 -> 16:9)
const ASPECT_STEPS = ['4:3', '1:1', '16:9'];

function cycleAspectRatio() {
  const currentIdx = ASPECT_STEPS.indexOf(currentAspectRatio);
  const nextIdx = (currentIdx + 1) % ASPECT_STEPS.length;
  currentAspectRatio = ASPECT_STEPS[nextIdx];
  btnAspectActive.textContent = currentAspectRatio;
  previewBox.style.aspectRatio = currentAspectRatio.replace(':', ' / ');
}

btnAspectActive?.addEventListener('click', cycleAspectRatio);
btnAspectArrow?.addEventListener('click', cycleAspectRatio);

// 2. Filter Carousel & Realtime Preview (with Mouse Wheel Scroll Support)
function renderFilterCarousel() {
  if (!filterCarouselTrack) return;
  filterCarouselTrack.innerHTML = FILTERS_CATALOG.map((f, i) => `
    <div class="filter-swatch-item ${i === activeFilterIndex ? 'active' : ''}" data-index="${i}">
      <div class="filter-swatch-box ${f.class}"></div>
      <span class="filter-swatch-name">${f.name}</span>
    </div>
  `).join('');

  filterCarouselTrack.querySelectorAll('.filter-swatch-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      selectFilter(idx);
    });
  });

  updateFilterTrackPosition();
}

function selectFilter(index) {
  activeFilterIndex = index;
  renderFilterCarousel();
  applyLiveStreamFilters();
}

function updateFilterTrackPosition() {
  if (!filterCarouselTrack) return;
  const offset = -(activeFilterIndex * 66);
  filterCarouselTrack.style.transform = `translateY(${offset}px)`;
}

btnFilterUp?.addEventListener('click', () => {
  activeFilterIndex = (activeFilterIndex - 1 + FILTERS_CATALOG.length) % FILTERS_CATALOG.length;
  selectFilter(activeFilterIndex);
});

btnFilterDown?.addEventListener('click', () => {
  activeFilterIndex = (activeFilterIndex + 1) % FILTERS_CATALOG.length;
  selectFilter(activeFilterIndex);
});

// Enable Mouse Wheel Scroll on Filter Viewport
const filterCarouselViewport = document.querySelector('.filter-carousel-viewport');
filterCarouselViewport?.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    activeFilterIndex = (activeFilterIndex + 1) % FILTERS_CATALOG.length;
  } else if (e.deltaY < 0) {
    activeFilterIndex = (activeFilterIndex - 1 + FILTERS_CATALOG.length) % FILTERS_CATALOG.length;
  }
  selectFilter(activeFilterIndex);
}, { passive: false });

// Initial Carousel Render
renderFilterCarousel();

// 3. Countdown Timer Cycle (0, 3, 5, 10)
const TIMER_STEPS = [0, 3, 5, 10];

function cycleTimer() {
  const currentIdx = TIMER_STEPS.indexOf(activeTimerSeconds);
  const nextIdx = (currentIdx + 1) % TIMER_STEPS.length;
  activeTimerSeconds = TIMER_STEPS[nextIdx];
  btnTimerActive.textContent = `${activeTimerSeconds}s`;
}

btnTimerActive?.addEventListener('click', cycleTimer);
btnTimerArrow?.addEventListener('click', cycleTimer);

// 4. Brightness & Zoom Sliders
brightnessSlider?.addEventListener('input', (e) => {
  activeBrightness = parseFloat(e.target.value);
  applyLiveStreamFilters();
});

zoomSlider?.addEventListener('input', async (e) => {
  activeZoom = parseFloat(e.target.value);
  applyLiveStreamFilters();
  await setZoom(activeZoom);
});

// 5. Grid Overlay Toggle
btnToolGrid?.addEventListener('click', () => {
  isGridActive = !isGridActive;
  btnToolGrid.classList.toggle('active', isGridActive);
  camGridOverlay.classList.toggle('active', isGridActive);
});

// 6. Burst Mode Cycle (1, 2, 4, 6)
const BURST_STEPS = [1, 2, 4, 6];

btnToolBurst?.addEventListener('click', () => {
  const currentIdx = BURST_STEPS.indexOf(activeBurstCount);
  const nextIdx = (currentIdx + 1) % BURST_STEPS.length;
  activeBurstCount = BURST_STEPS[nextIdx];
  burstBadge.textContent = `${activeBurstCount}x`;
  btnToolBurst.classList.toggle('active', activeBurstCount > 1);
});

// 7. Floating Popups (Frame & Sticker)
btnToolFrame?.addEventListener('click', () => {
  stickerPopupModal.classList.add('hidden');
  btnToolSticker.classList.remove('active');

  framePopupModal.classList.toggle('hidden');
  btnToolFrame.classList.toggle('active', !framePopupModal.classList.contains('hidden'));
  if (!framePopupModal.classList.contains('hidden')) {
    renderFramePopupGrid();
  }
});

btnCloseFramePopup?.addEventListener('click', () => {
  framePopupModal.classList.add('hidden');
  btnToolFrame.classList.remove('active');
});

btnGoToEditorFromFrame?.addEventListener('click', () => {
  framePopupModal.classList.add('hidden');
  btnToolFrame.classList.remove('active');
  switchTab('editor');
});

function renderFramePopupGrid() {
  if (!framePopupGrid) return;
  framePopupGrid.innerHTML = FRAMES_CATALOG.map(f => `
    <div class="popup-grid-item" data-src="${f.src}" data-id="${f.id}">
      <img src="${f.src}" alt="${f.name}" />
      <span>${f.name}</span>
    </div>
  `).join('');

  framePopupGrid.querySelectorAll('.popup-grid-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const src = e.currentTarget.dataset.src;
      const id = e.currentTarget.dataset.id;
      const name = e.currentTarget.querySelector('span').textContent;
      await addPreviewLayer({ type: 'frame', image: src, id: `frame-${id}`, name });
      framePopupModal.classList.add('hidden');
      btnToolFrame.classList.remove('active');
    });
  });
}

btnToolSticker?.addEventListener('click', () => {
  framePopupModal.classList.add('hidden');
  btnToolFrame.classList.remove('active');

  stickerPopupModal.classList.toggle('hidden');
  btnToolSticker.classList.toggle('active', !stickerPopupModal.classList.contains('hidden'));
  if (!stickerPopupModal.classList.contains('hidden')) {
    renderStickerPopupGrid();
  }
});

btnCloseStickerPopup?.addEventListener('click', () => {
  stickerPopupModal.classList.add('hidden');
  btnToolSticker.classList.remove('active');
});

btnGoToEditorFromSticker?.addEventListener('click', () => {
  stickerPopupModal.classList.add('hidden');
  btnToolSticker.classList.remove('active');
  switchTab('editor');
});

function renderStickerPopupGrid() {
  if (!stickerPopupGrid) return;
  stickerPopupGrid.innerHTML = STICKERS_CATALOG.map(s => `
    <div class="popup-grid-item" data-src="${s.src}" data-id="${s.id}">
      <img src="${s.src}" alt="${s.name}" />
      <span>${s.name}</span>
    </div>
  `).join('');

  stickerPopupGrid.querySelectorAll('.popup-grid-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const src = e.currentTarget.dataset.src;
      const id = e.currentTarget.dataset.id;
      const name = e.currentTarget.querySelector('span').textContent;
      const cw = camPreviewCanvas.width || 640;
      const ch = camPreviewCanvas.height || 480;
      await addPreviewLayer({
        type: 'sticker',
        image: src,
        id: `sticker-${id}-${Date.now().toString().substring(8)}`,
        name,
        x: cw / 2 + (Math.random() - 0.5) * 100,
        y: ch / 2 + (Math.random() - 0.5) * 80
      });
      stickerPopupModal.classList.add('hidden');
      btnToolSticker.classList.remove('active');
    });
  });
}

// --- Camera Preview Layer Management ---
async function addPreviewLayer(layerData) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = typeof layerData.image === 'string' ? layerData.image : layerData.image.src;
  });

  const cw = camPreviewCanvas.width || 640;
  const ch = camPreviewCanvas.height || 480;
  const defaultW = layerData.type === 'frame' ? cw : Math.min(img.width, 150);
  const defaultH = layerData.type === 'frame' ? ch : Math.min(img.height, 150);

  const layer = {
    id: layerData.id,
    type: layerData.type,
    name: layerData.name || layerData.id,
    src: typeof layerData.image === 'string' ? layerData.image : img.src,
    image: img,
    x: layerData.x ?? cw / 2,
    y: layerData.y ?? ch / 2,
    width: defaultW,
    height: defaultH,
    rotation: 0,
    scale: 1,
    opacity: 1
  };

  if (layer.type === 'frame') {
    const idx = camPreviewLayers.findIndex(l => l.type === 'frame');
    if (idx >= 0) camPreviewLayers[idx] = layer;
    else camPreviewLayers.push(layer);
  } else {
    camPreviewLayers.push(layer);
  }
}

function removePreviewLayer(id) {
  camPreviewLayers = camPreviewLayers.filter(l => l.id !== id);
}

function clearPreviewLayers() {
  camPreviewLayers = [];
}

// Preview rendering loop
function startCamPreviewLoop() {
  if (camPreviewRAF) return;
  function loop() {
    renderCamPreview();
    camPreviewRAF = requestAnimationFrame(loop);
  }
  camPreviewRAF = requestAnimationFrame(loop);
}

function stopCamPreviewLoop() {
  if (camPreviewRAF) {
    cancelAnimationFrame(camPreviewRAF);
    camPreviewRAF = null;
  }
}

function renderCamPreview() {
  if (!camPreviewCanvas) return;
  const pctx = camPreviewCanvas.getContext('2d');
  pctx.clearRect(0, 0, camPreviewCanvas.width, camPreviewCanvas.height);

  if (camPreviewLayers.length === 0) return;

  const stickers = camPreviewLayers.filter(l => l.type === 'sticker');
  const frames = camPreviewLayers.filter(l => l.type === 'frame');
  const ordered = [...stickers, ...frames];

  ordered.forEach(layer => {
    if (!layer.image) return;
    pctx.save();
    pctx.globalAlpha = layer.opacity ?? 1;
    pctx.translate(layer.x, layer.y);
    if (layer.rotation) pctx.rotate((layer.rotation * Math.PI) / 180);
    const s = layer.scale || 1;
    pctx.scale(s, s);
    const w = layer.width;
    const h = layer.height;
    pctx.drawImage(layer.image, -w / 2, -h / 2, w, h);
    pctx.restore();
  });
}

// Sync preview canvas size with video
if (previewBox && camPreviewCanvas) {
  const resizeObs = new ResizeObserver(() => {
    const rect = previewBox.getBoundingClientRect();
    camPreviewCanvas.width = rect.width;
    camPreviewCanvas.height = rect.height;
  });
  resizeObs.observe(previewBox);
}

startCamPreviewLoop();

/**
 * Camera Actions (Updated with Realtime Filters, Timer, & Burst Mode)
 */
async function handleStartCamera() {
  hideError();
  try {
    await initCamera(videoElement);
    updateMirrorState();
    applyLiveStreamFilters();
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
  if (btnSwitch) btnSwitch.disabled = true;
  try {
    await switchCamera(videoElement);
    updateMirrorState();
    applyLiveStreamFilters();
    updateStatus(true, `พร้อมใช้งาน (${getFacingMode() === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'})`);
  } catch (error) {
    showError(error.message);
  } finally {
    if (btnSwitch) btnSwitch.disabled = false;
  }
}

/**
 * Captures a single frame from video with filters and returns an offscreen canvas.
 */
function captureSingleFrame(filterOptions) {
  const vw = videoElement.videoWidth || 1280;
  const vh = videoElement.videoHeight || 720;
  const offscreen = document.createElement('canvas');
  offscreen.width = vw;
  offscreen.height = vh;
  const offCtx = offscreen.getContext('2d');

  const isMirrored = videoElement.classList.contains('mirror');
  if (isMirrored) {
    offCtx.translate(vw, 0);
    offCtx.scale(-1, 1);
  }
  if (filterOptions.filter && filterOptions.filter !== 'none') {
    offCtx.filter = filterOptions.filter;
  }
  offCtx.drawImage(videoElement, 0, 0, vw, vh);
  return offscreen;
}

/**
 * Composes multiple captured canvases into a single Photobooth Grid Card image.
 * 2 → 2×1 vertical strip, 4 → 2×2 grid, 6 → 3×2 grid
 */
function composeBurstGrid(frames) {
  const count = frames.length;
  let cols, rows;
  if (count <= 2) {
    cols = 1;
    rows = 2; // 2 photos stacked vertically (classic photobooth strip)
  } else if (count <= 4) {
    cols = 2;
    rows = 2; // 4 photos in 2x2 grid
  } else {
    cols = 2;
    rows = 3; // 6 photos in 3x2 grid
  }

  const fw = frames[0].width;
  const fh = frames[0].height;
  const gap = 16;
  const padding = 24;

  const totalW = cols * fw + (cols - 1) * gap + padding * 2;
  const totalH = rows * fh + (rows - 1) * gap + padding * 2;

  const composite = document.createElement('canvas');
  composite.width = totalW;
  composite.height = totalH;
  const cctx = composite.getContext('2d');

  // Photobooth Card background frame
  cctx.fillStyle = '#18181b';
  cctx.fillRect(0, 0, totalW, totalH);

  // Decorative border
  cctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  cctx.lineWidth = 2;
  cctx.strokeRect(8, 8, totalW - 16, totalH - 16);

  frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (fw + gap);
    const y = padding + row * (fh + gap);
    cctx.drawImage(frame, x, y, fw, fh);
  });

  return composite;
}

/**
 * After capture, transfer preview layers to canvasEngine and switch to editor.
 */
async function transferPreviewLayersToEditor() {
  setTargetCanvas(canvasElement);

  for (const pl of camPreviewLayers) {
    await addLayer({
      type: pl.type,
      image: pl.src,
      id: pl.id,
      x: undefined,
      y: undefined,
      scale: pl.scale,
      rotation: pl.rotation
    });
  }
  clearPreviewLayers();
  refreshLayerListUI();
}

async function handleCapture() {
  hideError();
  btnCapture.disabled = true;
  framePopupModal.classList.add('hidden');
  stickerPopupModal.classList.add('hidden');
  btnToolFrame.classList.remove('active');
  btnToolSticker.classList.remove('active');

  const filterCss = FILTERS_CATALOG[activeFilterIndex].css;
  const filterOptions = {
    filter: filterCss === 'none' ? `brightness(${activeBrightness})` : `${filterCss} brightness(${activeBrightness})`
  };

  try {
    if (activeBurstCount <= 1) {
      // --- Single shot ---
      if (activeTimerSeconds > 0) {
        countdownOverlay.classList.add('active');
      }

      startCountdown(
        activeTimerSeconds,
        (remaining) => {
          if (remaining > 0) countdownNumber.textContent = remaining;
          else countdownNumber.textContent = '📸';
        },
        async () => {
          await captureFrame(videoElement, filterOptions);
          await transferPreviewLayersToEditor();

          setTimeout(() => {
            countdownOverlay.classList.remove('active');
            btnCapture.disabled = false;
            switchTab('editor');
            updateStatus(true, 'ถ่ายภาพแล้ว - ตกแต่งและใส่กรอบได้เลย!');
          }, 400);
        }
      );
    } else {
      // --- Burst Mode: countdown per shot + compose into grid ---
      const capturedFrames = [];

      for (let i = 1; i <= activeBurstCount; i++) {
        countdownOverlay.classList.add('active');

        await new Promise((resolve) => {
          if (activeTimerSeconds > 0) {
            startCountdown(
              activeTimerSeconds,
              (remaining) => {
                if (remaining > 0) {
                  countdownNumber.textContent = `${remaining}s (📸 ${i}/${activeBurstCount})`;
                } else {
                  countdownNumber.textContent = `📸 #${i}`;
                }
              },
              () => {
                const frame = captureSingleFrame(filterOptions);
                capturedFrames.push(frame);
                resolve();
              }
            );
          } else {
            countdownNumber.textContent = `📸 ${i}/${activeBurstCount}`;
            const frame = captureSingleFrame(filterOptions);
            capturedFrames.push(frame);
            resolve();
          }
        });

        // Flash delay between burst shots
        if (i < activeBurstCount) {
          await new Promise((res) => setTimeout(res, activeTimerSeconds > 0 ? 500 : 300));
        }
      }

      // Compose all burst photos into a single Photobooth Grid Card
      const compositeCanvas = composeBurstGrid(capturedFrames);

      // Set target canvas & inject composite grid as base layer in editor
      setTargetCanvas(canvasElement);
      setBaseLayerImage(compositeCanvas);

      // Transfer any active stickers/frames
      await transferPreviewLayersToEditor();

      setTimeout(() => {
        countdownOverlay.classList.remove('active');
        btnCapture.disabled = false;
        switchTab('editor');
        updateStatus(true, `ถ่ายภาพเรียง ${activeBurstCount} ภาพเป็น Grid รวมเรียบร้อยแล้ว!`);
      }, 400);
    }
  } catch (err) {
    console.error('Capture error:', err);
    showError(`เกิดข้อผิดพลาดในการถ่ายภาพ: ${err.message}`);
    countdownOverlay.classList.remove('active');
    btnCapture.disabled = false;
  }
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
 * Custom Sticker Upload with AI + Smart Color-Key Background Removal
 */
async function handleStickerUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  hideError();
  let finalBlob = file;

  if (chkRemoveBg.checked) {
    try {
      updateProgress(10, 'กำลังประมวลผลระบบตัดพื้นหลัง...');
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

  // Add to local catalog
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
        <button class="btn btn-primary btn-sm btn-edit-photo" data-id="${p.id}">🎨 แก้ไข</button>
        <a class="btn btn-secondary btn-sm" href="${p.dataUrl}" download="snapframe-${p.id}.png">📥 ดาวน์โหลด</a>
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
}

/**
 * Loads a photo dataUrl into canvasEngine as base layer and switches to editor.
 */
async function loadPhotoToEditor(dataUrl) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    setTargetCanvas(canvasElement);
    canvasElement.width = img.width;
    canvasElement.height = img.height;

    // Create offscreen canvas for base layer
    const offscreen = document.createElement('canvas');
    offscreen.width = img.width;
    offscreen.height = img.height;
    offscreen.getContext('2d').drawImage(img, 0, 0);

    // Inject as base layer
    await captureFrame(videoElement, {});
    updateLayer('base-layer', {
      image: offscreen,
      width: img.width,
      height: img.height,
      x: img.width / 2,
      y: img.height / 2
    });

    refreshLayerListUI();
    switchTab('editor');
    updateStatus(true, '📸 โหลดภาพจากคลังเรียบร้อย - แก้ไขเพิ่มเติมได้!');
  } catch (err) {
    showError(`ไม่สามารถโหลดภาพได้: ${err.message}`);
  }
}

// Global Event Listeners
btnStopCamera?.addEventListener('click', handleStopCamera);
btnSwitch?.addEventListener('click', handleSwitchCamera);
btnCapture?.addEventListener('click', handleCapture);
btnRetake?.addEventListener('click', () => switchTab('camera'));

btnExport?.addEventListener('click', () => {
  downloadImage('snapframe-photo.png', 'image/png');
  handleSaveToSessionGallery();
});

btnSaveToGallery?.addEventListener('click', handleSaveToSessionGallery);
