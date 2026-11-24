import { serializeLayerSource } from './templateAssets.js';
/**
 * Canvas Engine Module (SnapFrame)
 * Interactive Layered Image Composition Engine:
 * - 3-Layer Stacking System (Base -> Stickers -> Frame)
 * - Interactive Drag-to-move, Rotate Handle, Scroll/Pinch-to-scale
 * - Template Design JSON Serialization & Deserialization
 */

import { filteredSource } from './imageFilters.js';

let targetCanvas = null;
let ctx = null;
let layers = [];
let selectedLayerId = null;
let isRenderScheduled = false;

// Interaction State
let activeAction = null; // 'drag' | 'rotate' | 'scale' | 'pinch' | 'draw' | null
let dragStart = { x: 0, y: 0 };
let layerInitialState = null;
let onSelectionChangeCallback = null;
let onCanvasResizeCallback = null;
let onHistoryChangeCallback = null;

// Multi-touch Pinch-to-Zoom & Rotate State
const activePointers = new Map();
let pinchState = null;

// Doodle (Brush Pen) State
let doodleCanvas = null;
let doodleCtx = null;
let hasDoodleContent = false;
const drawState = {
  active: false,
  color: '#ec4899',
  size: 10,
  eraser: false,
  lastPoint: null
};

// Undo / Redo History State
const MAX_HISTORY = 30;
let undoStack = [];
let redoStack = [];
let pendingUndoSnapshot = false;
let cachedDoodleSnapshot = null;

function ensureDoodleCanvas(w, h) {
  if (!doodleCanvas) {
    doodleCanvas = document.createElement('canvas');
    doodleCanvas.width = w;
    doodleCanvas.height = h;
    doodleCtx = doodleCanvas.getContext('2d');
    return;
  }
  if (doodleCanvas.width === w && doodleCanvas.height === h) return;
  const prev = document.createElement('canvas');
  prev.width = doodleCanvas.width;
  prev.height = doodleCanvas.height;
  prev.getContext('2d').drawImage(doodleCanvas, 0, 0);
  doodleCanvas.width = w;
  doodleCanvas.height = h;
  doodleCtx = doodleCanvas.getContext('2d');
  if (hasDoodleContent) {
    doodleCtx.drawImage(prev, 0, 0, w, h);
    cachedDoodleSnapshot = null;
  }
}

function cloneDoodleSnapshot() {
  if (!doodleCanvas || !hasDoodleContent) return null;
  const snap = document.createElement('canvas');
  snap.width = doodleCanvas.width;
  snap.height = doodleCanvas.height;
  snap.getContext('2d').drawImage(doodleCanvas, 0, 0);
  return snap;
}

function captureSnapshot() {
  if (hasDoodleContent && !cachedDoodleSnapshot) {
    cachedDoodleSnapshot = cloneDoodleSnapshot();
  }
  return {
    layers: layers.filter(l => l.type !== 'base').map(l => ({ ...l })),
    doodle: hasDoodleContent ? cachedDoodleSnapshot : null,
    hasDoodleContent
  };
}

function restoreSnapshot(snap) {
  const baseLayers = layers.filter(l => l.type === 'base');
  layers = [...baseLayers, ...snap.layers.map(l => ({ ...l }))];
  if (selectedLayerId && !layers.some(l => l.id === selectedLayerId)) {
    selectedLayerId = null;
  }
  if (targetCanvas) {
    ensureDoodleCanvas(targetCanvas.width, targetCanvas.height);
    doodleCtx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
    if (snap.doodle) {
      doodleCtx.drawImage(snap.doodle, 0, 0, doodleCanvas.width, doodleCanvas.height);
    }
    hasDoodleContent = Boolean(snap.hasDoodleContent && snap.doodle);
    cachedDoodleSnapshot = hasDoodleContent ? snap.doodle : null;
  }
  if (typeof onSelectionChangeCallback === 'function') onSelectionChangeCallback(selectedLayerId);
  notifyHistoryChange();
  scheduleRender();
}

