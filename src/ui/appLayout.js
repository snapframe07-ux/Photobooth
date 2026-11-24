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
    <nav class="nav-tabs" aria-label="แถบนำทางหลัก">
      <div class="nav-group nav-steps">
        <button class="nav-btn active" id="tabSetup"><span class="nav-step-num">1</span><span class="nav-label">เลือกกรอบ</span></button>
        <button class="nav-btn" id="tabCamera"><span class="nav-step-num">2</span><span class="nav-label">ถ่ายภาพ</span></button>
        <button class="nav-btn" id="tabEditor" disabled title="ถ่ายหรือนำเข้าภาพก่อนเพื่อเข้าหน้าตกแต่ง"><span class="nav-step-num">3</span><span class="nav-label">ตกแต่ง</span></button>
      </div>
      <span class="nav-divider" aria-hidden="true"></span>
      <div class="nav-group nav-library">
        <button class="nav-btn" id="tabTemplateGallery"><span class="nav-ico">📁</span><span class="nav-label">เทมเพลต</span></button>
        <button class="nav-btn" id="tabGallery"><span class="nav-ico">🖼️</span><span class="nav-label">คลัง (<span id="galleryCount">0</span>)</span></button>
      </div>
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

    <!-- View 1: Step 1 — Frame & Strip Setup -->
    <section class="view-section" id="viewSetup">
      <div class="view-card strip-setup">
        <div class="strip-options">
          <p class="strip-step">ขั้นตอนที่ 1 จาก 3 · เลือกกรอบและจำนวนภาพ</p>
          <h1>เลือกกรอบให้ Photo Strip ของคุณ</h1>
          <div id="stripFrameChoices" class="strip-frame-choices" aria-label="เลือกกรอบรูป"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="btnOpenCustomFrameUpload">＋ เพิ่มกรอบเอง</button>

          <dialog id="customFrameUploadDialog" class="app-dialog" aria-labelledby="customFrameUploadTitle">
            <h3 id="customFrameUploadTitle">🖼️ เพิ่มกรอบรูปของคุณเอง</h3>
            <p class="subtitle">เลือกไฟล์รูปกรอบ (PNG, WebP หรือ JPG) ระบบจะเจาะช่องใส่รูปให้อัตโนมัติ พร้อมให้ตรวจสอบก่อนใช้งาน</p>
            <label class="btn btn-primary btn-large" for="stripFrameUpload">📂 เลือกไฟล์กรอบรูป</label>
            <input id="stripFrameUpload" type="file" accept="image/png,image/webp,image/jpeg,.jpg,.jpeg" class="hidden-input" />
            <p id="stripUploadStatus" role="status"></p>
            <div class="cutout-actions">
              <button type="button" class="btn btn-secondary" id="btnCloseCustomFrameUpload">ปิด</button>
            </div>
          </dialog>

          <div class="setup-option-group">
            <span class="setup-option-label">การเรียงภาพ</span>
            <div class="setup-chip-row" id="stripOrientationChips" role="group" aria-label="การเรียงภาพในกรอบ">
              <button type="button" class="setup-chip selected" data-orientation="vertical" aria-pressed="true">แนวตั้ง (บนลงล่าง)</button>
              <button type="button" class="setup-chip" data-orientation="horizontal" aria-pressed="false">แนวนอน (4 ภาพแบบ 2×2)</button>
            </div>
            <p id="stripOrientationHint" class="setup-option-hint">แนวนอนเรียงจากซ้ายไปขวา เมื่อเลือก 4 ภาพจะจัดเป็น 2 แถว แถวละ 2 ภาพ</p>
          </div>

          <div class="setup-option-group">
            <span class="setup-option-label">จำนวนภาพในแถบ</span>
            <div class="setup-chip-row" id="stripShotCountChips" role="group" aria-label="จำนวนภาพในแถบ">
              <button type="button" class="setup-chip" data-count="1" aria-pressed="false">1 ภาพ</button>
              <button type="button" class="setup-chip" data-count="2" aria-pressed="false">2 ภาพ</button>
              <button type="button" class="setup-chip" data-count="3" aria-pressed="false">3 ภาพ</button>
              <button type="button" class="setup-chip selected" data-count="4" aria-pressed="true">4 ภาพ</button>
            </div>
          </div>

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

    <!-- View 2: Step 2 — Clean Photobooth Camera -->
    <section class="view-section hidden" id="viewCamera">
      <div class="cam-studio-card">
        <div class="cam-header-title">
          <div class="cam-summary-wrap">
            <span id="stripCameraSummary"></span>
            <span id="camActiveModesBadge" class="cam-modes-badge hidden"></span>
          </div>
          <div class="cam-header-actions">
            <button class="btn btn-secondary btn-sm" id="btnChangeStripFrame" type="button">🖼️ เปลี่ยนกรอบ</button>
          </div>
        </div>

        <div class="cam-studio-wrapper">
          <div class="cam-stage">
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
            </div>

            <div class="cam-shot-preview-strip hidden" id="camShotPreviewStrip" aria-live="polite"></div>

            <!-- Horizontal Live Filter Strip -->
            <div class="cam-filter-strip-wrap">
              <div class="scroll-gallery cam-filter-strip" id="camFilterStrip" aria-label="เลือกฟิลเตอร์กล้อง"></div>
            </div>
          </div>

          <!-- Bottom 5-Button Camera Bar -->
          <div class="cam-bottom-filmstrip">
            <div class="cam-toolbar">
              <button class="btn-tool-icon" id="btnSwitch" type="button" title="สลับกล้องหน้า–หลัง" aria-label="สลับกล้องหน้า–หลัง">
                🔄<span class="tool-label">สลับกล้อง</span>
              </button>

              <button class="btn-tool-icon active" id="btnTimerActive" type="button" title="กดเปลี่ยนเวลานับถอยหลัง">
                ⏱️<span class="tool-label" id="timerBadgeLabel">3 วิ</span>
              </button>

              <!-- Shutter / Capture Button -->
              <button class="btn-shutter-rec" id="btnCapture" type="button" title="ถ่ายภาพ" aria-label="ถ่ายภาพ">
                <div class="shutter-inner-dot"></div>
              </button>

              <button class="btn-tool-icon" id="btnToolRingLight" type="button" title="เปิดไฟส่องหน้าจากขอบจอ">
                💡<span class="tool-label" id="ringLightLabel">ไฟ: ปิด</span>
              </button>

              <button class="btn-tool-icon" id="btnOpenCamSettings" type="button" title="ตั้งค่าการถ่ายภาพเพิ่มเติม">
                ⚙️<span class="tool-label">ตั้งค่า</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Camera Settings Dialog -->
      <dialog id="camSettingsDialog" class="app-dialog cam-settings-dialog" aria-labelledby="camSettingsTitle">
        <h3 id="camSettingsTitle">⚙️ ตั้งค่าการถ่ายภาพ</h3>

        <div class="settings-section">
          <p class="settings-section-title">โหมดการถ่าย</p>
          <div class="settings-row">
            <span>วิธีลั่นชัตเตอร์</span>
            <div class="settings-inline">
              <button class="btn btn-secondary btn-sm" id="btnToolShutterMode" type="button">⚡ ถ่ายรัวอัตโนมัติ</button>
              <select id="burstGapSelect" class="cam-gap-select" aria-label="เวลาพักระหว่างช็อต">
                <option value="1">พัก 1 วิ</option>
                <option value="2">พัก 2 วิ</option>
                <option value="3">พัก 3 วิ</option>
              </select>
            </div>
          </div>
          <div class="settings-row">
            <span>ถ่ายเผื่อเลือก</span>
            <select id="shootPickSelect" class="cam-gap-select" aria-label="โหมดถ่ายเผื่อเลือก">
              <option value="0">ถ่ายปกติ</option>
              <option value="6">ถ่าย 6 เลือก 4</option>
              <option value="8">ถ่าย 8 เลือก 4</option>
            </select>
          </div>
          <div class="settings-row">
            <span>Live Strip (คลิปสั้น ~2 วิ/ช็อต)</span>
            <button class="btn btn-secondary btn-sm" id="btnToolLiveVideo" type="button" aria-pressed="false">🎬 ปิดอยู่</button>
          </div>
          <div class="settings-row">
            <span>จำนวนภาพ</span>
            <button class="btn btn-secondary btn-sm" id="btnToolBurst" type="button">🎞️ <span id="burstBadge">4x</span></button>
          </div>
        </div>

        <div class="settings-section">
          <p class="settings-section-title">ภาพและกล้อง</p>
          <div class="settings-row">
            <span>สัดส่วนภาพ</span>
            <button class="btn btn-secondary btn-sm" id="btnAspectActive" type="button">4:3</button>
          </div>
          <label class="settings-slider-row">
            <span>☀️ ความสว่าง: <b id="brightnessValueLabel">100%</b></span>
            <input type="range" id="brightnessSlider" aria-label="ความสว่าง" min="0.5" max="1.5" step="0.05" value="1">
          </label>
          <label class="settings-slider-row">
            <span>🔍 ซูม: <b id="zoomValueLabel">1.0x</b></span>
            <input type="range" id="zoomSlider" aria-label="ซูมกล้อง" min="1" max="3" step="0.1" value="1">
          </label>
          <div class="settings-toggles">
            <button class="btn btn-secondary btn-sm active" id="btnToolSound" type="button" aria-pressed="true">🔊 เสียง</button>
            <button class="btn btn-secondary btn-sm" id="btnToolGrid" type="button" aria-pressed="false"># เส้นกริด</button>
            <button class="btn btn-secondary btn-sm active" id="btnToolMirror" type="button" aria-pressed="true">🪞 กลับด้าน</button>
          </div>
        </div>

        <div class="cutout-actions">
          <button type="button" class="btn btn-primary" id="btnCloseCamSettings">เสร็จสิ้น</button>
        </div>
      </dialog>
    </section>

    <!-- View 3: Step 3 — Focused Photo Editor -->
    <section class="view-section hidden" id="viewEditor">
      <div class="view-card editor-card">
        <div class="editor-top-bar">
          <div class="editor-history-btns">
            <button type="button" class="btn btn-sm btn-secondary" id="btnUndo" disabled title="ย้อนกลับ (Ctrl+Z)" aria-label="ย้อนกลับ">↩️ ย้อนกลับ</button>
            <button type="button" class="btn btn-sm btn-secondary" id="btnRedo" disabled title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำ">↪️ ทำซ้ำ</button>
          </div>
          <div class="editor-primary-actions">
            <button class="btn btn-sm btn-danger" id="btnRetake" type="button">📸 ถ่ายใหม่</button>
            <button class="btn btn-sm btn-primary" id="btnOpenExportDialog" type="button">💾 บันทึก / ส่งออก</button>
          </div>
        </div>

        <div class="canvas-container">
          <canvas id="photoCanvas" width="1280" height="720"></canvas>
        </div>

        <!-- Unified 8-Tab Editor Tool Dock -->
        <div class="asset-selector-box editor-tool-dock">
          <div class="editor-tool-tabs" role="tablist" aria-label="เครื่องมือตกแต่งภาพ">
            <button type="button" class="editor-tool-tab active" data-tool="filter" id="toolTabFilter" role="tab" aria-selected="true">🎞️ ฟิลเตอร์</button>
            <button type="button" class="editor-tool-tab" data-tool="frame" id="toolTabFrame" role="tab" aria-selected="false">🖼️ กรอบ</button>
            <button type="button" class="editor-tool-tab" data-tool="bg" id="toolTabBg" role="tab" aria-selected="false">🎨 พื้นหลัง</button>
            <button type="button" class="editor-tool-tab" data-tool="stickers" id="toolTabStickers" role="tab" aria-selected="false">⭐ สติกเกอร์ (<span id="stickerTabCount">${stickerCount}</span>)</button>
            <button type="button" class="editor-tool-tab" data-tool="text" id="toolTabText" role="tab" aria-selected="false">🔤 ข้อความ</button>
            <button type="button" class="editor-tool-tab" data-tool="draw" id="toolTabDraw" role="tab" aria-selected="false">✏️ วาดเล่น</button>
            <button type="button" class="editor-tool-tab hidden" data-tool="shots" id="toolTabShots" role="tab" aria-selected="false">🔄 ช็อต</button>
            <button type="button" class="editor-tool-tab" data-tool="layers" id="toolTabLayers" role="tab" aria-selected="false">📑 เลเยอร์ (<span id="layerTabCount">0</span>)</button>
          </div>

          <!-- Panel: Filter -->
          <div class="editor-tool-panel" id="panelFilter" data-panel="filter">
            <div class="scroll-gallery" id="editorFilterRow"></div>
          </div>

          <!-- Panel: Frame -->
          <div class="editor-tool-panel hidden" id="panelFrame" data-panel="frame">
            <div class="scroll-gallery" id="editorFrameRow"></div>
          </div>

          <!-- Panel: Strip Background & Footer -->
          <div class="editor-tool-panel hidden" id="panelBg" data-panel="bg">
            <div class="editor-bg-box" id="editorBgBox">
              <div class="bg-color-row" id="editorBgColorRow"></div>
              <div class="bg-pattern-row" id="editorBgPatternRow"></div>
              <div class="editor-footer-box">
                <label class="footer-text-field">
                  <span>✍️ ข้อความท้ายแถบ</span>
                  <input type="text" id="stripFooterTextInput" value="SnapFrame" maxlength="48" placeholder="เช่น Bestie Day ♡" />
                </label>
                <select id="stripFooterFontSelect" aria-label="ฟอนต์ข้อความท้ายแถบ">
                  <option value="'IBM Plex Sans Thai', sans-serif">ทันสมัย (IBM Plex)</option>
                  <option value="'Sriracha', cursive">ลายมือน่ารัก (Sriracha)</option>
                  <option value="'Charmonman', cursive">ตัวเขียนพู่กัน (Charmonman)</option>
                  <option value="'Noto Serif Thai', Georgia, serif">คลาสสิกมีหัว (Serif)</option>
                  <option value="'Chakra Petch', monospace">ดิจิทัล / ฟิล์ม (Chakra)</option>
                </select>
                <label class="checkbox-label">
                  <input type="checkbox" id="chkStripShowDate" />
                  <span>📅 ใส่วันที่</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Panel: Stickers + Upload Sticker -->
          <div class="editor-tool-panel hidden" id="panelStickers" data-panel="stickers">
            <div id="stickerPanel" class="sticker-panel">
              <div class="sticker-upload-bar">
                <label class="btn btn-sm btn-secondary sticker-upload-btn">
                  <span>📤 อัปโหลดสติกเกอร์</span>
                  <input type="file" id="stickerUploader" accept="image/*" class="hidden-input">
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" id="chkRemoveBg" checked>
                  <span>ตัดพื้นหลังสติกเกอร์</span>
                </label>
                <button class="btn btn-sm btn-primary hidden" id="btnSaveCustomSticker" type="button">💾 บันทึกไว้ใช้ซ้ำ</button>
              </div>

              <div class="progress-container hidden" id="progressContainer">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" id="progressBarFill" style="width: 0%"></div>
                </div>
                <span class="progress-text" id="progressText">กำลังประมวลผล...</span>
              </div>

              <div class="sticker-toolbar">
                <input type="search" id="stickerSearchInput" class="sticker-search-input" placeholder="🔍 ค้นหาสติกเกอร์..." aria-label="ค้นหาสติกเกอร์" />
              </div>
              <div class="sticker-category-bar" id="stickerCategoryBar"></div>
              <div class="scroll-gallery" id="galleryStickers"></div>
            </div>
          </div>

          <!-- Panel: Text Layer -->
          <div class="editor-tool-panel hidden" id="panelText" data-panel="text">
            <div class="text-tool-box" id="galleryText">
              <div class="text-tool-row">
                <input type="text" id="textLayerInput" class="app-dialog-input" placeholder="พิมพ์ข้อความ เช่น Bestie 2026 ♡" maxlength="60" />
                <button type="button" class="btn btn-primary btn-sm" id="btnAddTextLayer">＋ เพิ่มข้อความ</button>
              </div>
              <div class="text-tool-options">
                <select id="textLayerFont" aria-label="เลือกฟอนต์ข้อความ">
                  <option value="'IBM Plex Sans Thai', sans-serif">ทันสมัย (IBM Plex)</option>
                  <option value="'Sriracha', cursive">ลายมือน่ารัก (Sriracha)</option>
                  <option value="'Charmonman', cursive">ตัวเขียนพู่กัน (Charmonman)</option>
                  <option value="'Noto Serif Thai', Georgia, serif">คลาสสิกมีหัว (Serif)</option>
                  <option value="'Chakra Petch', monospace">ดิจิทัล / ฟิล์ม (Chakra)</option>
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
          </div>

          <!-- Panel: Doodle Brush -->
          <div class="editor-tool-panel hidden" id="panelDraw" data-panel="draw">
            <div class="draw-tool-box" id="galleryDraw">
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
                  <span>ขนาด: <b id="drawSizeValue">10</b>px</span>
                  <input type="range" id="drawSizeSlider" min="3" max="36" value="10" />
                </label>
              </div>
            </div>
          </div>

          <!-- Panel: Shot Reorder / Retake / Replace -->
          <div class="editor-tool-panel hidden" id="panelShots" data-panel="shots">
            <div class="shot-retake-bar" id="shotRetakeBar">
              <p class="subtitle">สลับลำดับ (◀ ▶), ถ่ายซ่อม (📷) หรือเปลี่ยนรูปจากเครื่อง (📁)</p>
              <div class="shot-retake-buttons" id="shotRetakeButtons"></div>
              <input type="file" id="shotReplaceUploader" accept="image/*" class="hidden-input" />
            </div>
          </div>

          <!-- Panel: Layers -->
          <div class="editor-tool-panel hidden" id="panelLayers" data-panel="layers">
            <p class="editor-shortcut-hint">ลากบนภาพเพื่อย้าย · 2 นิ้วจีบซูม/หมุนได้ · กด Delete ลบชั้นที่เลือก</p>
            <div id="layerList" class="layer-list"></div>
          </div>
        </div>

        <!-- Unified Export & Save Dialog -->
        <dialog id="exportDialog" class="app-dialog export-dialog" aria-labelledby="exportDialogTitle">
          <h3 id="exportDialogTitle">💾 บันทึก / ส่งออกผลงาน</h3>

          <div class="export-group">
            <p class="settings-section-title">บันทึก / แชร์ภาพนิ่ง</p>
            <div class="export-grid">
              <button class="btn btn-primary btn-large export-full" id="btnExport" type="button">💾 ดาวน์โหลดภาพ (PNG)</button>
              <button class="btn btn-secondary" id="btnExportStory" type="button">📱 IG Story (9:16)</button>
              <button class="btn btn-primary" id="btnSharePhoto" type="button">📤 แชร์ภาพ</button>
              <button class="btn btn-secondary" id="btnCopyPhoto" type="button">📋 คัดลอกภาพ</button>
              <button class="btn btn-secondary" id="btnPrintPhoto" type="button">🖨️ พิมพ์รูปภาพ</button>
            </div>
          </div>

          <div class="export-group">
            <p class="settings-section-title">ภาพเคลื่อนไหว & คลัง</p>
            <div class="export-grid">
              <button class="btn btn-secondary" id="btnExportGif" disabled type="button">🎞️ GIF / Boomerang</button>
              <button class="btn btn-secondary hidden" id="btnExportLiveVideo" disabled type="button">🎬 วิดีโอ Live Strip</button>
              <button class="btn btn-secondary" id="btnSaveToGallery" type="button">🖼️ บันทึกเข้าคลัง</button>
              <button class="btn btn-secondary" id="btnSaveTemplate" type="button">☁️ บันทึกเทมเพลต</button>
            </div>
          </div>

          <p id="gifStatus" class="subtitle" role="status"></p>
          <p id="sharePhotoStatus" class="subtitle" role="status"></p>

          <div class="cutout-actions">
            <button type="button" class="btn btn-secondary" id="btnCloseExportDialog">ปิด</button>
          </div>
        </dialog>

        <!-- Preview Dialogs -->
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

        <dialog id="liveVideoPreviewDialog" class="gif-preview-dialog" aria-labelledby="liveVideoPreviewTitle">
          <h3 id="liveVideoPreviewTitle">🎬 พรีวิววิดีโอ Live Strip</h3>
          <video id="liveVideoPreviewPlayer" controls loop playsinline autoplay muted></video>
          <p>รวมฟิลเตอร์ กรอบ สติกเกอร์ และเส้นวาดที่ตกแต่งไว้</p>
          <p id="liveVideoPreviewStatus" role="status"></p>
          <div class="cutout-actions">
            <button class="btn btn-secondary" id="btnCloseLiveVideoPreview" type="button">ปิด</button>
            <button class="btn btn-primary" id="btnDownloadLiveVideo" type="button" disabled>💾 ดาวน์โหลดวิดีโอ</button>
          </div>
        </dialog>
      </div>
    </section>

    <!-- View 4: Template Gallery -->
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

    <!-- View 5: Session Photo Gallery -->
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
      <h3>✂️ ตรวจสอบช่องใส่รูปในกรอบ</h3>
      <p class="subtitle">พื้นที่ตารางหมากรุกคือช่องที่จะใส่รูปถ่าย แตะที่ช่องว่างในภาพเพื่อเจาะเพิ่ม หรือกด "ใช้กรอบนี้" ได้เลย</p>

      <div class="cutout-stage">
        <canvas id="frameCutoutCanvas"></canvas>
      </div>

      <div id="cutoutCandidates"></div>
      <details class="cutout-advanced">
        <summary>ปรับแต่งเพิ่มเติม (ถ้าช่องไม่ตรง)</summary>
        <label for="cutoutSelectionMode">วิธีแตะบนภาพ</label>
        <select id="cutoutSelectionMode">
          <option value="color" selected>แตะ 1 ครั้งเพื่อเจาะช่องตามรูปทรง (แนะนำ)</option>
          <option value="rectangle">แตะ 2 มุมเพื่อตีกรอบสี่เหลี่ยมเอง</option>
        </select>

        <label class="cutout-tolerance">
          <span>ความไวในการเจาะสี: <b id="cutoutToleranceValue">35</b></span>
          <input type="range" id="cutoutTolerance" min="10" max="90" step="5" value="35">
        </label>
      </details>

      <div class="cutout-actions">
        <button class="btn btn-sm btn-secondary" id="btnCutoutReset">↩️ เริ่มใหม่</button>
        <button class="btn btn-sm btn-danger" id="btnCutoutCancel">ยกเลิก</button>
        <button class="btn btn-sm btn-primary" id="btnCutoutApply">✅ ใช้กรอบนี้</button>
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
