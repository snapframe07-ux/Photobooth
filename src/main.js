import './style.css';
import { composePhotoStrip, getStripLayout } from './modules/photoStrip.js';
import { serializeCaptureFrame, restoreCaptureFrame } from './modules/templateFrame.js';
import { getFrameLayout } from './modules/frameSlots.js';
import { applyPixelFilter } from './modules/imageFilters.js';

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
  serializeDesignData,
  loadTemplateDesign,
  downloadImage,
  downloadDataUrl,
  exportImage,
  getLayers
} from './modules/canvasEngine.js';

import { removeBackground, cutoutFrameSlots, loadFrameCanvas, floodFillRegion } from './modules/segmenter.js';
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
let lastUploadedFrameBlob = null;
let lastUploadedFrameUrl = null;

// Camera Studio State
let activeFilterIndex = 0;
let activeTimerSeconds = 3;
let activeBrightness = 1.0;
let activeZoom = 1.0;
// true = กล้องไม่รองรับซูมฮาร์ดแวร์ จึงต้องซูมด้วย CSS transform แทน
// ถ้าฮาร์ดแวร์รับงานแล้วยังใส่ CSS อีกจะกลายเป็นซูมซ้อนสองชั้น
let usingCssZoom = true;
let activeEditorFilter = 'none';   // ฟิลเตอร์ที่ใช้กับ base layer ในหน้าตกแต่ง
let activeBurstCount = 4;
let selectedStripFrame = FRAMES_CATALOG[0];
let stripOrientation = 'vertical';
let isCapturing = false;
let hasChosenStrip = false;
let activeCaptureTemplate = null;
let lastCaptureSettings = null;
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
      <button class="nav-btn active" id="tabSetup">🖼️ เลือกกรอบ</button>
      <button class="nav-btn" id="tabCamera"><span class="nav-ico">📷</span><span class="nav-label">ถ่ายภาพ</span></button>
      <button class="nav-btn" id="tabEditor"><span class="nav-ico">🎨</span><span class="nav-label">ตกแต่ง</span></button>
      <button class="nav-btn" id="tabTemplateGallery"><span class="nav-ico">📁</span><span class="nav-label">เทมเพลต</span></button>
      <button class="nav-btn" id="tabGallery"><span class="nav-ico">🖼️</span><span class="nav-label">คลังภาพ (<span id="galleryCount">0</span>)</span></button>
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
    <section class="view-section" id="viewSetup">
      <div class="view-card strip-setup">
        <div class="strip-options">
          <p class="strip-step">1 เลือกกรอบ → 2 ถ่ายภาพ → 3 ดาวน์โหลด</p>
          <h1>เลือกกรอบให้ Photo Strip ของคุณ</h1>
          <p>ถ่ายทีละช็อต แล้วเรียงภาพจากบนลงล่างในกรอบที่เลือก</p>
          <div id="stripFrameChoices" class="strip-frame-choices" aria-label="เลือกกรอบรูป"></div>
          <label for="stripCutoutMode">วิธีเจาะช่องกรอบที่เพิ่มเอง</label>
          <select id="stripCutoutMode"><option value="auto">ตรวจหาและเจาะอัตโนมัติ</option><option value="manual">เจาะช่องเองด้วยการคลิก</option></select>
          <label class="btn btn-secondary" for="stripFrameUpload">＋ เพิ่มกรอบเอง</label>
          <input id="stripFrameUpload" type="file" accept="image/png,image/webp,image/jpeg,.jpg,.jpeg" class="hidden-input" />
          <p id="stripUploadStatus" role="status">รองรับ PNG, WebP และ JPG/JPEG ระบบจะลองเจาะช่องสีเรียบในกรอบที่ไม่มีความโปร่งใสให้ ตรวจตัวอย่างก่อนถ่าย กรอบใช้ได้ในรอบการเปิดเว็บนี้</p>
          <label for="stripOrientation">การเรียงภาพในกรอบ</label>
          <select id="stripOrientation" aria-describedby="stripOrientationHint"><option value="vertical">แนวตั้ง (บนลงล่าง)</option><option value="horizontal">แนวนอน (4 ภาพจัดแบบ 2×2)</option></select>
          <p id="stripOrientationHint">แนวนอนเรียงจากซ้ายไปขวา เมื่อเลือก 4 ภาพจะจัดเป็น 2 แถว แถวละ 2 ภาพ</p>
          <label for="stripShotCount">จำนวนภาพในแถบ</label>
          <select id="stripShotCount"><option value="1">1 ภาพ</option><option value="2">2 ภาพ</option><option value="3">3 ภาพ</option><option value="4" selected>4 ภาพ</option></select>
          <button class="btn btn-primary btn-large" id="btnBeginStrip">ใช้กรอบนี้ · ไปถ่ายภาพ →</button>
        </div>
        <div class="strip-preview-wrap">
          <p id="stripPreviewLabel" aria-live="polite"></p>
          <div id="stripPreview" class="strip-preview" aria-label="ตัวอย่างรูปเรียงแนวตั้ง"></div>
          <small>กรอบเดียวคลุมทั้งแถบ ภาพเรียงจากบนลงล่าง</small>
        </div>
      </div>
    </section>
    <section class="view-section hidden" id="viewCamera">
      <div class="cam-studio-card">
        <div class="cam-header-title"><span id="stripCameraSummary"></span> <button class="btn btn-secondary btn-sm" id="btnChangeStripFrame">เปลี่ยนกรอบ</button></div>

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
                <span class="panel-label">สัดส่วน</span>
                <button class="btn-aspect-opt active" id="btnAspectActive" title="กดเปลี่ยนอัตราส่วนภาพ">4:3</button>
                <button class="btn-arrow-toggle" id="btnAspectArrow" title="กดเปลี่ยนอัตราส่วนภาพ">▼</button>
              </div>

              <!-- Filter Swatches (3 visible at a time) -->
              <div class="filter-group">
                <span class="panel-label">ฟิลเตอร์</span>
                <select id="cameraFilterSelect" aria-label="เลือกฟิลเตอร์"></select>
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
                <video id="webcam" autoplay playsinline muted class="mirror"></video>

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
                <span class="panel-label">ตั้งเวลา</span>
                <button class="btn-timer-opt active" id="btnTimerActive">3s</button>
                <button class="btn-arrow-toggle" id="btnTimerArrow">▼</button>
              </div>

              <!-- Brightness Slider -->
              <div class="brightness-group">
                <span class="panel-label">ความสว่าง</span>
                <span class="brightness-icon">☀️</span>
                <div class="brightness-slider-wrap">
                  <input type="range" class="brightness-input" id="brightnessSlider" aria-label="ความสว่าง" min="0.5" max="1.5" step="0.05" value="1">
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
              <!-- Burst Mode Button -->
              <button class="btn-tool-icon" id="btnToolBurst" title="ถ่ายภาพเรียงต่อกัน">
                🎞️
                <span class="tool-label">ต่อเนื่อง</span>
                <span class="badge-count" id="burstBadge">4x</span>
              </button>

              <!-- Shutter / Capture Button (อยู่ตรงกลางแถบ) -->
              <button class="btn-shutter-rec" id="btnCapture" title="ถ่ายภาพ">
                <div class="shutter-inner-dot"></div>
              </button>

              <!-- Grid Overlay Button -->
              <button class="btn-tool-icon" id="btnToolGrid" title="เปิด/ปิด Grid">
                #
                <span class="tool-label">เส้นกริด</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- View 2: Photo Decorator View -->
    <section class="view-section hidden" id="viewEditor">
      <div class="view-card">
        <div class="canvas-container">
          <canvas id="photoCanvas" width="1280" height="720"></canvas>
        </div>

        <div class="editor-filter-box">
          <h4>🎞️ ฟิลเตอร์ภาพ (เปลี่ยนได้หลังถ่าย)</h4>
          <div class="scroll-gallery" id="editorFilterRow"></div>
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
            <button class="asset-tab-btn active" id="tabStickers">⭐ สติกเกอร์ (<span id="stickerTabCount">${STICKERS_CATALOG.length}</span>)</button>
            <button class="asset-tab-btn" id="tabUpload">📤 อัปโหลด AI</button>
          </div>

          <!-- แถบความคืบหน้า: ใช้ร่วมกันระหว่างอัปโหลดกรอบ (แท็บกรอบรูป) และอัปโหลดสติกเกอร์ (แท็บอัปโหลด)
               ถ้าอยู่ใน #galleryUpload จะถูกซ่อนตอนอยู่แท็บกรอบรูป -->
          <div class="progress-container hidden" id="progressContainer">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="progressBarFill" style="width: 0%"></div>
            </div>
            <span class="progress-text" id="progressText">กำลังประมวลผล...</span>
          </div>

          <div class="scroll-gallery" id="galleryStickers"></div>

          <div class="upload-gallery-box hidden" id="galleryUpload">
            <label class="upload-dropzone">
              <span>📤 อัปโหลดสติกเกอร์ (JPG/PNG)</span>
              <input type="file" id="stickerUploader" accept="image/*" class="hidden-input">
            </label>

            <label class="checkbox-label">
              <input type="checkbox" id="chkRemoveBg" checked>
              <span>ตัดพื้นหลังอัตโนมัติ (MediaPipe AI + Smart Color Key)</span>
            </label>

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

  <!-- Manual Frame Slot Cutout -->
  <div class="modal-overlay hidden" id="frameCutoutModal">
    <div class="modal-card cutout-card">
      <button class="btn-close" id="btnCloseCutoutModal">✖️</button>
      <h3>✂️ เจาะช่องใส่รูปเอง</h3>
      <p class="subtitle">คลิกบนช่องที่ต้องการเจาะให้โปร่งใส คลิกได้หลายช่อง — พื้นตารางคือส่วนที่โปร่งแล้ว</p>

      <div class="cutout-stage">
        <canvas id="frameCutoutCanvas"></canvas>
      </div>

      <label class="cutout-tolerance">
        <span>ความไว: <b id="cutoutToleranceValue">30</b></span>
        <input type="range" id="cutoutTolerance" min="10" max="90" step="5" value="30">
      </label>

      <div class="cutout-actions">
        <button class="btn btn-sm btn-secondary" id="btnCutoutReset">↩️ ล้างทั้งหมด</button>
        <button class="btn btn-sm btn-danger" id="btnCutoutCancel">ยกเลิก</button>
        <button class="btn btn-sm btn-primary" id="btnCutoutApply">ใช้กรอบนี้</button>
      </div>
      <p id="cutoutStatus" role="status"></p>
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
const canvasContainer = document.querySelector('.canvas-container');
const editorFilterRow = document.querySelector('#editorFilterRow');