function notifyHistoryChange() {
  if (typeof onHistoryChangeCallback === 'function') {
    onHistoryChangeCallback({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  }
}

function pushUndoSnapshot() {
  undoStack.push(captureSnapshot());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  notifyHistoryChange();
}

export function setOnHistoryChange(callback) {
  onHistoryChangeCallback = callback;
  notifyHistoryChange();
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}

export function undo() {
  if (!undoStack.length) return false;
  redoStack.push(captureSnapshot());
  const prev = undoStack.pop();
  restoreSnapshot(prev);
  return true;
}

export function redo() {
  if (!redoStack.length) return false;
  undoStack.push(captureSnapshot());
  const next = redoStack.pop();
  restoreSnapshot(next);
  return true;
}

export function resetHistory() {
  undoStack = [];
  redoStack = [];
  notifyHistoryChange();
}

export function setDrawMode(active, options = {}) {
  drawState.active = Boolean(active);
  if (options.color !== undefined) drawState.color = options.color;
  if (options.size !== undefined) drawState.size = Math.max(2, Math.min(48, Number(options.size) || 10));
  if (options.eraser !== undefined) drawState.eraser = Boolean(options.eraser);
  if (drawState.active) {
    selectLayer(null);
  }
  if (targetCanvas) {
    targetCanvas.style.cursor = drawState.active ? 'crosshair' : '';
  }
}

export function isDrawMode() {
  return drawState.active;
}

export function clearDoodle({ recordHistory = true } = {}) {
  if (!doodleCanvas || !doodleCtx || !hasDoodleContent) return;
  if (recordHistory) pushUndoSnapshot();
  doodleCtx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
  hasDoodleContent = false;
  cachedDoodleSnapshot = null;
  scheduleRender();
}

export function getDoodleCanvas() {
  return hasDoodleContent ? doodleCanvas : null;
}

/**
 * ตั้งขนาด canvas แล้วแจ้งผู้เรียก (ใช้ปรับกล่องแสดงผลให้ยืดตามภาพจริง)
 */
function resizeCanvas(width, height) {
  if (!targetCanvas) return;
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  ensureDoodleCanvas(w, h);
  if (targetCanvas.width === w && targetCanvas.height === h) return;

  targetCanvas.width = w;
  targetCanvas.height = h;
  if (typeof onCanvasResizeCallback === 'function') onCanvasResizeCallback(w, h);
}

/**
 * ปรับ base layer ให้ "คลุมเต็ม" canvas โดยคงสัดส่วนรูปเดิม (แบบ object-fit: cover)
 * ส่วนที่ล้นออกนอก canvas จะถูกตัดเองตอนวาด
 */
function refitBaseLayer() {
  if (!targetCanvas) return;
  const base = layers.find(l => l.type === 'base');
  if (!base || !base.image) return;

  const iw = base.image.naturalWidth || base.image.width;
  const ih = base.image.naturalHeight || base.image.height;
  if (!iw || !ih) return;

  const scale = Math.max(targetCanvas.width / iw, targetCanvas.height / ih);
  base.width = iw * scale;
  base.height = ih * scale;
  base.x = targetCanvas.width / 2;
  base.y = targetCanvas.height / 2;
  base.scale = 1;
}

/**
 * เรียกทุกครั้งที่ขนาด canvas เปลี่ยน
 */
export function setOnCanvasResize(callback) {
  onCanvasResizeCallback = callback;
}

// Handle sizes
const HANDLE_SIZE = 9; // รัศมีขั้นต่ำของจุดจับ (หน่วยพิกเซลของ canvas)
const ROTATE_HANDLE_OFFSET = 22; // ระยะขั้นต่ำของจุดหมุนเหนือขอบบน

// จุดจับต้องมีขนาดคงที่ "บนจอจริง" ไม่ใช่บนพิกัด canvas — canvas กว้าง 1280
// แต่แสดงจริงราว 700-900px จุดจับเดิมจึงเหลือรัศมีแค่ ~7px กดไม่ติด
const HANDLE_RADIUS_CSS = 10;
const ROTATE_OFFSET_CSS = 26;
let displayScale = 1; // canvas px ต่อ CSS px

function refreshDisplayScale() {
  if (!targetCanvas) return;
  const rect = targetCanvas.getBoundingClientRect();
  displayScale = rect.width > 0 ? targetCanvas.width / rect.width : 1;
}

const getHandleRadius = () => Math.max(HANDLE_SIZE, HANDLE_RADIUS_CSS * displayScale);
const getRotateOffset = () => Math.max(ROTATE_HANDLE_OFFSET, ROTATE_OFFSET_CSS * displayScale);

// Alpha hit test
// กรอบรูปมีขนาดเต็ม canvas ถ้าเช็คแค่สี่เหลี่ยมจะกินทุกคลิกจนจับสติกเกอร์ไม่ได้
// จึงเช็คความโปร่งใสของพิกเซลจริง (ช่วยเรื่องสติกเกอร์ซ้อนกันด้วย)
const ALPHA_HIT_THRESHOLD = 10; // ค่า alpha (0-255) ที่ถือว่า "มีเนื้อภาพ"
const HIT_MASK_MAX_SIDE = 256;  // ด้านยาวสุดของมาสก์ (ย่อส่วนเพื่อประหยัดหน่วยความจำ)

// สีของ UI ที่วาดลง canvas — CSS จับไม่ได้ จึงอ่านค่าจาก design token ครั้งเดียวตอน init
// (renderSelectionOverlay อยู่ใน render loop ห้ามเรียก getComputedStyle ทุกเฟรม)
const THEME = {
  box: '#5B2FAE',
  rotate: '#5B2FAE',
  scale: '#B02455',
  remove: '#A81932',
  onHandle: '#FFFFFF',
  handleShadow: 'rgba(43, 34, 51, 0.35)',
};

function loadThemeColors() {
  if (typeof window === 'undefined') return;
  const css = getComputedStyle(document.documentElement);
  const pick = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  THEME.box = pick('--lav-ink', THEME.box);
  THEME.rotate = pick('--lav-ink', THEME.rotate);
  THEME.scale = pick('--pink-ink', THEME.scale);
  THEME.remove = pick('--danger-ink', THEME.remove);
  THEME.onHandle = pick('--text-on-accent', THEME.onHandle);
  THEME.handleShadow = pick('--scrim', THEME.handleShadow);
}

/**
 * Initializes the Canvas Engine with a target HTML5 <canvas> element.
 * @param {HTMLCanvasElement} canvasElement 
 * @param {Object} [options={}]
 * @returns {HTMLCanvasElement}
 */
export function initCanvasEngine(canvasElement, options = {}) {
  if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
    throw new Error('กรุณาระบุ <canvas> element ที่ถูกต้องสำหรับ Canvas Engine');
  }

  targetCanvas = canvasElement;
  ctx = targetCanvas.getContext('2d');

  loadThemeColors();

  if (options.width) targetCanvas.width = options.width;
  if (options.height) targetCanvas.height = options.height;

  layers = [];
  selectedLayerId = null;

  setupPointerEvents();
  renderCanvas();
  return targetCanvas;
}

/**
 * Dynamically switches active target canvas (e.g., between camera preview overlay and main editor canvas).
 * @param {HTMLCanvasElement} canvasElement
 */
export function setTargetCanvas(canvasElement) {
  if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) return;
  
  // Remove pointer event listeners from previous canvas if needed
  if (targetCanvas) {
    targetCanvas.removeEventListener('pointerdown', handlePointerDown);
    targetCanvas.removeEventListener('pointermove', handlePointerMove);
    targetCanvas.removeEventListener('pointerup', handlePointerUp);
    targetCanvas.removeEventListener('pointercancel', handlePointerUp);
    targetCanvas.removeEventListener('wheel', handleWheel);
  }

  targetCanvas = canvasElement;
  ctx = targetCanvas.getContext('2d');

  loadThemeColors();
  
  setupPointerEvents();
  scheduleRender();
}

