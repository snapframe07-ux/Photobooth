/**
 * Canvas Engine Module (SnapFrame)
 * Interactive Layered Image Composition Engine:
 * - 3-Layer Stacking System (Base -> Stickers -> Frame)
 * - Interactive Drag-to-move, Rotate Handle, Scroll/Pinch-to-scale
 * - Template Design JSON Serialization & Deserialization
 */

let targetCanvas = null;
let ctx = null;
let layers = [];
let selectedLayerId = null;
let isRenderScheduled = false;

// Interaction State
let activeAction = null; // 'drag' | 'rotate' | 'scale' | null
let dragStart = { x: 0, y: 0 };
let layerInitialState = null;
let onSelectionChangeCallback = null;

// Handle sizes
const HANDLE_SIZE = 12; // Circle radius for handles
const ROTATE_HANDLE_OFFSET = 30; // Offset above top border

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

  if (options.width) targetCanvas.width = options.width;
  if (options.height) targetCanvas.height = options.height;

  layers = [];
  selectedLayerId = null;

  setupPointerEvents();
  renderCanvas();
  return targetCanvas;
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
 * Captures a snapshot from <video> into Layer 1 (Base Layer).
 */
export async function captureFrame(videoEl, options = {}) {
  if (!videoEl || !(videoEl instanceof HTMLVideoElement)) {
    throw new Error('กรุณาระบุ <video> element ที่มี video stream สำหรับถ่ายภาพ');
  }

  const width = videoEl.videoWidth || targetCanvas?.width || 1280;
  const height = videoEl.videoHeight || targetCanvas?.height || 720;

  if (targetCanvas) {
    targetCanvas.width = width;
    targetCanvas.height = height;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext('2d');

  const isMirrored = options.mirror !== undefined ? options.mirror : videoEl.classList.contains('mirror');

  if (isMirrored) {
    offCtx.translate(width, 0);
    offCtx.scale(-1, 1);
  }

  offCtx.drawImage(videoEl, 0, 0, width, height);

  const baseLayer = {
    id: 'base-layer',
    type: 'base',
    src: null,
    image: offscreen,
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

  const canvasWidth = targetCanvas ? targetCanvas.width : 1280;
  const canvasHeight = targetCanvas ? targetCanvas.height : 720;

  const defaultWidth = layerData.type === 'frame' ? canvasWidth : (loadedImg.width || 150);
  const defaultHeight = layerData.type === 'frame' ? canvasHeight : (loadedImg.height || 150);

  const layer = {
    id: layerData.id || `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
export function removeLayer(id) {
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

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  const baseLayers = layers.filter(l => l.type === 'base');
  const stickerLayers = layers.filter(l => l.type === 'sticker').sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const frameLayers = layers.filter(l => l.type === 'frame');

  const orderedLayers = [...baseLayers, ...stickerLayers, ...frameLayers];

  orderedLayers.forEach(layer => {
    if (!layer.image) return;

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

    const drawW = layer.width;
    const drawH = layer.height;
    ctx.drawImage(layer.image, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // Draw Selection Bounding Box & Handles for selected layer (sticker or frame)
    if (layer.id === selectedLayerId && layer.type !== 'base') {
      renderSelectionOverlay(layer);
    }
  });
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

  // Bounding Box
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-halfW, -halfH, w, h);
  ctx.setLineDash([]);

  // Connection Line to Rotate Handle
  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(0, -halfH - ROTATE_HANDLE_OFFSET);
  ctx.strokeStyle = '#6366f1';
  ctx.stroke();

  // 1. Rotate Handle (Top)
  drawHandleCircle(0, -halfH - ROTATE_HANDLE_OFFSET, '#818cf8', '🔄');

  // 2. Scale Handle (Bottom-Right)
  drawHandleCircle(halfW, halfH, '#ec4899', '↘️');

  // 3. Delete Handle (Top-Left)
  drawHandleCircle(-halfW, -halfH, '#ef4444', '✖️');

  ctx.restore();
}

function drawHandleCircle(x, y, color, symbol) {
  ctx.beginPath();
  ctx.arc(x, y, HANDLE_SIZE, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '10px sans-serif';
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

function handlePointerDown(e) {
  const coords = getCanvasCoordinates(e);

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
    activeAction = 'drag';
    dragStart = coords;
    layerInitialState = { ...hitLayer };
    targetCanvas.setPointerCapture(e.pointerId);
  } else {
    selectLayer(null);
  }
}

function handlePointerMove(e) {
  if (!activeAction || !selectedLayerId || !layerInitialState) return;

  const layer = layers.find(l => l.id === selectedLayerId);
  if (!layer) return;

  const coords = getCanvasCoordinates(e);

  if (activeAction === 'drag') {
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    layer.x = layerInitialState.x + dx;
    layer.y = layerInitialState.y + dy;
  } else if (activeAction === 'rotate') {
    const angleRad = Math.atan2(coords.y - layer.y, coords.x - layer.x);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;
    layer.rotation = Math.round(angleDeg % 360);
  } else if (activeAction === 'scale') {
    const dist = Math.hypot(coords.x - layer.x, coords.y - layer.y);
    const initialDist = Math.hypot(layer.width / 2, layer.height / 2);
    const newScale = Number((dist / initialDist).toFixed(2));
    layer.scale = Math.max(0.2, Math.min(4, newScale));
  }

  scheduleRender();
}

function handlePointerUp(e) {
  if (activeAction) {
    activeAction = null;
    layerInitialState = null;
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
  const rad = ((layer.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  const dx = point.x - layer.x;
  const dy = point.y - layer.y;

  // Un-rotate point into local layer space
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  const scale = layer.scale || 1;
  const halfW = (layer.width * scale) / 2;
  const halfH = (layer.height * scale) / 2;

  // 1. Rotate Handle (0, -halfH - ROTATE_HANDLE_OFFSET)
  if (Math.hypot(localX - 0, localY - (-halfH - ROTATE_HANDLE_OFFSET)) <= HANDLE_SIZE + 4) {
    return 'rotate';
  }

  // 2. Scale Handle (halfW, halfH)
  if (Math.hypot(localX - halfW, localY - halfH) <= HANDLE_SIZE + 4) {
    return 'scale';
  }

  // 3. Delete Handle (-halfW, -halfH)
  if (Math.hypot(localX - (-halfW), localY - (-halfH)) <= HANDLE_SIZE + 4) {
    return 'delete';
  }

  return null;
}

/**
 * Checks if point is inside transformed layer rectangle.
 */
function isPointInsideLayer(point, layer) {
  const rad = ((layer.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  const dx = point.x - layer.x;
  const dy = point.y - layer.y;

  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  const scale = layer.scale || 1;
  const halfW = (layer.width * scale) / 2;
  const halfH = (layer.height * scale) / 2;

  return localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH;
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
      src: layer.src || null,
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
    targetCanvas.width = data.canvas.width || 1280;
    targetCanvas.height = data.canvas.height || 720;
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
export function downloadImage(filename = 'snapframe-photo.png', format = 'image/png') {
  const dataUrl = exportImage(format);
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

/**
 * Clears all layers.
 */
export function clearCanvas() {
  layers = [];
  selectedLayerId = null;
  scheduleRender();
}