// ชุด id ของกรอบ/สติกเกอร์ที่ติดมากับแอป (เก็บก่อนมีการเพิ่มของผู้ใช้)
// ใช้ตัดสินว่าชิ้นไหนลบได้
const BUILTIN_FRAME_IDS = new Set(FRAMES_CATALOG.map(f => f.id));
const BUILTIN_STICKER_IDS = new Set(STICKERS_CATALOG.map(s => s.id));
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

const tabFrames = document.querySelector('#tabFrames');
const tabStickers = document.querySelector('#tabStickers');
const tabUpload = document.querySelector('#tabUpload');
const stickerTabCount = document.querySelector('#stickerTabCount');
const frameTabCount = document.querySelector('#frameTabCount');

const framePanel = document.querySelector('#framePanel');
const btnSaveCustomFrame = document.querySelector('#btnSaveCustomFrame');
const frameActions = document.querySelector('#frameActions');
const btnManualCutout = document.querySelector('#btnManualCutout');
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


// Init Canvas Engine
initCanvasEngine(canvasElement);
renderFrameGallery();
renderStickerGallery();
renderEditorFilterRow();

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
  supabaseService.getCurrentUser().then(user => {
    updateUserAuthUI(user);
    loadSavedStickersFromSupabase();
    loadSavedFramesFromSupabase();
  });

  supabaseService.onAuthStateChange((user) => {
    updateUserAuthUI(user);
    loadSavedStickersFromSupabase();
    loadSavedFramesFromSupabase();
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
      ${BUILTIN_STICKER_IDS.has(s.id) ? '' : `<button class="btn-item-del" data-del="${s.id}" title="ลบสติกเกอร์นี้">✖️</button>`}
    </div>
  `).join('');

  galleryStickers.querySelectorAll('.btn-item-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.del;
      const item = STICKERS_CATALOG.find(s => s.id === id);
      if (!confirm(`ลบสติกเกอร์ "${item ? item.name : id}" ออกจากคลัง?`)) return;

      const idx = STICKERS_CATALOG.findIndex(s => s.id === id);
      if (idx >= 0) STICKERS_CATALOG.splice(idx, 1);
      renderStickerGallery();

      if (currentUser && isSupabaseConfigured) {
        try {
          await supabaseService.deleteSticker(id);
        } catch (err) {
          console.warn('ลบสติกเกอร์บน Supabase ไม่สำเร็จ:', err.message);
          showError(`ลบสติกเกอร์ออกจาก Supabase ไม่สำเร็จ: ${err.message}`);
        }
      }
    });
  });

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

/**
 * Render Frame Gallery Carousel
 * ต้อง render ใหม่ทุกครั้งที่ FRAMES_CATALOG เปลี่ยน (เช่น อัปโหลดกรอบใหม่)
 */
function renderFrameGallery() {
  if (!galleryFrames) return;

  galleryFrames.innerHTML = `
    <div class="gallery-item none-item" id="btnRemoveFrame">
      <span class="none-icon">🚫</span>
      <span class="item-name">ไม่ใช้กรอบ</span>
    </div>
    <label class="gallery-item upload-item" title="แนะนำไฟล์ PNG ที่เจาะกลางโปร่งใส ขนาด 1280×720">
      <span class="none-icon">➕</span>
      <span class="item-name">อัปโหลดกรอบ</span>
      <input type="file" id="frameUploader" accept="image/*" class="hidden-input">
    </label>
    ${FRAMES_CATALOG.map(f => `
      <div class="gallery-item frame-item" data-src="${f.src}" data-id="${f.id}">
        <img src="${f.src}" alt="${f.name}" />
        <span class="item-name">${f.name}</span>
        ${BUILTIN_FRAME_IDS.has(f.id) ? '' : `<button class="btn-item-del" data-del="${f.id}" title="ลบกรอบนี้">✖️</button>`}
      </div>
    `).join('')}
  `;

  // ปุ่มลบขึ้นเฉพาะกรอบที่ผู้ใช้อัปโหลดเอง ของที่ติดมากับแอปลบไม่ได้
  galleryFrames.querySelectorAll('.btn-item-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.del;
      const item = FRAMES_CATALOG.find(f => f.id === id);
      if (!confirm(`ลบกรอบ "${item ? item.name : id}" ออกจากคลัง?`)) return;

      const idx = FRAMES_CATALOG.findIndex(f => f.id === id);
      if (idx >= 0) FRAMES_CATALOG.splice(idx, 1);
      renderFrameGallery();

      if (currentUser && isSupabaseConfigured) {
        try {
          await supabaseService.deleteFrame(id);
        } catch (err) {
          console.warn('ลบกรอบบน Supabase ไม่สำเร็จ:', err.message);
          showError(`ลบกรอบออกจาก Supabase ไม่สำเร็จ: ${err.message}`);
        }
      }
    });
  });

  galleryFrames.querySelector('#btnRemoveFrame').addEventListener('click', () => {
    const frameLayer = getLayers().find(l => l.type === 'frame');
    if (frameLayer) {
      removeLayer(frameLayer.id);
    }
    refreshLayerListUI();
  });

  galleryFrames.querySelector('#frameUploader').addEventListener('change', handleFrameUpload);

  galleryFrames.querySelectorAll('.frame-item').forEach(item => {
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

  frameTabCount.textContent = FRAMES_CATALOG.length;
}

/**
 * แถวฟิลเตอร์ในหน้าตกแต่ง — เปลี่ยนฟิลเตอร์หลังถ่ายได้
 * ฟิลเตอร์ถูกเก็บเป็นคุณสมบัติของ base layer แล้วใส่ตอนวาด ไม่ได้อบติดพิกเซล
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
      updateLayer('base-layer', { filter: activeEditorFilter });
      renderEditorFilterRow();
    });
  });
}

async function loadSavedFramesFromSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    const frames = await supabaseService.getFrames();
    if (frames && frames.length > 0) {
      frames.forEach(fr => {
        if (!FRAMES_CATALOG.some(f => f.id === fr.frame_id)) {
          FRAMES_CATALOG.unshift({
            id: fr.frame_id,
            name: fr.name || 'กรอบบันทึก',
            src: fr.image_url
          });
        }
      });
      renderFrameGallery();
    }
  } catch (e) {
    console.warn('Could not load frames from Supabase:', e.message);
  }
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
  if (isCapturing) return;
  if (tabName === 'camera' && !hasChosenStrip) tabName = 'setup';
  if (tabName === 'editor' && !getLayers().some(layer => layer.type === 'base')) {
    showError('เลือกกรอบและถ่ายภาพก่อนดูรูปที่ได้');
    return;
  }
  document.querySelector('#tabSetup').classList.remove('active');
  document.querySelector('#viewSetup').classList.add('hidden');
  if (tabName !== 'camera') handleStopCamera();
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

tabCamera.addEventListener('click', () => switchTab('camera'));
tabEditor.addEventListener('click', () => switchTab('editor'));
tabTemplateGallery.addEventListener('click', () => switchTab('templates'));
tabGallery.addEventListener('click', () => switchTab('gallery'));

tabStickers.addEventListener('click', () => {
  tabStickers.classList.add('active');
  tabUpload.classList.remove('active');
  galleryStickers.classList.remove('hidden');
  galleryUpload.classList.add('hidden');
});

tabUpload.addEventListener('click', () => {
  tabUpload.classList.add('active');
  tabStickers.classList.remove('active');
  galleryUpload.classList.remove('hidden');
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
  const zoomScale = `scale(${usingCssZoom ? activeZoom : 1})`;
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
  updateStripSummary();
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
  document.querySelector('#cameraFilterSelect').value = String(index);
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
const cameraFilterSelect = document.querySelector('#cameraFilterSelect');
cameraFilterSelect.replaceChildren(...FILTERS_CATALOG.map((filter, index) => new Option(filter.name, String(index))));
cameraFilterSelect.value = String(activeFilterIndex);
cameraFilterSelect.addEventListener('change', event => selectFilter(Number(event.target.value)));
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
  // ต้องรู้ผลของซูมฮาร์ดแวร์ก่อน ถึงจะตัดสินใจได้ว่าต้องซูมด้วย CSS ซ้ำหรือไม่
  usingCssZoom = !(await setZoom(activeZoom));
  applyLiveStreamFilters();
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
  document.querySelector('#stripShotCount').value = String(activeBurstCount);
  updateStripSummary();
});

/**
 * Camera Actions (Updated with Realtime Filters, Timer, & Burst Mode)
 */
async function handleStartCamera() {
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
    usingCssZoom = true;
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

/* Frame Catalog Handler ย้ายไปผูกใน renderFrameGallery() แล้ว
   (ของเดิมผูกครั้งเดียวตอนบูต กรอบที่อัปโหลดทีหลังจึงกดไม่ได้) */

/**
 * --- Custom Frame Upload ---
 */

// ค่า alpha ที่ยังถือว่า "ทึบ"
const FRAME_OPAQUE_ALPHA = 250;

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์ภาพไม่ได้')); };
    img.src = url;
  });
}

/**
 * ตรวจพื้นที่กลางภาพ (40% ตรงกลาง) ว่าโปร่งใสพอจะเป็นช่องใส่รูปหรือยัง
 * และคืนสีเฉลี่ยตรงกลางไว้ใช้เป็น targetBgColor ตอนตัดพื้นหลัง
 */
async function inspectFrameCenter(blob) {
  const img = await loadImageFromBlob(blob);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) throw new Error('ภาพไม่มีขนาด');

  const k = Math.min(1, 256 / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k));
  const h = Math.max(1, Math.round(ih * k));

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, w, h);

  const x0 = Math.floor(w * 0.3);
  const y0 = Math.floor(h * 0.3);
  const cw = Math.max(1, Math.ceil(w * 0.7) - x0);
  const ch = Math.max(1, Math.ceil(h * 0.7) - y0);
  const data = cx.getImageData(x0, y0, cw, ch).data;

  let opaque = 0, total = 0, r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) {
    total++;
    if (data[i + 3] >= FRAME_OPAQUE_ALPHA) {
      opaque++;
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
  }

  const ratio = total ? opaque / total : 0;
  return {
    isOpaque: ratio > 0.9,
    color: opaque ? [Math.round(r / opaque), Math.round(g / opaque), Math.round(b / opaque)] : [255, 255, 255]
  };
}

/**
 * --- ตัวเลือกช่องเอง (คลิกชี้ช่องที่จะเจาะ) ---
 * ใช้เมื่อระบบตรวจหาช่องอัตโนมัติไม่เจอ หรือผู้ใช้อยากแก้เอง
 */
let cutoutState = null;

function drawCutoutPreview() {
  if (!cutoutState) return;
  const { w, h, imageData, workCtx, work } = cutoutState;
  workCtx.putImageData(imageData, 0, 0);

  const g = frameCutoutCanvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const c1 = css.getPropertyValue('--surface').trim() || '#ffffff';
  const c2 = css.getPropertyValue('--surface-sunken').trim() || '#eeeeee';

  // พื้นตารางให้เห็นชัดว่าตรงไหนโปร่งแล้ว
  const S = 12;
  for (let y = 0; y < h; y += S) {
    for (let x = 0; x < w; x += S) {
      g.fillStyle = ((x / S + y / S) % 2 === 0) ? c1 : c2;
      g.fillRect(x, y, S, S);
    }
  }
  g.drawImage(work, 0, 0);
}

async function openCutoutPicker(source, requireSlots = false) {
  if (!source) return null;
  const { canvas, ctx, w, h } = await loadFrameCanvas(source);
  const imageData = ctx.getImageData(0, 0, w, h);

  cutoutState = {
    work: canvas,
    workCtx: ctx,
    w,
    h,
    imageData,
    original: new Uint8ClampedArray(imageData.data),
    requireSlots,
    resolve: null
  };

  frameCutoutCanvas.width = w;
  frameCutoutCanvas.height = h;
  document.querySelector('#cutoutStatus').textContent = requireSlots
    ? 'คลิกพื้นที่สีเรียบภายในช่องภาพ 1–4 ช่อง ปรับความไวหากเจาะไม่ครบ หรือล้างทั้งหมดเพื่อเริ่มใหม่' : '';
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

  const idx = y * w + x;
  if (imageData.data[idx * 4 + 3] === 0) return; // ตรงนี้โปร่งอยู่แล้ว

  const base = parseInt(cutoutTolerance.value, 10) || 30;

  // กันรั่ว: ถ้าบริเวณที่ได้ไหลจนแตะขอบภาพและกินพื้นที่มาก แปลว่าหลุดออกนอกช่องไปแล้ว
  // จึงไล่ลด tolerance ลงจนกว่าจะได้บริเวณที่อยู่ในช่องจริง (ตรรกะเดียวกับตัวตรวจอัตโนมัติ)
  let region = floodFillRegion(imageData.data, w, h, idx, base);
  for (const factor of [0.7, 0.5, 0.35, 0.25]) {
    if (!(region.touchesEdge && region.area / (w * h) > 0.3)) break;
    region = floodFillRegion(imageData.data, w, h, idx, base * factor);
  }

  for (const p of region.pixels) imageData.data[p * 4 + 3] = 0;
  drawCutoutPreview();
});

cutoutTolerance?.addEventListener('input', (e) => {
  cutoutToleranceValue.textContent = e.target.value;
});

btnCutoutReset?.addEventListener('click', () => {
  if (!cutoutState) return;
  cutoutState.imageData.data.set(cutoutState.original);
  drawCutoutPreview();
});

btnCutoutCancel?.addEventListener('click', () => closeCutoutPicker(null));
btnCloseCutoutModal?.addEventListener('click', () => closeCutoutPicker(null));

btnCutoutApply?.addEventListener('click', async () => {
  if (!cutoutState) return closeCutoutPicker(null);
  const { work, workCtx, imageData } = cutoutState;
  if (cutoutState.requireSlots) {
    try {
      getFrameLayout(imageData);
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

// เจาะเองกับกรอบที่อัปโหลดล่าสุด
btnManualCutout?.addEventListener('click', async () => {
  if (!lastUploadedFrameBlob) return;
  const blob = await openCutoutPicker(lastUploadedFrameBlob);
  if (!blob) return;

  hideError();
  lastUploadedFrameBlob = blob;
  lastUploadedFrameUrl = URL.createObjectURL(blob);
  await addLayer({
    type: 'frame',
    image: lastUploadedFrameUrl,
    id: `custom-frame-${Date.now()}`
  });
  refreshLayerListUI();
  updateStatus(true, 'อัปเดตกรอบตามช่องที่เลือกแล้ว');
});

async function handleFrameUpload(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;

  hideError();
  let finalBlob = file;

  try {
    const before = await inspectFrameCenter(file);

    if (before.isOpaque) {
      const wantsCutout = confirm(
        'ภาพนี้ทึบทั้งใบ ถ้าใช้เป็นกรอบจะบังรูปถ่ายทั้งหมด\n\n' +
        'ต้องการให้เจาะช่องใส่รูปให้โปร่งใสไหม?'
      );

      if (wantsCutout) {
        let needManual = false;
        try {
          updateProgress(10, 'กำลังตรวจหาช่องใส่รูป...');
          // หว่าน probe ทั่วภาพแล้วคัดเฉพาะบริเวณที่เป็นช่องใส่รูป
          // (ของเดิมหว่าน seed ที่กลางภาพจุดเดียว จึงพังกับกรอบหลายช่อง
          //  เพราะกลางภาพมักตกบนเส้นคั่นระหว่างช่อง แล้วไหลไปกินพื้นหลังกรอบแทน)
          const { blob: processed, removedRatio, slotCount } = await cutoutFrameSlots(file, {
            onProgress: ({ progress, message }) => updateProgress(progress, message)
          });

          if (slotCount === 0) {
            // ต้องเช็ค slotCount ตรง ๆ ไม่ใช่ดูแค่ removedRatio
            // เพราะเคสกรอบหลายช่องเคยได้ ratio ที่ดูปกติแต่ผลผิดสิ้นเชิง
            needManual = true;
          } else if (removedRatio > 0.9) {
            showError('กรอบนี้เจาะแล้วแทบไม่เหลือลายกรอบ จึงใช้ภาพต้นฉบับแทน — ลองกด "✂️ เจาะช่องเอง" เพื่อชี้ช่องที่ต้องการ');
          } else {
            finalBlob = processed;
            updateStatus(true, `เจาะช่องใส่รูปได้ ${slotCount} ช่อง`);
          }
        } finally {
          setTimeout(hideProgress, 1200);
        }

        if (needManual) {
          showError('ตรวจหาช่องใส่รูปอัตโนมัติไม่เจอ — คลิกชี้ช่องที่ต้องการเจาะเองได้เลย');
          const manual = await openCutoutPicker(file);
          if (manual) finalBlob = manual;
        }
      }
    }
  } catch (err) {
    showError(`ไม่สามารถใช้ไฟล์นี้เป็นกรอบได้: ${err.message}`);
    return;
  }

  lastUploadedFrameBlob = finalBlob;
  lastUploadedFrameUrl = URL.createObjectURL(finalBlob);

  await addLayer({
    type: 'frame',
    image: lastUploadedFrameUrl,
    id: `custom-frame-${Date.now()}`
  });

  frameActions.classList.remove('hidden');
  refreshLayerListUI();
}

/**
 * Save Custom Frame to Gallery Catalog (and Supabase Storage)
 */
btnSaveCustomFrame?.addEventListener('click', async () => {
  if (!lastUploadedFrameUrl) return;

  const frameName = prompt('ตั้งชื่อกรอบรูปที่ต้องการบันทึก:', 'กรอบส่วนตัว') || 'กรอบส่วนตัว';
  let finalUrl = lastUploadedFrameUrl;
  let frameId = `custom-${Date.now()}`;

  if (currentUser && isSupabaseConfigured && lastUploadedFrameBlob) {
    try {
      const frameRecord = await supabaseService.uploadFrame(lastUploadedFrameBlob, frameName);
      if (frameRecord && frameRecord.image_url) {
        finalUrl = frameRecord.image_url;
        frameId = frameRecord.frame_id || frameId;
      }
    } catch (err) {
      console.warn('Could not upload frame to Supabase:', err.message);
      showError(`บันทึกขึ้น Supabase ไม่สำเร็จ: ${err.message} (ยังใช้กรอบนี้ได้ในเซสชันนี้)`);
    }
  }

  FRAMES_CATALOG.unshift({ id: frameId, name: frameName, src: finalUrl });
  renderFrameGallery();

  alert(`🎉 บันทึกกรอบ "${frameName}" เรียบร้อยแล้ว! เลือกใช้ได้จากแถบ 🖼️ กรอบรูป`);
  frameActions.classList.add('hidden');
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
  if (lastCaptureSettings) designData.capture = { ...lastCaptureSettings };

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

      card.querySelector('.btn-load-tpl').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        hideError();
        try {
          const design = typeof t.design_data === 'string' ? JSON.parse(t.design_data) : structuredClone(t.design_data);
          let count = design?.capture?.count;
          if (!Number.isInteger(count) || count < 1 || count > 4) {
            const answer = prompt('เทมเพลตเก่านี้ยังไม่ระบุจำนวนภาพ ต้องการใช้กี่ภาพ (1–4)? ระบบจะล็อคจำนวนนี้ขณะใช้เทมเพลต บันทึกเทมเพลตใหม่เพื่อจำจำนวนไว้', '4');
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

  // ลบภาพในคลังเซสชัน (appUI.removeSessionPhoto มีอยู่แล้วแต่ไม่เคยถูกเรียก)
  document.querySelectorAll('.btn-del-photo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const photoId = e.currentTarget.dataset.id;
      if (!confirm('ลบภาพนี้ออกจากคลังเซสชัน?')) return;
      appUI.removeSessionPhoto(photoId);
      renderSessionGallery();
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

    // Create offscreen canvas for base layer
    const offscreen = document.createElement('canvas');
    offscreen.width = img.width;
    offscreen.height = img.height;
    offscreen.getContext('2d').drawImage(img, 0, 0);

    // setBaseLayerImage ปรับขนาด canvas ให้ตรงกับภาพให้เอง
    // (ของเดิมเรียก captureFrame() ซึ่งไปตั้งขนาด canvas เป็นขนาดวิดีโอ ไม่ใช่ขนาดภาพ)
    setBaseLayerImage(offscreen);
    activeEditorFilter = 'none';
    renderEditorFilterRow();

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
btnRetake?.addEventListener('click', () => {
  // ล้างสติกเกอร์ของช็อตที่แล้ว แต่คงกรอบไว้ (กรอบมักเป็นธีมของงานที่ใช้ซ้ำทุกช็อต)
  // ของเดิมแค่สลับแท็บ สติกเกอร์เก่าจึงค้างติดไปกับภาพใหม่
  getLayers()
    .filter(l => l.type === 'sticker')
    .forEach(l => removeLayer(l.id));
  refreshLayerListUI();
  switchTab('camera');
});

btnExport?.addEventListener('click', async () => {
  try {
    await downloadImage('snapframe-photo.png', 'image/png');
    handleSaveToSessionGallery();
  } catch (error) {
    showError(`บันทึกรูปไม่สำเร็จ: ${error.message}`);
  }
});

btnSaveToGallery?.addEventListener('click', handleSaveToSessionGallery);

function updateStripSummary() {
  const layout = selectedStripFrame?.layout;
  if (activeCaptureTemplate) activeBurstCount = activeCaptureTemplate.capture.count;
  btnToolBurst.disabled = !!activeCaptureTemplate || !!layout;
  btnToolBurst.title = activeCaptureTemplate ? 'จำนวนภาพถูกล็อคตามเทมเพลต' : 'ถ่ายภาพเรียงต่อกัน';
  burstBadge.textContent = `${activeBurstCount}x`;
  document.querySelector('#stripCameraSummary').textContent = `${activeCaptureTemplate ? `เทมเพลต ${activeCaptureTemplate.name}` : selectedStripFrame?.name || 'ไม่ใช้กรอบ'} · ${activeBurstCount} ภาพ${getStripDirectionLabel()}`;
  btnAspectActive.disabled = !!layout;
  btnAspectArrow.disabled = !!layout;
  btnAspectActive.textContent = layout ? 'ตามกรอบ' : currentAspectRatio;
  previewBox.style.aspectRatio = layout
    ? `${layout.slots[0].width} / ${layout.slots[0].height}` : currentAspectRatio.replace(':', ' / ');
}

function renderStripSetup() {
  const layout = selectedStripFrame?.layout;
  const orientationSelect = document.querySelector('#stripOrientation');
  orientationSelect.value = stripOrientation;
  orientationSelect.disabled = !!layout || !!activeCaptureTemplate;
  document.querySelector('#stripOrientationHint').textContent = layout
    ? 'กรอบนี้จัดภาพตามช่องที่กำหนดไว้ เลือกกรอบสำเร็จรูปเพื่อเปลี่ยนแนวการเรียงภาพ'
    : 'แนวนอนเรียงจากซ้ายไปขวา เมื่อเลือก 4 ภาพจะจัดเป็น 2 แถว แถวละ 2 ภาพ';
  if (layout) activeBurstCount = layout.slots.length;
  if (activeCaptureTemplate) activeBurstCount = activeCaptureTemplate.capture.count;
  const countSelect = document.querySelector('#stripShotCount');
  countSelect.value = String(activeBurstCount);
  countSelect.disabled = !!layout || !!activeCaptureTemplate;
  countSelect.title = activeCaptureTemplate ? 'จำนวนภาพถูกล็อคตามเทมเพลต' : layout ? 'จำนวนภาพตรงกับช่องที่ตรวจพบในกรอบ' : 'เลือกจำนวนภาพ';
  btnToolBurst.disabled = !!layout || !!activeCaptureTemplate;
  burstBadge.textContent = `${activeBurstCount}x`;
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
    overlay.src = selectedStripFrame.src;
    overlay.alt = 'กรอบเดียวคลุมทั้งแถบ';
    preview.append(overlay);
  }
}

async function handleCapture() {
  if (isCapturing) return;
  if (!videoElement.videoWidth || videoElement.readyState < 2) {
    showError('กล้องยังไม่พร้อม กรุณาอนุญาตการใช้กล้องและรอภาพปรากฏก่อนถ่าย');
    return;
  }
  hideError();
  isCapturing = true;
  const controls = [...document.querySelectorAll('.nav-tabs button, #viewCamera button, #viewCamera input, #viewCamera select')];
  const disabledStates = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  const count = activeCaptureTemplate?.capture.count || activeBurstCount;
  const frameLayout = selectedStripFrame?.layout || null;
  const aspect = currentAspectRatio.split(':').map(Number);
  const filterCss = FILTERS_CATALOG[activeFilterIndex].css;
  const filterOptions = {
    filter: `${filterCss === 'none' ? '' : filterCss} brightness(${activeBrightness})`.trim(),
    crop: getCaptureCrop()
  };
  let completed = false;
  try {
    const decoration = await loadStripDecoration();
    const savedFrame = serializeCaptureFrame(selectedStripFrame, decoration,
      frameLayout || getStripLayout(count, 960, aspect[0] / aspect[1], stripOrientation));
    const frames = [];
    for (let i = 1; i <= count; i++) {
      if (frameLayout) {
        const slot = frameLayout.slots[i - 1];
        previewBox.style.aspectRatio = `${slot.width} / ${slot.height}`;
        filterOptions.crop = getCaptureCrop(slot.width / slot.height);
      }
      countdownOverlay.classList.add('active');
      updateStatus(true, `กำลังถ่ายภาพ ${i}/${count}`);
      await new Promise(resolve => startCountdown(activeTimerSeconds, remaining => {
        countdownNumber.textContent = remaining > 0 ? `${remaining}s (📸 ${i}/${count})` : `📸 ${i}/${count}`;
      }, resolve));
      frames.push(captureSingleFrame(filterOptions));
      if (i < count) await new Promise(resolve => setTimeout(resolve, activeTimerSeconds > 0 ? 500 : 300));
    }
    const strip = composePhotoStrip(frames, decoration, aspect[0] / aspect[1], frameLayout, stripOrientation);
    setTargetCanvas(canvasElement);
    getLayers().filter(layer => layer.type !== 'base').forEach(layer => removeLayer(layer.id));
    setBaseLayerImage(strip);
    if (activeCaptureTemplate) await loadTemplateDesign(activeCaptureTemplate.design);
    lastCaptureSettings = { count, orientation: stripOrientation, aspect: currentAspectRatio, frame: savedFrame };
    activeEditorFilter = 'none';
    renderEditorFilterRow();
    completed = true;
  } catch (err) {
    showError(`เกิดข้อผิดพลาดในการถ่ายภาพ: ${err.message}`);
  } finally {
    countdownOverlay.classList.remove('active');
    isCapturing = false;
    controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
  }
  if (completed) {
    switchTab('editor');
    updateStatus(true, `เรียบร้อย! ${count} ภาพ${getStripDirectionLabel()} พร้อมดาวน์โหลด`);
  }
}

function loadStripDecoration(frame = selectedStripFrame) {
  if (!frame) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('โหลดกรอบไม่สำเร็จ กรุณาเลือกกรอบใหม่แล้วลองอีกครั้ง'));
    img.src = frame.src;
  });
}

document.querySelector('#tabSetup').addEventListener('click', () => switchTab('setup'));
document.querySelector('#btnChangeStripFrame').addEventListener('click', () => switchTab('setup'));
document.querySelector('#btnBeginStrip').addEventListener('click', () => {
  hasChosenStrip = true;
  switchTab('camera');
});
document.querySelector('#stripOrientation').addEventListener('change', event => {
  stripOrientation = event.target.value;
  renderStripSetup();
});

document.querySelector('#stripShotCount').addEventListener('change', event => {
  if (activeCaptureTemplate || selectedStripFrame?.layout) { renderStripSetup(); return; }
  activeBurstCount = Number(event.target.value);
  burstBadge.textContent = `${activeBurstCount}x`;
  renderStripSetup();
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
    const manual = document.querySelector('#stripCutoutMode').value === 'manual';
    let source = file;
    if (manual) {
      status.textContent = 'เลือกช่องภาพที่ต้องการเจาะในกรอบ';
      source = await openCutoutPicker(file, true);
      if (!source) {
        status.textContent = 'ยกเลิกการเพิ่มกรอบแล้ว';
        return;
      }
    }
    status.textContent = 'กำลังตรวจสอบกรอบ…';
    url = URL.createObjectURL(source);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปนี้ได้'));
      img.src = url;
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
    if (!transparent && !manual) {
      status.textContent = 'กำลังเจาะช่องใส่รูปอัตโนมัติ…';
      // Allow the progress message to paint before processing the image.
      await new Promise(resolve => setTimeout(resolve, 0));
      const result = await cutoutFrameSlots(file, {
        onProgress: progress => { status.textContent = progress.message; }
      });
      let processed = result.blob;
      if (!result.slotCount || !result.removedRatio || result.blob.type !== 'image/png') {
        status.textContent = 'ไม่พบช่องอัตโนมัติ กรุณาคลิกเจาะช่องเอง';
        processed = await openCutoutPicker(file, true);
        if (!processed) {
          status.textContent = 'ยกเลิกการเพิ่มกรอบแล้ว';
          return;
        }
      }
      URL.revokeObjectURL(url);
      url = URL.createObjectURL(processed);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('ไม่สามารถอ่านกรอบหลังเจาะช่องได้'));
        img.src = url;
      });
      ctx.clearRect(0, 0, check.width, check.height);
      ctx.drawImage(img, 0, 0, check.width, check.height);
    }
    const layout = getFrameLayout(ctx.getImageData(0, 0, check.width, check.height));
    const frame = { id: `strip-${crypto.randomUUID()}`, name: file.name.replace(/\.[^.]+$/, ''), src: url, stripUpload: true, layout };
    FRAMES_CATALOG.unshift(frame);
    activeCaptureTemplate = null;
    selectedStripFrame = frame;
    url = null; // Keep the object URL alive while this session uses the frame.
    renderStripSetup();
    status.textContent = `พบ ${layout.slots.length} ช่อง ระบบจะถ่ายและครอปรูปให้พอดีแต่ละช่อง ตรวจตัวอย่างก่อนถ่าย กรอบนี้ใช้ได้จนกว่าจะรีเฟรชหน้าเว็บ`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    if (url) URL.revokeObjectURL(url);
    input.disabled = false;
    input.value = '';
  }
});