/**
 * Sets a callback function when layer selection changes.
 * @param {function(string|null): void} callback 
 */
export function setOnSelectionChange(callback) {
  onSelectionChangeCallback = callback;
}

/**
 * Helper to load an image from URL or existing Image element.
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement || src instanceof ImageBitmap) {
      if (src instanceof HTMLImageElement && !src.complete) {
        src.onload = () => resolve(src);
        src.onerror = (err) => reject(err);
      } else {
        resolve(src);
      }
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`ไม่สามารถโหลดรูปภาพจาก URL: ${src}`));
    img.src = src;
  });
}

/**
 * Directly sets an HTMLCanvasElement or HTMLImageElement as the Base Layer (Layer 1).
 * Used for Photobooth Composite Grids and loading photos into Editor.
 * @param {HTMLCanvasElement|HTMLImageElement} imageOrCanvas
 */
export function setBaseLayerImage(imageOrCanvas) {
  if (!imageOrCanvas) return null;

  const width = imageOrCanvas.width || (targetCanvas ? targetCanvas.width : 1280);
  const height = imageOrCanvas.height || (targetCanvas ? targetCanvas.height : 720);

  resizeCanvas(width, height);

  const baseLayer = {
    id: 'base-layer',
    type: 'base',
    src: null,
    image: imageOrCanvas,
    x: width / 2,
    y: height / 2,
    width: width,
    height: height,
    rotation: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    mirror: false
  };

  const baseIndex = layers.findIndex(l => l.type === 'base');
  if (baseIndex >= 0) {
    layers[baseIndex] = baseLayer;
  } else {
    layers.unshift(baseLayer);
  }

  scheduleRender();
  return baseLayer;
}

/**
 * Adds a new layer (Sticker or Frame).
 */
