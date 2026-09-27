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
          <select id="stripCutoutMode"><option value="auto">ตรวจหาอัตโนมัติ แล้วเลือกช่องก่อนเจาะ</option><option value="manual">เจาะช่องเองด้วยการคลิก</option></select>
          <label class="btn btn-secondary" for="stripFrameUpload">＋ เพิ่มกรอบเอง</label>
          <input id="stripFrameUpload" type="file" accept="image/png,image/webp,image/jpeg,.jpg,.jpeg" class="hidden-input" />
          <p id="stripUploadStatus" role="status">รองรับ PNG, WebP และ JPG/JPEG ระบบจะตรวจหาช่องสีเรียบให้เลือกและปรับขอบก่อนเจาะ ตรวจตัวอย่างก่อนถ่าย กรอบใช้ได้ในรอบการเปิดเว็บนี้</p>
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
          <button class="btn btn-primary" id="btnSharePhoto">📤 แชร์ภาพไปโซเชียล</button>
          <button class="btn btn-secondary" id="btnCopyPhoto">📋 คัดลอกภาพ</button>
          <button class="btn btn-secondary" id="btnExportGif" disabled>🎞️ พรีวิว GIF</button>
          <dialog id="gifPreviewDialog" class="gif-preview-dialog" aria-labelledby="gifPreviewTitle">
            <h3 id="gifPreviewTitle">🎞️ พรีวิว GIF</h3>
            <img id="gifPreviewImage" alt="ตัวอย่าง GIF จากภาพถ่ายต่อเนื่อง" />
            <p>เล่นวนภาพละ 0.5 วินาที รวมฟิลเตอร์ตอนถ่าย ไม่รวมกรอบและการแต่งภายหลัง</p>
            <p id="gifPreviewStatus" role="status"></p>
            <div class="cutout-actions">
              <button class="btn btn-secondary" id="btnCloseGifPreview" type="button">ปิด</button>
              <button class="btn btn-primary" id="btnDownloadGif" type="button">💾 ดาวน์โหลด GIF</button>
            </div>
          </dialog>
          <p id="gifStatus" role="status">GIF ใช้ภาพถ่ายต่อเนื่อง 2–4 ภาพ เล่นวนภาพละ 0.5 วินาที รวมฟิลเตอร์ตอนถ่าย ไม่รวมกรอบและการแต่งภายหลัง</p>
          <p id="sharePhotoStatus" role="status"></p>
          <div class="editor-sub-actions">
            <button class="btn btn-secondary" id="btnSaveTemplate">☁️ บันทึกเป็นเทมเพลต Supabase</button>
            <button class="btn btn-secondary" id="btnSaveToGallery">🖼️ บันทึกเข้าคลังภาพเซสชัน</button>
            <button class="btn btn-danger" id="btnRetake">📸 ถ่ายใหม่</button>
          </div>
        </div>

        <!-- Scrollable Asset Galleries -->
        <div class="asset-selector-box">
          <div class="asset-tabs">
            <button class="asset-tab-btn active" id="tabStickers">⭐ สติกเกอร์ (<span id="stickerTabCount">${stickerCount}</span>)</button>
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
      <h3>✂️ เลือกช่องใส่รูป</h3>
      <p class="subtitle">เลือกช่องที่ตรวจพบหรือแตะสองมุมเพื่อเพิ่มช่องสี่เหลี่ยม พื้นตารางคือส่วนที่เจาะเอง ส่วนช่องที่เลือกจากรายการจะเจาะเมื่อกดใช้กรอบนี้</p>

      <div class="cutout-stage">
        <canvas id="frameCutoutCanvas"></canvas>
      </div>

      <div id="cutoutCandidates"></div>
      <label for="cutoutSelectionMode">วิธีเลือกช่องภาพ</label>
      <select id="cutoutSelectionMode">
        <option value="rectangle">แตะสองมุมเพื่อเจาะช่องสี่เหลี่ยม (เหมาะกับกรอบลายรอบขอบ)</option>
        <option value="color">แตะเพื่อลบพื้นที่สีเดียวกัน (เช่น พื้นสีเขียว)</option>
      </select>

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
}
