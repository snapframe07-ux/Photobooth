export function renderAppLayout(stickerCount) {
  return `
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
      <button class="nav-btn active" id="tabSetup"><span class="nav-ico">🖼️</span><span class="nav-label">เลือกกรอบ</span></button>
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
          <button type="button" class="btn btn-secondary" id="btnOpenCustomFrameUpload">＋ เพิ่มกรอบเอง</button>
          <dialog id="customFrameUploadDialog" class="app-dialog" aria-labelledby="customFrameUploadTitle">
            <h3 id="customFrameUploadTitle">🖼️ เพิ่มกรอบรูปของคุณเอง</h3>
            <p class="subtitle">รองรับ PNG, WebP และ JPG/JPEG ระบบจะช่วยหาช่องใส่รูปให้อัตโนมัติ (ใช้ได้ในรอบการเปิดเว็บนี้)</p>
            <label for="stripCutoutMode">วิธีเจาะช่องใส่รูป</label>
            <select id="stripCutoutMode"><option value="auto">อัตโนมัติ (แนะนำ)</option><option value="manual">เลือกเจาะเองบนภาพ</option></select>
            <label class="btn btn-primary" for="stripFrameUpload">📂 เลือกไฟล์กรอบรูป</label>
            <input id="stripFrameUpload" type="file" accept="image/png,image/webp,image/jpeg,.jpg,.jpeg" class="hidden-input" />
            <p id="stripUploadStatus" role="status"></p>
            <div class="cutout-actions">
              <button type="button" class="btn btn-secondary" id="btnCloseCustomFrameUpload">ปิด</button>
            </div>
          </dialog>
          <label for="stripOrientation">การเรียงภาพในกรอบ</label>
          <select id="stripOrientation" aria-describedby="stripOrientationHint"><option value="vertical">แนวตั้ง (บนลงล่าง)</option><option value="horizontal">แนวนอน (4 ภาพจัดแบบ 2×2)</option></select>
          <p id="stripOrientationHint">แนวนอนเรียงจากซ้ายไปขวา เมื่อเลือก 4 ภาพจะจัดเป็น 2 แถว แถวละ 2 ภาพ</p>
          <label for="stripShotCount">จำนวนภาพในแถบ</label>
          <select id="stripShotCount"><option value="1">1 ภาพ</option><option value="2">2 ภาพ</option><option value="3">3 ภาพ</option><option value="4" selected>4 ภาพ</option></select>
          <div class="setup-cta-row">
            <button class="btn btn-primary btn-large" id="btnBeginStrip">ใช้กรอบนี้ · ไปถ่ายภาพ →</button>
            <label class="btn btn-secondary btn-large" for="stripPhotoUploader" title="เลือก 1–4 ภาพจากเครื่องเพื่อจัดเป็น Photo Strip ทันที">📁 นำเข้ารูปจากเครื่องมาจัดแถบ</label>
            <input id="stripPhotoUploader" type="file" accept="image/*" multiple class="hidden-input" />
          </div>
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
        <div class="cam-header-title">
          <span id="stripCameraSummary"></span>
          <div class="cam-header-actions">
            <button class="btn btn-secondary btn-sm" id="btnToolSound" type="button" aria-pressed="true" title="เปิด/ปิดเสียงนับถอยหลังและชัตเตอร์">🔊 เสียง</button>
            <button class="btn btn-secondary btn-sm" id="btnToolRingLight" type="button" title="เปิดไฟส่องหน้าจากขอบจอ">💡 ไฟขอบจอ: ปิด</button>
            <button class="btn btn-secondary btn-sm" id="btnToolShutterMode" type="button" title="สลับโหมดถ่ายรัวอัตโนมัติ / กดถ่ายทีละรูป">⚡ ถ่ายรัว</button>
            <select id="burstGapSelect" class="cam-gap-select" aria-label="เวลาพักระหว่างช็อต" title="เวลาพักระหว่างช็อต">
              <option value="1">พัก 1 วิ</option>
              <option value="2">พัก 2 วิ</option>
              <option value="3">พัก 3 วิ</option>
            </select>
            <select id="shootPickSelect" class="cam-gap-select" aria-label="โหมดถ่ายเผื่อเลือก" title="โหมดถ่ายเผื่อเลือก">
              <option value="0">ถ่ายปกติ</option>
              <option value="6">ถ่าย 6 เลือก 4</option>
              <option value="8">ถ่าย 8 เลือก 4</option>
            </select>
            <button class="btn btn-secondary btn-sm" id="btnToolLiveVideo" type="button" aria-pressed="false" title="อัดคลิปสั้นต่อช็อตสำหรับทำวิดีโอ Live Strip">🎬 Live Strip</button>
            <button class="btn btn-secondary btn-sm" id="btnToggleCamUI" type="button" aria-pressed="false">👁️ ซ่อนปุ่ม</button>
            <button class="btn btn-secondary btn-sm" id="btnChangeStripFrame">เปลี่ยนกรอบ</button>
          </div>
        </div>

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
                  <span class="countdown-shot-badge hidden" id="countdownShotBadge"></span>
                  <span class="countdown-number" id="countdownNumber">3</span>
                </div>

                <!-- Screen Flash Overlay -->
                <div class="cam-flash-overlay" id="camFlashOverlay"></div>

                <!-- Zoom Ruler Bar -->
                <div class="zoom-ruler-bar">
                  <span class="zoom-icon">🔍-</span>
                  <div class="zoom-ruler-track">
                    <input type="range" class="zoom-ruler-input" id="zoomSlider" min="1" max="3" step="0.1" value="1">
                  </div>
                  <span class="zoom-icon">🔍+</span>
                </div>
              </div>
              <div class="cam-shot-preview-strip hidden" id="camShotPreviewStrip" aria-live="polite"></div>
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
              <button class="btn-tool-icon" id="btnSwitch" title="สลับกล้องหน้า–หลัง" aria-label="สลับกล้องหน้า–หลัง">
                🔄<span class="tool-label">สลับกล้อง</span>
              </button>
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

              <!-- Mirror Flip Button -->
              <button class="btn-tool-icon active" id="btnToolMirror" title="กลับด้านภาพซ้าย–ขวา" aria-pressed="true">
                🪞
                <span class="tool-label">กลับด้าน</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- View 2: Photo Decorator View -->
    <section class="view-section hidden" id="viewEditor">
      <div class="view-card">
        <div class="editor-history-bar">
          <div class="editor-history-btns">
            <button type="button" class="btn btn-sm btn-secondary" id="btnUndo" disabled title="ย้อนกลับ (Ctrl+Z)">↩️ ย้อนกลับ</button>
            <button type="button" class="btn btn-sm btn-secondary" id="btnRedo" disabled title="ทำซ้ำ (Ctrl+Y)">↪️ ทำซ้ำ</button>
          </div>
          <span class="editor-shortcut-hint">2 นิ้วจีบซูม/หมุนได้ · กด Delete ลบชั้นที่เลือก</span>
        </div>

        <div class="canvas-container">
          <canvas id="photoCanvas" width="1280" height="720"></canvas>
        </div>

        <div class="editor-filter-box">
          <h4>🎞️ ฟิลเตอร์ภาพ (เปลี่ยนได้หลังถ่าย)</h4>
          <div class="scroll-gallery" id="editorFilterRow"></div>
        </div>

        <div class="editor-frame-box">
          <h4>🖼️ กรอบรูป (เปลี่ยนได้หลังถ่าย)</h4>
          <div class="scroll-gallery" id="editorFrameRow"></div>
        </div>

        <div class="editor-bg-box" id="editorBgBox">
          <h4>🎨 สีและลายพื้นหลังแถบภาพ</h4>
          <div class="bg-color-row" id="editorBgColorRow"></div>
          <div class="bg-pattern-row" id="editorBgPatternRow"></div>
          <div class="editor-footer-box">
            <label class="footer-text-field">
              <span>✍️ ข้อความท้ายแถบ</span>
              <input type="text" id="stripFooterTextInput" value="SnapFrame" maxlength="48" placeholder="เช่น Bestie Day ♡" />
            </label>
            <select id="stripFooterFontSelect" aria-label="ฟอนต์ข้อความท้ายแถบ">
              <option value="sans-serif">ฟอนต์ทันสมัย (Sans)</option>
              <option value="Georgia, serif">ฟอนต์คลาสสิก (Serif)</option>
              <option value="monospace">ฟอนต์ฟิล์ม (Mono)</option>
              <option value="'IBM Plex Sans Thai', sans-serif">ฟอนต์ไทยน่ารัก</option>
              <option value="cursive">ฟอนต์ลายมือ</option>
            </select>
            <label class="checkbox-label">
              <input type="checkbox" id="chkStripShowDate" />
              <span>📅 ใส่วันที่อัตโนมัติ</span>
            </label>
          </div>
        </div>

        <div class="shot-retake-bar hidden" id="shotRetakeBar">
          <span>🔄 จัดการช็อต (เรียงลำดับ / ถ่ายซ่อม / เปลี่ยนรูป):</span>
          <div class="shot-retake-buttons" id="shotRetakeButtons"></div>
          <input type="file" id="shotReplaceUploader" accept="image/*" class="hidden-input" />
        </div>

        <div class="editor-actions">
          <button class="btn btn-primary btn-large" id="btnExport">💾 ดาวน์โหลดภาพถ่าย</button>
          <button class="btn btn-secondary" id="btnExportStory" type="button">📱 ส่งออก IG Story (9:16)</button>
          <button class="btn btn-secondary" id="btnPrintPhoto" type="button">🖨️ พิมพ์รูปภาพ</button>
          <button class="btn btn-primary" id="btnSharePhoto">📤 แชร์ภาพไปโซเชียล</button>
          <button class="btn btn-secondary" id="btnCopyPhoto">📋 คัดลอกภาพ</button>
          <button class="btn btn-secondary" id="btnExportGif" disabled>🎞️ พรีวิว GIF / Boomerang</button>
          <button class="btn btn-secondary" id="btnExportLiveVideo" disabled type="button">🎬 ดาวน์โหลดวิดีโอ Live Strip</button>
          <dialog id="storyPreviewDialog" class="gif-preview-dialog" aria-labelledby="storyPreviewTitle">
            <h3 id="storyPreviewTitle">📱 พรีวิว IG Story / TikTok (9:16)</h3>
            <div class="gif-options-bar">
              <label>พื้นหลัง:
                <select id="storyBgStyleSelect">
                  <option value="blur">พื้นหลังเบลอจากภาพ</option>
                  <option value="matching">สีเข้าชุดกับกรอบ</option>
                  <option value="dark">โทนมืดสตูดิโอ</option>
                </select>
              </label>
            </div>
            <img id="storyPreviewImage" alt="ตัวอย่าง IG Story 9:16" />
            <div class="cutout-actions">
              <button class="btn btn-secondary" id="btnCloseStoryPreview" type="button">ปิด</button>
              <button class="btn btn-primary" id="btnDownloadStory" type="button">💾 ดาวน์โหลด 9:16</button>
            </div>
          </dialog>
          <dialog id="gifPreviewDialog" class="gif-preview-dialog" aria-labelledby="gifPreviewTitle">
            <h3 id="gifPreviewTitle">🎞️ พรีวิว GIF / Boomerang</h3>
            <div class="gif-options-bar">
              <label>ความเร็ว:
                <select id="gifSpeedSelect">
                  <option value="700">ช้า (0.7 วิ)</option>
                  <option value="450" selected>กลาง (0.45 วิ)</option>
                  <option value="220">เร็ว (0.22 วิ)</option>
                </select>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="chkGifBoomerang" />
                <span>🔁 Boomerang (1→4→1)</span>
              </label>
            </div>
            <img id="gifPreviewImage" alt="ตัวอย่าง GIF จากภาพถ่ายต่อเนื่อง" />
            <p>รวมฟิลเตอร์ กรอบ สติกเกอร์ และเส้นวาดที่ตกแต่งไว้</p>
            <p id="gifPreviewStatus" role="status"></p>
            <div class="cutout-actions">
              <button class="btn btn-secondary" id="btnCloseGifPreview" type="button">ปิด</button>
              <button class="btn btn-primary" id="btnDownloadGif" type="button">💾 ดาวน์โหลด GIF</button>
            </div>
          </dialog>
          <p id="gifStatus" role="status">GIF/Boomerang ใช้ภาพถ่ายต่อเนื่อง 2–4 ภาพ ส่วนวิดีโอ Live Strip เปิดโหมด 🎬 ที่หน้ากล้องก่อนถ่าย</p>
          <p id="sharePhotoStatus" role="status"></p>
          <div class="editor-sub-actions">
            <button class="btn btn-secondary" id="btnSaveTemplate">☁️ บันทึกเทมเพลตบนคลาวด์</button>
            <button class="btn btn-secondary" id="btnSaveToGallery">🖼️ บันทึกเข้าคลังภาพ</button>
            <button class="btn btn-danger" id="btnRetake">📸 ถ่ายใหม่</button>
          </div>
        </div>

        <!-- Scrollable Asset Galleries -->
        <div class="asset-selector-box">
          <div class="asset-tabs">
            <button class="asset-tab-btn active" id="tabStickers">⭐ สติกเกอร์ (<span id="stickerTabCount">${stickerCount}</span>)</button>
            <button class="asset-tab-btn" id="tabText">🔤 ข้อความ</button>
            <button class="asset-tab-btn" id="tabDraw">✏️ วาดเล่น</button>
            <button class="asset-tab-btn" id="tabUpload">📤 อัปโหลด</button>
          </div>

          <!-- แถบความคืบหน้า: ใช้ร่วมกันระหว่างอัปโหลดสติกเกอร์ -->
          <div class="progress-container hidden" id="progressContainer">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="progressBarFill" style="width: 0%"></div>
            </div>
            <span class="progress-text" id="progressText">กำลังประมวลผล...</span>
          </div>

          <div id="stickerPanel" class="sticker-panel">
            <div class="sticker-toolbar">
              <input type="search" id="stickerSearchInput" class="sticker-search-input" placeholder="🔍 ค้นหาสติกเกอร์..." aria-label="ค้นหาสติกเกอร์" />
            </div>
            <div class="sticker-category-bar" id="stickerCategoryBar"></div>
            <div class="scroll-gallery" id="galleryStickers"></div>
          </div>

          <div class="text-tool-box hidden" id="galleryText">
            <div class="text-tool-row">
              <input type="text" id="textLayerInput" class="app-dialog-input" placeholder="พิมพ์ข้อความ เช่น Bestie 2026 ♡" maxlength="60" />
              <button type="button" class="btn btn-primary btn-sm" id="btnAddTextLayer">＋ เพิ่มข้อความ</button>
            </div>
            <div class="text-tool-options">
              <select id="textLayerFont" aria-label="เลือกฟอนต์ข้อความ">
                <option value="'IBM Plex Sans Thai', sans-serif">ฟอนต์ไทย (IBM Plex)</option>
                <option value="'Plus Jakarta Sans', sans-serif">ฟอนต์อังกฤษ (Jakarta)</option>
                <option value="Georgia, serif">คลาสสิก (Serif)</option>
                <option value="monospace">ฟิล์ม (Monospace)</option>
                <option value="cursive">ลายมือ (Handwriting)</option>
              </select>
              <label class="bg-color-picker">
                <span>สีตัวอักษร</span>
                <input type="color" id="textLayerColor" value="#ffffff" />
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="chkTextStroke" checked />
                <span>ขอบ/เงา</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="chkTextBg" />
                <span>ป้ายพื้นหลัง</span>
              </label>
              <label class="bg-color-picker">
                <span>สีป้าย</span>
                <input type="color" id="textLayerBgColor" value="#ec4899" />
              </label>
            </div>
          </div>

          <div class="draw-tool-box hidden" id="galleryDraw">
            <div class="draw-tool-row">
              <button type="button" class="btn btn-primary btn-sm" id="btnToggleDrawMode" aria-pressed="false">✏️ เริ่มวาดบนภาพ</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btnDrawEraser" aria-pressed="false">🧽 ยางลบ</button>
              <button type="button" class="btn btn-danger btn-sm" id="btnClearDoodle">🗑️ ล้างเส้นวาด</button>
            </div>
            <div class="draw-tool-options">
              <div class="bg-color-row" id="drawColorRow"></div>
              <label class="bg-color-picker">
                <span>สีแปรง</span>
                <input type="color" id="drawColorInput" value="#ec4899" />
              </label>
              <label class="draw-size-label">
                <span>ขนาดหัวแปรง: <b id="drawSizeValue">10</b>px</span>
                <input type="range" id="drawSizeSlider" min="3" max="36" value="10" />
              </label>
            </div>
          </div>

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
        <h3>📁 คลังเทมเพลตกรอบรูปและสติกเกอร์</h3>
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
        <h3>🖼️ คลังรูปภาพถ่ายของคุณ</h3>
        <p class="subtitle">ภาพทั้งหมดถูกเก็บไว้บนอุปกรณ์ของคุณอย่างเป็นส่วนตัวนาน 7 วัน (ลบอัตโนมัติเมื่อครบกำหนด)</p>

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
      <h3>☁️ บันทึกตำแหน่งเป็นเทมเพลตบนคลาวด์</h3>
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

        <button type="submit" class="btn btn-primary btn-large">บันทึกเทมเพลต</button>
      </form>
    </div>
  </div>

  <!-- Manual Frame Slot Cutout -->
  <div class="modal-overlay hidden" id="frameCutoutModal">
    <div class="modal-card cutout-card">
      <button class="btn-close" id="btnCloseCutoutModal">✖️</button>
      <h3>✂️ เลือกช่องใส่รูปในกรอบ</h3>
      <p class="subtitle">1) แตะเลือกช่องที่ต้องการด้านล่าง (หรือแตะ 2 มุมบนภาพเพื่อตีกรอบสี่เหลี่ยมเอง) → 2) กด "ใช้กรอบนี้"</p>

      <div class="cutout-stage">
        <canvas id="frameCutoutCanvas"></canvas>
      </div>

      <div id="cutoutCandidates"></div>
      <details class="cutout-advanced">
        <summary>ตั้งค่าเพิ่มเติม (สำหรับกรอบสีทึบ)</summary>
        <label for="cutoutSelectionMode">วิธีเลือกช่องภาพ</label>
        <select id="cutoutSelectionMode">
          <option value="rectangle">แตะสองมุมเพื่อเจาะช่องสี่เหลี่ยม (แนะนำ)</option>
          <option value="color">แตะเพื่อลบพื้นที่สีเดียวกัน (เช่น พื้นสีเขียว)</option>
        </select>

        <label class="cutout-tolerance">
          <span>ความไวในการลบสี: <b id="cutoutToleranceValue">30</b></span>
          <input type="range" id="cutoutTolerance" min="10" max="90" step="5" value="30">
        </label>
      </details>

      <div class="cutout-actions">
        <button class="btn btn-sm btn-secondary" id="btnCutoutReset">↩️ ล้างทั้งหมด</button>
        <button class="btn btn-sm btn-danger" id="btnCutoutCancel">ยกเลิก</button>
        <button class="btn btn-sm btn-primary" id="btnCutoutApply">ใช้กรอบนี้</button>
      </div>
      <p id="cutoutStatus" role="status"></p>
    </div>
  </div>

  <!-- Shoot-to-Pick Dialog (ถ่าย 6-8 เลือก 4) -->
  <dialog id="shotPickerDialog" class="app-dialog shot-picker-dialog" aria-labelledby="shotPickerTitle">
    <h3 id="shotPickerTitle">✨ เลือกรูปที่รอดที่สุดลง Photo Strip</h3>
    <p id="shotPickerCounter" class="subtitle"></p>
    <div id="shotPickerGrid" class="shot-picker-grid"></div>
    <div class="cutout-actions">
      <button type="button" class="btn btn-secondary" id="btnCancelShotPick">ยกเลิก</button>
      <button type="button" class="btn btn-primary" id="btnConfirmShotPick" disabled>ใช้รูปที่เลือก →</button>
    </div>
  </dialog>

  <!-- Toast Notifications -->
  <div id="toastContainer" class="toast-container" aria-live="polite" aria-atomic="true"></div>

  <!-- Reusable Confirm / Prompt Dialog -->
  <dialog id="appFeedbackDialog" class="app-dialog" aria-labelledby="appFeedbackMessage">
    <p id="appFeedbackMessage" class="app-dialog-message"></p>
    <input type="text" id="appFeedbackInput" class="app-dialog-input hidden" />
    <div class="cutout-actions">
      <button type="button" class="btn btn-secondary" id="appFeedbackCancel">ยกเลิก</button>
      <button type="button" class="btn btn-primary" id="appFeedbackConfirm">ตกลง</button>
    </div>
  </dialog>
`;
}