export async function addLayer(layerData) {
  if (!layerData.type || !['base', 'sticker', 'frame'].includes(layerData.type)) {
    throw new Error('ประเภทของ Layer ต้องเป็น "base", "sticker", หรือ "frame"');
  }

  const imageSrc = layerData.image || layerData.src || layerData.url;
  const loadedImg = await loadImage(imageSrc);

  // รูปที่ถ่ายเป็นตัวกำหนดสัดส่วนงาน กรอบจะถูกยืดให้เต็ม canvas ตามไปเอง
  // (layer ชนิด frame ใช้ width/height เท่าขนาด canvas ด้านล่างนี้)
  const canvasWidth = targetCanvas ? targetCanvas.width : 1280;
  const canvasHeight = targetCanvas ? targetCanvas.height : 720;

  const defaultWidth = layerData.type === 'frame' ? canvasWidth : (loadedImg.width || 150);
  const defaultHeight = layerData.type === 'frame' ? canvasHeight : (loadedImg.height || 150);

  const layer = {
    id: layerData.id || `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    label: layerData.label || null,
    type: layerData.type,
    src: typeof imageSrc === 'string' ? imageSrc : (loadedImg.src || null),
    image: loadedImg,
    x: layerData.x !== undefined ? layerData.x : canvasWidth / 2,
    y: layerData.y !== undefined ? layerData.y : canvasHeight / 2,
    width: layerData.width || defaultWidth,
    height: layerData.height || defaultHeight,
    rotation: layerData.rotation || 0,
    scale: layerData.scale || 1,
    scaleX: layerData.scaleX || 1,
    scaleY: layerData.scaleY || 1,
    opacity: layerData.opacity !== undefined ? layerData.opacity : 1,
    zIndex: layerData.zIndex || 0
  };

  if (layer.type !== 'base') pushUndoSnapshot();

  if (layer.type === 'frame') {
    const frameIndex = layers.findIndex(l => l.type === 'frame');
    if (frameIndex >= 0) {
      layers[frameIndex] = layer;
    } else {
      layers.push(layer);
    }
  } else {
    layers.push(layer);
  }

  selectLayer(layer.id);
  scheduleRender();
  return layer;
}

/**
 * Removes a layer by ID.
 */
export function removeLayer(id, { recordHistory = true } = {}) {
  const target = layers.find(l => l.id === id);
  if (!target) return;
  if (recordHistory && target.type !== 'base') pushUndoSnapshot();
  const prevLength = layers.length;
  layers = layers.filter(l => l.id !== id);
  if (selectedLayerId === id) {
    selectLayer(null);
  }
  if (layers.length !== prevLength) {
    scheduleRender();
  }
}

/**
 * Updates a layer's properties.
 */
export function updateLayer(id, changes = {}) {
  const layer = layers.find(l => l.id === id);
  if (layer) {
    Object.assign(layer, changes);
    scheduleRender();
  }
  return layer || null;
}

/**
 * Selects a layer by ID.
 */
export function selectLayer(id) {
  selectedLayerId = id;
  if (typeof onSelectionChangeCallback === 'function') {
    onSelectionChangeCallback(id);
  }
  scheduleRender();
}

/**
 * Returns current selected layer ID.
 */
export function getSelectedLayerId() {
  return selectedLayerId;
}

/**
 * Renders all layers in exact stacking order + Selection Overlay & Handles.
 */
export function renderCanvas() {
  if (!targetCanvas || !ctx) return;

  refreshDisplayScale();
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  const baseLayers = layers.filter(l => l.type === 'base');
  const stickerLayers = layers.filter(l => l.type === 'sticker').sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const frameLayers = layers.filter(l => l.type === 'frame');

  const orderedLayers = [...baseLayers, ...stickerLayers, ...frameLayers];
  let doodleDrawn = false;

  orderedLayers.forEach(layer => {
    if (!layer.image) return;

    // Draw doodle strokes above stickers and below frames
    if (!doodleDrawn && layer.type === 'frame' && doodleCanvas && hasDoodleContent) {
      ctx.drawImage(doodleCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
      doodleDrawn = true;
    }

    ctx.save();
    ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
    ctx.translate(layer.x, layer.y);

    if (layer.rotation) {
      ctx.rotate((layer.rotation * Math.PI) / 180);
    }

    const finalScaleX = (layer.scaleX || 1) * (layer.scale || 1);
    const finalScaleY = (layer.scaleY || 1) * (layer.scale || 1);

    if (layer.mirror) {
      ctx.scale(-finalScaleX, finalScaleY);
    } else {
      ctx.scale(finalScaleX, finalScaleY);
    }

    // ฟิลเตอร์เก็บเป็นคุณสมบัติของ layer แทนการอบติดพิกเซลตอนถ่าย จะได้เปลี่ยนทีหลังได้
    let source = layer.image;
    if (layer.filter && layer.filter !== 'none') {
      if ('filter' in ctx) ctx.filter = layer.filter;
      else source = filteredSource(layer.image, layer.filter);
    }

    const drawW = layer.width;
    const drawH = layer.height;
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // Draw Selection Bounding Box & Handles for selected layer (sticker or frame)
    if (layer.id === selectedLayerId && layer.type !== 'base') {
      renderSelectionOverlay(layer);
    }
  });

  if (!doodleDrawn && doodleCanvas && hasDoodleContent) {
    ctx.drawImage(doodleCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
  }
}

/**
 * Renders bounding box and control handles (Rotate, Scale, Delete) for selected layer.
 */
function renderSelectionOverlay(layer) {
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);

  const scale = layer.scale || 1;
  const w = layer.width * scale;
  const h = layer.height * scale;

  const halfW = w / 2;
  const halfH = h / 2;
  const rotateOffset = getRotateOffset();

  // Bounding Box
  ctx.strokeStyle = THEME.box;
  ctx.lineWidth = 2 * displayScale;
  ctx.setLineDash([6 * displayScale, 4 * displayScale]);
  ctx.strokeRect(-halfW, -halfH, w, h);
  ctx.setLineDash([]);

  // Connection Line to Rotate Handle
  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(0, -halfH - rotateOffset);
  ctx.strokeStyle = THEME.box;
  ctx.stroke();

  // 1. Rotate Handle (Top)
  drawHandleCircle(0, -halfH - rotateOffset, THEME.rotate, '🔄');

  // 2. Scale Handle (Bottom-Right)
  drawHandleCircle(halfW, halfH, THEME.scale, '↘️');

  // 3. Delete Handle (Top-Left)
  drawHandleCircle(-halfW, -halfH, THEME.remove, '✖️');

  ctx.restore();
}

function drawHandleCircle(x, y, color, symbol) {
  const r = getHandleRadius();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = THEME.handleShadow;
  ctx.shadowBlur = 6 * displayScale;
  ctx.fill();
  ctx.strokeStyle = THEME.onHandle;
  ctx.lineWidth = 2 * displayScale;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = THEME.onHandle;
  ctx.font = Math.round(r * 1.05) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, x, y);
}

/**
 * Pointer Event Handlers for Drag, Rotate, Scale, and Selection.
 */
function setupPointerEvents() {
  if (!targetCanvas) return;

  targetCanvas.style.touchAction = 'none';

  targetCanvas.addEventListener('pointerdown', handlePointerDown);
  targetCanvas.addEventListener('pointermove', handlePointerMove);
  targetCanvas.addEventListener('pointerup', handlePointerUp);
  targetCanvas.addEventListener('pointercancel', handlePointerUp);
  targetCanvas.addEventListener('wheel', handleWheel, { passive: false });
}

function getCanvasCoordinates(e) {
  const rect = targetCanvas.getBoundingClientRect();
  const scaleX = targetCanvas.width / rect.width;
  const scaleY = targetCanvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function drawDoodleSegment(from, to) {
  if (!targetCanvas) return;
  ensureDoodleCanvas(targetCanvas.width, targetCanvas.height);
  doodleCtx.save();
  doodleCtx.lineCap = 'round';
  doodleCtx.lineJoin = 'round';
  doodleCtx.lineWidth = drawState.size * Math.max(1, targetCanvas.width / 960);
  if (drawState.eraser) {
    doodleCtx.globalCompositeOperation = 'destination-out';
    doodleCtx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    doodleCtx.globalCompositeOperation = 'source-over';
    doodleCtx.strokeStyle = drawState.color;
  }
  doodleCtx.beginPath();
  doodleCtx.moveTo(from.x, from.y);
  doodleCtx.lineTo(to.x, to.y);
  doodleCtx.stroke();
  doodleCtx.restore();
  hasDoodleContent = true;
  cachedDoodleSnapshot = null;
}

function getPinchMetrics() {
  const pts = [...activePointers.values()];
  if (pts.length < 2) return null;
  const [a, b] = pts;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { dist: Math.max(1, dist), angle };
}

function handlePointerDown(e) {
  refreshDisplayScale();
  const coords = getCanvasCoordinates(e);
  activePointers.set(e.pointerId, coords);

  // Freehand Doodle Mode
  if (drawState.active) {
    pushUndoSnapshot();
    activeAction = 'draw';
    drawState.lastPoint = coords;
    drawDoodleSegment(coords, { x: coords.x + 0.1, y: coords.y + 0.1 });
    targetCanvas.setPointerCapture(e.pointerId);
    scheduleRender();
    return;
  }

  // Two-finger Pinch-to-Zoom & Rotate on selected non-base layer
  if (activePointers.size === 2 && selectedLayerId) {
    const selLayer = layers.find(l => l.id === selectedLayerId);
    const metrics = getPinchMetrics();
    if (selLayer && selLayer.type !== 'base' && metrics) {
      if (!activeAction) pendingUndoSnapshot = true;
      activeAction = 'pinch';
      pinchState = {
        initialDist: metrics.dist,
        initialAngle: metrics.angle,
        initialScale: selLayer.scale || 1,
        initialRotation: selLayer.rotation || 0
      };
      targetCanvas.setPointerCapture(e.pointerId);
      return;
    }
  }

  // Check handles of selected layer first
  if (selectedLayerId) {
    const selLayer = layers.find(l => l.id === selectedLayerId);
    if (selLayer && selLayer.type !== 'base') {
      const handleHit = checkHandleHit(coords, selLayer);
      if (handleHit) {
        if (handleHit === 'delete') {
          removeLayer(selLayer.id);
          return;
        }
        pendingUndoSnapshot = true;
        activeAction = handleHit;
        dragStart = coords;
        layerInitialState = { ...selLayer };
        targetCanvas.setPointerCapture(e.pointerId);
        return;
      }
    }
  }

  // Hit test layers from top to bottom
  const baseLayers = layers.filter(l => l.type === 'base');
  const stickerLayers = layers.filter(l => l.type === 'sticker').sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  const frameLayers = layers.filter(l => l.type === 'frame');

  const checkOrder = [...frameLayers, ...stickerLayers, ...baseLayers];

  let hitLayer = null;
  for (const layer of checkOrder) {
    if (layer.type === 'base') continue; // Don't drag base background photo
    if (isPointInsideLayer(coords, layer)) {
      hitLayer = layer;
      break;
    }
  }

  if (hitLayer) {
    selectLayer(hitLayer.id);
    pendingUndoSnapshot = true;
    activeAction = 'drag';
    dragStart = coords;
    layerInitialState = { ...hitLayer };
    targetCanvas.setPointerCapture(e.pointerId);
  } else {
    selectLayer(null);
  }
}

function handlePointerMove(e) {
  const coords = getCanvasCoordinates(e);
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, coords);
  }

  if (activeAction === 'draw' && drawState.lastPoint) {
    drawDoodleSegment(drawState.lastPoint, coords);
    drawState.lastPoint = coords;
    scheduleRender();
    return;
  }

  if (activeAction === 'pinch' && selectedLayerId && pinchState) {
    const layer = layers.find(l => l.id === selectedLayerId);
    const metrics = getPinchMetrics();
    if (layer && metrics) {
      if (pendingUndoSnapshot) {
        pushUndoSnapshot();
        pendingUndoSnapshot = false;
      }
      const scaleFactor = metrics.dist / pinchState.initialDist;
      layer.scale = Math.max(0.2, Math.min(4, Number((pinchState.initialScale * scaleFactor).toFixed(2))));
      const deltaDeg = ((metrics.angle - pinchState.initialAngle) * 180) / Math.PI;
      layer.rotation = Math.round((pinchState.initialRotation + deltaDeg + 360) % 360);
      scheduleRender();
    }
    return;
  }

  if (!activeAction || !selectedLayerId || !layerInitialState) return;

  const layer = layers.find(l => l.id === selectedLayerId);
  if (!layer) return;

  if (activeAction === 'drag') {
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    if (dx === 0 && dy === 0) return;
    if (pendingUndoSnapshot) {
      pushUndoSnapshot();
      pendingUndoSnapshot = false;
    }
    layer.x = layerInitialState.x + dx;
    layer.y = layerInitialState.y + dy;
  } else if (activeAction === 'rotate') {
    if (pendingUndoSnapshot) {
      pushUndoSnapshot();
      pendingUndoSnapshot = false;
    }
    const angleRad = Math.atan2(coords.y - layer.y, coords.x - layer.x);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;
    layer.rotation = Math.round(angleDeg % 360);
  } else if (activeAction === 'scale') {
    if (pendingUndoSnapshot) {
      pushUndoSnapshot();
      pendingUndoSnapshot = false;
    }
    const dist = Math.hypot(coords.x - layer.x, coords.y - layer.y);
    const initialDist = Math.hypot(layer.width / 2, layer.height / 2);
    const newScale = Number((dist / initialDist).toFixed(2));
    layer.scale = Math.max(0.2, Math.min(4, newScale));
  }

  scheduleRender();
}

function handlePointerUp(e) {
  activePointers.delete(e.pointerId);
  if (activeAction === 'pinch' && activePointers.size >= 2) return;
  pendingUndoSnapshot = false;
  if (activeAction) {
    activeAction = null;
    layerInitialState = null;
    pinchState = null;
    drawState.lastPoint = null;
    try {
      targetCanvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }
}

function handleWheel(e) {
  if (!selectedLayerId) return;

  const layer = layers.find(l => l.id === selectedLayerId);
  if (!layer || layer.type === 'base') return;

  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.05 : -0.05;
  layer.scale = Number(Math.max(0.2, Math.min(4, (layer.scale || 1) + delta)).toFixed(2));
  scheduleRender();
}

/**
 * Checks if point is inside layer handles (Rotate, Scale, Delete).
 */
function checkHandleHit(point, layer) {
  const { localX, localY, halfW, halfH } = toLayerLocal(point, layer);

  // ต้องใช้ค่าชุดเดียวกับตอนวาด ไม่งั้นพื้นที่กดจะเพี้ยนจากวงกลมที่เห็น
  const hitR = Math.max(getHandleRadius() + 8 * displayScale, 18 * displayScale);
  const rotateOffset = getRotateOffset();

  // 1. Rotate Handle (0, -halfH - rotateOffset)
  if (Math.hypot(localX - 0, localY - (-halfH - rotateOffset)) <= hitR) {
    return 'rotate';
  }

  // 2. Scale Handle (halfW, halfH)
  if (Math.hypot(localX - halfW, localY - halfH) <= hitR) {
    return 'scale';
  }

  // 3. Delete Handle (-halfW, -halfH)
  if (Math.hypot(localX - (-halfW), localY - (-halfH)) <= hitR) {
    return 'delete';
  }

  return null;
}

/**
 * แปลงจุดบน canvas เข้าสู่ระบบพิกัดภายในของ layer (หมุนกลับแล้ว)
 * @returns {{localX: number, localY: number, halfW: number, halfH: number}}
 */
function toLayerLocal(point, layer) {
  const rad = ((layer.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  const dx = point.x - layer.x;
  const dy = point.y - layer.y;

  const scale = layer.scale || 1;

  return {
    localX: dx * cos - dy * sin,
    localY: dx * sin + dy * cos,
    halfW: (layer.width * scale) / 2,
    halfH: (layer.height * scale) / 2
  };
}

/**
 * สร้าง alpha mask ย่อส่วนของรูปใน layer (ทำครั้งเดียวแล้ว cache ไว้บน layer)
 * มาสก์ขึ้นกับตัวรูปอย่างเดียว ไม่ขึ้นกับ scale/rotation จึงไม่ต้องล้างตอนย่อ/ขยาย/หมุน
 * @returns {{w: number, h: number, mask: Uint8Array}|null} null = อ่านพิกเซลไม่ได้
 */
function getHitMask(layer) {
  if (layer._hitMask !== undefined) return layer._hitMask;

  try {
    const iw = layer.image.naturalWidth || layer.image.width;
    const ih = layer.image.naturalHeight || layer.image.height;
    if (!iw || !ih) {
      layer._hitMask = null;
      return null;
    }

    const k = Math.min(1, HIT_MASK_MAX_SIDE / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * k));
    const h = Math.max(1, Math.round(ih * k));

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(layer.image, 0, 0, w, h);

    const data = cx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3];

    layer._hitMask = { w, h, mask };
  } catch (_) {
    // canvas ปนเปื้อน (รูปข้ามโดเมนที่ไม่มี CORS header) → ถอยไปใช้กรอบสี่เหลี่ยมแบบเดิม
    layer._hitMask = null;
  }

  return layer._hitMask;
}

/**
 * Checks if point is inside transformed layer, ignoring transparent pixels.
 */
function isPointInsideLayer(point, layer) {
  const { localX, localY, halfW, halfH } = toLayerLocal(point, layer);

  if (localX < -halfW || localX > halfW || localY < -halfH || localY > halfH) return false;

  const hm = getHitMask(layer);
  if (!hm) return true;

  const u = Math.min(hm.w - 1, Math.max(0, Math.floor(((localX + halfW) / (halfW * 2)) * hm.w)));
  const v = Math.min(hm.h - 1, Math.max(0, Math.floor(((localY + halfH) / (halfH * 2)) * hm.h)));

  return hm.mask[v * hm.w + u] > ALPHA_HIT_THRESHOLD;
}

/**
 * Serializes the current layer layout state into JSON for Templates.design_data.
 * @returns {Object} JSON Object matching design_data schema
 */
export function serializeDesignData() {
  const canvasWidth = targetCanvas ? targetCanvas.width : 1280;
  const canvasHeight = targetCanvas ? targetCanvas.height : 720;

  const designData = {
    canvas: {
      width: canvasWidth,
      height: canvasHeight
    },
    version: '1.0',
    createdAt: new Date().toISOString(),
    layers: layers.map(layer => ({
      id: layer.id,
      type: layer.type,
      src: serializeLayerSource(layer),
      x: Math.round(layer.x),
      y: Math.round(layer.y),
      width: layer.width,
      height: layer.height,
      scale: Number((layer.scale || 1).toFixed(2)),
      rotation: Number((layer.rotation || 0).toFixed(1)),
      opacity: layer.opacity !== undefined ? layer.opacity : 1,
      zIndex: layer.zIndex || 0
    }))
  };

  return designData;
}

/**
 * Loads a template design_data object (JSON) and renders initial layers automatically.
 * @param {Object|string} templateDesignData 
 */
export async function loadTemplateDesign(templateDesignData) {
  const data = typeof templateDesignData === 'string' ? JSON.parse(templateDesignData) : templateDesignData;

  if (!data || !Array.isArray(data.layers)) {
    throw new Error('โครงสร้าง design_data ไม่ถูกต้อง');
  }

  if (data.canvas && targetCanvas) {
    resizeCanvas(data.canvas.width || 1280, data.canvas.height || 720);
    refitBaseLayer();
  }

  // Clear existing non-base layers or all layers
  const baseLayer = layers.find(l => l.type === 'base');
  layers = baseLayer ? [baseLayer] : [];

  for (const layerConfig of data.layers) {
    if (layerConfig.type === 'base') continue; // Base photo is captured from camera

    if (layerConfig.src) {
      await addLayer({
        id: layerConfig.id,
        type: layerConfig.type,
        image: layerConfig.src,
        x: layerConfig.x,
        y: layerConfig.y,
        width: layerConfig.width,
        height: layerConfig.height,
        scale: layerConfig.scale,
        rotation: layerConfig.rotation,
        opacity: layerConfig.opacity,
        zIndex: layerConfig.zIndex
      });
    }
  }

  scheduleRender();
  return getLayers();
}

/**
 * Schedules a canvas re-render.
 */
function scheduleRender() {
  if (isRenderScheduled) return;
  isRenderScheduled = true;
  requestAnimationFrame(() => {
    isRenderScheduled = false;
    renderCanvas();
  });
}

/**
 * Exports composited image as Data URL.
 */
export function exportImage(format = 'image/png', quality = 0.92) {
  if (!targetCanvas) {
    throw new Error('Canvas ยังไม่ได้ถูก Initialize');
  }

  // Hide selection overlay before exporting clean final image
  const tempSelectedId = selectedLayerId;
  selectedLayerId = null;
  renderCanvas();

  const dataUrl = targetCanvas.toDataURL(format, quality);

  // Restore selection
  selectedLayerId = tempSelectedId;
  scheduleRender();

  return dataUrl;
}

/**
 * Triggers direct image download.
 */
export async function downloadImage(filename = 'snapframe-photo.png', format = 'image/png') {
  const dataUrl = exportImage(format);
  return downloadDataUrl(dataUrl, filename, format);
}

export async function downloadDataUrl(dataUrl, filename = 'snapframe-photo.png', format = 'image/png') {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isVideo = typeof format === 'string' && format.startsWith('video/');
  if (ios && !isVideo) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'บันทึกรูปภาพ');
    const card = document.createElement('div');
    card.className = 'modal-card';
    const hint = document.createElement('p');
    hint.textContent = 'แตะรูปค้างไว้ แล้วเลือกบันทึกไปยังรูปภาพ';
    const img = new Image();
    img.src = dataUrl;
    img.alt = 'ภาพถ่ายพร้อมกรอบ';
    img.style.cssText = 'width:100%;height:auto;flex-shrink:0;-webkit-touch-callout:default;user-select:auto';
    const close = document.createElement('button');
    close.className = 'btn btn-secondary';
    close.textContent = 'ปิด';
    close.onclick = () => overlay.remove();
    card.append(close, hint, img);
    overlay.append(card);
    document.body.append(overlay);
    close.focus();
    return;
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Returns active layers.
 */
export function getLayers() {
  return layers;
}
