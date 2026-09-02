/**
 * Segmenter Module (SnapFrame)
 * Multi-Engine AI & Color-Key Background Removal System:
 * 1. AI Neural Network Object Segmenter (@imgly/background-removal ONNX Web) - Cuts out ANY object, cat 🐱, dog 🐶, item, or person!
 * 2. MediaPipe Selfie Segmenter - Fast human selfie segmentation.
 * 3. Smart Outer-Border Color Segmenter - Instant color keying for solid/gradient backgrounds.
 */

import { removeBackground as removeBackgroundImgly } from '@imgly/background-removal';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let imageSegmenterInstance = null;
let isInitializing = false;
let initPromise = null;

const WASM_CDN_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// ด้านยาวสุดที่ยอมประมวลผลตอนเจาะช่องกรอบ
const MAX_CUTOUT_SIDE = 2048;

/**
 * Initializes MediaPipe ImageSegmenter
 */
export async function initSegmenter(onProgress = () => {}) {
  if (imageSegmenterInstance) {
    onProgress({ status: 'ready', progress: 100, message: 'โมเดล MediaPipe พร้อมใช้งานแล้ว' });
    return imageSegmenterInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      onProgress({ status: 'wasm_loading', progress: 20, message: 'กำลังโหลด MediaPipe Vision Engine...' });
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN_PATH);

      onProgress({ status: 'model_loading', progress: 50, message: 'กำลังโหลดโมเดลปัญญาประดิษฐ์ AI...' });

      imageSegmenterInstance = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false
      });

      onProgress({ status: 'ready', progress: 100, message: 'เตรียมระบบตัดพื้นหลังเรียบร้อย' });
      isInitializing = false;
      return imageSegmenterInstance;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      console.error('MediaPipe Segmenter Initialization Failed:', error);
      throw new Error(`ไม่สามารถโหลดโมเดล MediaPipe ได้: ${error.message}`);
    }
  })();

  return initPromise;
}

function loadImageElementFromFile(imageFile) {
  return new Promise((resolve, reject) => {
    if (!imageFile || !(imageFile instanceof Blob)) {
      return reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
    }

    const objectUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('ไม่สามารถโหลดภาพต้นฉบับได้'));
    };

    img.src = objectUrl;
  });
}

/**
 * Top-Corner Background Removal Algorithm.
 * Samples ONLY top-left and top-right extreme corners to guarantee picking the true background color.
 */
export function removeSolidBackground(canvas, ctx, imageData, options = {}) {
  const width = canvas.width;
  const height = canvas.height;
  const pixels = imageData.data;

  let bgR = 0, bgG = 0, bgB = 0;

  if (options.targetBgColor && Array.isArray(options.targetBgColor)) {
    [bgR, bgG, bgB] = options.targetBgColor;
  } else {
    // สแกนสีเฉพาะมุมขอบบนสุด (Top-Left & Top-Right)
    const topCornerSamples = [];
    const getPixel = (x, y) => {
      const i = (y * width + x) * 4;
      return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    };

    for (let dy = 2; dy < Math.min(20, height / 10); dy += 3) {
      for (let dx = 2; dx < Math.min(20, width / 10); dx += 3) {
        topCornerSamples.push(getPixel(dx, dy));
        topCornerSamples.push(getPixel(width - 1 - dx, dy));
      }
    }

    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    topCornerSamples.forEach(c => {
      if (c[3] > 0) {
        sumR += c[0];
        sumG += c[1];
        sumB += c[2];
        count++;
      }
    });

    if (count === 0) return 0;

    bgR = Math.round(sumR / count);
    bgG = Math.round(sumG / count);
    bgB = Math.round(sumB / count);
  }

  const threshold = options.threshold || 65;
  const feather = options.feather || 25;
  const invert = Boolean(options.invertCut);
  let removedCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a === 0) continue;

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    let isBackground = dist < threshold;

    if (invert) {
      isBackground = !isBackground;
    }

    if (isBackground) {
      pixels[i + 3] = 0; // ตั้งค่า Alpha เป็น 0 (ลบพื้นหลัง)
      removedCount++;
    } else if (dist < threshold + feather && !invert) {
      const alphaFactor = (dist - threshold) / feather;
      pixels[i + 3] = Math.round(a * alphaFactor);
      removedCount++;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return removedCount;
}

/**
 * AI Neural Network Object & Pet Segmenter (@imgly/background-removal ONNX Engine)
 * ตัดพื้นหลัง วัตถุ, น้องแมว 🐱, สุนัข 🐶, สัตว์เลี้ยง หรือคน บนฉากหลังซับซ้อน
 */
export async function removeBackgroundAI(imageFile, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};

  try {
    onProgress({ status: 'onnx_loading', progress: 25, message: 'กำลังประมวลผล AI ตัดวัตถุ/น้องแมว (ONNX Engine)...' });

    const resultBlob = await removeBackgroundImgly(imageFile, {
      progress: (key, current, total) => {
        if (total > 0) {
          const pct = Math.min(95, Math.round(25 + (current / total) * 70));
          onProgress({ status: 'onnx_processing', progress: pct, message: `กำลังประมวลผล AI: ${Math.round((current / total) * 100)}%` });
        }
      }
    });

    onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังวัตถุ/น้องแมวด้วย AI สำเร็จเป็น Transparent PNG!' });
    return resultBlob;

  } catch (error) {
    console.warn('AI Neural Net object removal fallback to Color/MediaPipe Segmenter:', error);
    return await removeBackgroundHybrid(imageFile, options);
  }
}

/**
 * Hybrid Background Removal Engine (ระบบสำรอง)
 */
async function removeBackgroundHybrid(imageFile, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const onError = typeof options.onError === 'function' ? options.onError : () => {};

  let imageElement;
  try {
    imageElement = await loadImageElementFromFile(imageFile);
  } catch (err) {
    onError(err);
    return imageFile;
  }

  const width = imageElement.naturalWidth || imageElement.width || 500;
  const height = imageElement.naturalHeight || imageElement.height || 500;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(imageElement, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  try {
    onProgress({ status: 'processing', progress: 60, message: 'กำลังสแกนและตัดพื้นหลังสีสม่ำเสมอ...' });

    const removedCount = removeSolidBackground(canvas, ctx, imageData, options);

    if (removedCount > 0) {
      onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังสีสม่ำเสมอสำเร็จ!' });
    } else {
      try {
        if (!imageSegmenterInstance) {
          await initSegmenter(onProgress);
        }
        const result = imageSegmenterInstance.segment(imageElement);
        if (result && result.categoryMask) {
          const pixels = imageData.data;
          const maskData = result.categoryMask.getAsUint8Array();
          for (let i = 0; i < maskData.length; i++) {
            if (maskData[i] === 0) pixels[i * 4 + 3] = 0;
          }
          ctx.putImageData(imageData, 0, 0);
        }
      } catch (_) {}
      onProgress({ status: 'complete', progress: 100, message: 'ประมวลผลตัดพื้นหลังเสร็จสิ้น' });
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || imageFile);
      }, 'image/png');
    });

  } catch (error) {
    console.warn('Background removal fallback:', error);
    removeSolidBackground(canvas, ctx, imageData, options);
    onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังเรียบร้อย' });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || imageFile);
      }, 'image/png');
    });
  }
}

/**
 * Main Entry Point for Background Removal
 */
export async function removeBackground(imageFile, options = {}) {
  if (options.mode === 'color_key') {
    return await removeBackgroundHybrid(imageFile, options);
  }
  return await removeBackgroundAI(imageFile, options);
}

/**
 * Flood fill 4 ทิศจากจุดเริ่ม เทียบสีกับ "สีของจุดเริ่ม" ที่ตรึงไว้
 * (ไม่ใช้ค่าเฉลี่ยวิ่ง เพื่อไม่ให้ไหลข้ามโทนไปเรื่อย ๆ จนกินทั้งภาพ)
 *
 * @param {Uint8ClampedArray} px  ข้อมูลพิกเซล RGBA
 * @param {number} w
 * @param {number} h
 * @param {number} startIdx  ดัชนีพิกเซล (ไม่ใช่ byte offset)
 * @param {number} tolerance ระยะสี RGB ที่ยังถือว่าเป็นสีเดียวกัน
 * @param {Uint8Array} [claimed] แผนที่พิกเซลที่ถูกจับกลุ่มไปแล้ว (กันซ้ำข้ามรอบ)
 * @returns {{pixels: number[], area: number, minX: number, minY: number, maxX: number, maxY: number, touchesEdge: boolean}}
 */
export function floodFillRegion(px, w, h, startIdx, tolerance, claimed = null) {
  const sI = startIdx * 4;
  const sR = px[sI], sG = px[sI + 1], sB = px[sI + 2];

  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = [startIdx];
  seen[startIdx] = 1;

  let minX = w, minY = h, maxX = -1, maxY = -1, touchesEdge = false;

  while (stack.length) {
    const idx = stack.pop();
    out.push(idx);

    const x = idx % w;
    const y = (idx - x) / w;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge = true;

    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
      const n = ny * w + nx;
      if (seen[n]) return;
      if (claimed && claimed[n]) return;
      const i = n * 4;
      const d = Math.sqrt((px[i] - sR) ** 2 + (px[i + 1] - sG) ** 2 + (px[i + 2] - sB) ** 2);
      if (d >= tolerance) return;
      seen[n] = 1;
      stack.push(n);
    };

    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }

  return { pixels: out, area: out.length, minX, minY, maxX, maxY, touchesEdge };
}

/**
 * โหลดภาพลง canvas พร้อมย่อด้านยาวสุดไม่เกิน MAX_CUTOUT_SIDE
 * กรอบถูกยืดเป็นขนาด canvas อยู่แล้ว ย่อจึงไม่เสียคุณภาพ และกันหน่วยความจำบาน
 */
export async function loadFrameCanvas(imageFile) {
  const img = await loadImageElementFromFile(imageFile);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) throw new Error('ภาพไม่มีขนาด');

  const k = Math.min(1, MAX_CUTOUT_SIDE / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k));
  const h = Math.max(1, Math.round(ih * k));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

/**
 * ไล่ขอบของช่องที่เจาะไปแล้วให้เนียน (กันขอบหยัก)
 *
 * ต้องเทียบกับ "สีของช่อง" และ tolerance ที่ช่องนั้นใช้จริง แล้วจำกัดแถบไล่ให้แคบ
 * ไม่งั้นจะไปกัดเนื้อกรอบที่ติดขอบช่องจนจาง (เช่นเส้นคั่นสีชมพูบาง ๆ ระหว่างช่อง)
 */
function featherSlotEdge(px, w, h, cut, region, tol, sR, sG, sB) {
  const band = tol * 1.25;   // แถบไล่ขอบ: แค่พิกเซลที่เกือบจะถูกเจาะไปแล้ว

  for (const p of region.pixels) {
    const x = p % w;
    const y = (p - x) / w;

    const check = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
      const n = ny * w + nx;
      if (cut[n]) return;
      const i = n * 4;
      if (px[i + 3] === 0) return;
      const d = Math.sqrt((px[i] - sR) ** 2 + (px[i + 1] - sG) ** 2 + (px[i + 2] - sB) ** 2);
      if (d < tol || d >= band) return;   // ในช่วง tol..band เท่านั้น
      const factor = (d - tol) / (band - tol);
      const next = Math.round(px[i + 3] * factor);
      if (next < px[i + 3]) px[i + 3] = next;
    };

    check(x - 1, y); check(x + 1, y); check(x, y - 1); check(x, y + 1);
  }
}

// เกณฑ์ตัดสินว่าบริเวณที่เจอ "เป็นช่องใส่รูป" หรือไม่
/**
 * probe ต้องอยู่บนพื้นที่สีเรียบ ไม่ใช่บนขอบรอยต่อ
 *
 * ถ้า seed ตกบนพิกเซล anti-alias ตรงขอบช่อง สีของมันจะใกล้ทั้งสีในช่องและสีพื้นกรอบ
 * flood จึงรั่วข้ามขอบออกไปกินพื้นหลังทั้งผืน แล้วกลืนช่องนั้นหายไปด้วย
 */
function isFlatProbe(px, w, h, x, y, tolerance) {
  const i0 = (y * w + x) * 4;
  const r = px[i0], g = px[i0 + 1], b = px[i0 + 2];
  const limit = tolerance / 3;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return false;
      const i = (ny * w + nx) * 4;
      const d = Math.sqrt((px[i] - r) ** 2 + (px[i + 1] - g) ** 2 + (px[i + 2] - b) ** 2);
      if (d > limit) return false;
    }
  }
  return true;
}

const SLOT_MIN_AREA_RATIO = 0.02;  // เล็กกว่านี้คือลายตกแต่ง
const SLOT_MAX_AREA_RATIO = 0.85;  // ใหญ่กว่านี้คือไหลกินทั้งภาพ
const SLOT_MIN_FILL_RATIO = 0.6;   // ช่องเป็นสี่เหลี่ยม/วงรี ไม่ใช่ลายกระจาย
const PROBE_GRID = 9;              // หว่าน probe 9x9 ทั่วภาพ
const PROBE_MARGIN = 0.06;

// บางกรอบมีสีอ่อน ๆ เชื่อมจากในช่องออกไปพื้นหลัง ทำให้ flood รั่วออกไปทั้งผืน
// จึงไล่ลด tolerance ลงเรื่อย ๆ จนกว่าจะได้บริเวณที่มีลักษณะเป็นช่องจริง
const TOLERANCE_LADDER = [1, 0.7, 0.5, 0.35];

function isSlotRegion(region, total) {
  const areaRatio = region.area / total;
  const boxArea = (region.maxX - region.minX + 1) * (region.maxY - region.minY + 1);
  const fillRatio = boxArea > 0 ? region.area / boxArea : 0;
  return (
    !region.touchesEdge &&
    areaRatio >= SLOT_MIN_AREA_RATIO &&
    areaRatio <= SLOT_MAX_AREA_RATIO &&
    fillRatio >= SLOT_MIN_FILL_RATIO
  );
}

/**
 * เจาะ "ช่องใส่รูป" ของกรอบ photobooth ให้โปร่งใส — รองรับหลายช่อง
 *
 * ของเดิม (cutoutCenterRegion) หว่าน seed ที่กลางภาพจุดเดียว จึงพังกับกรอบหลายช่อง
 * เพราะจุดกึ่งกลางมักตกบนเส้นคั่นระหว่างช่อง แล้วไหลไปกินพื้นหลังกรอบแทน
 *
 * วิธีใหม่: หว่าน probe ทั่วภาพ แล้วคัดเฉพาะบริเวณที่มีลักษณะเป็นช่องใส่รูป
 * (ไม่แตะขอบภาพ + ใหญ่พอ + รูปทรงเต็ม bounding box)
 *
 * @param {Blob|File} imageFile
 * @param {Object} [options]
 * @param {number} [options.tolerance=45]
 * @param {Function} [options.onProgress]
 * @returns {Promise<{blob: Blob, removedRatio: number, slotCount: number}>}
 */
export async function cutoutFrameSlots(imageFile, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const tolerance = options.tolerance || 45;

  onProgress({ status: 'loading', progress: 15, message: 'กำลังอ่านไฟล์กรอบ...' });
  const { canvas, ctx, w, h } = await loadFrameCanvas(imageFile);

  onProgress({ status: 'processing', progress: 45, message: 'กำลังตรวจหาช่องใส่รูป...' });

  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  const total = w * h;

  // เก็บ "สีของ region ที่เคยครอบพิกเซลนี้" ไว้ เพื่อข้าม probe ที่จะได้ผลซ้ำเดิม
  // ใช้แทนการ mark claimed แบบตายตัว เพราะ region ที่ถูกปฏิเสธไม่ควรไปกันไม่ให้เจอช่องข้างใน
  const regionSeed = new Int32Array(total);
  const cut = new Uint8Array(total);      // พิกเซลที่จะเจาะจริง
  const slots = [];                       // ช่องที่รับแล้ว เก็บสี+tolerance ไว้ใช้ไล่ขอบ
  let removed = 0;
  let slotCount = 0;

  for (let gy = 0; gy < PROBE_GRID; gy++) {
    for (let gx = 0; gx < PROBE_GRID; gx++) {
      const fx = PROBE_MARGIN + (gx / (PROBE_GRID - 1)) * (1 - PROBE_MARGIN * 2);
      const fy = PROBE_MARGIN + (gy / (PROBE_GRID - 1)) * (1 - PROBE_MARGIN * 2);
      const x = Math.min(w - 1, Math.max(0, Math.round(fx * w)));
      const y = Math.min(h - 1, Math.max(0, Math.round(fy * h)));
      const idx = y * w + x;
      const pi = idx * 4;

      // ข้าม probe ที่ตกบนขอบรอยต่อ ไม่งั้น flood จะรั่วข้ามขอบ
      if (!isFlatProbe(px, w, h, x, y, tolerance)) continue;

      // ข้าม probe ที่จะได้ region เดิมกับที่เคยตรวจไปแล้ว
      const packed = regionSeed[idx];
      if (packed !== 0) {
        const pr = (packed >> 16) & 255, pg = (packed >> 8) & 255, pb = packed & 255;
        const d = Math.sqrt((px[pi] - pr) ** 2 + (px[pi + 1] - pg) ** 2 + (px[pi + 2] - pb) ** 2);
        if (d < tolerance) continue;
      }

      const seedPacked = (1 << 24) | (px[pi] << 16) | (px[pi + 1] << 8) | px[pi + 2];

      let accepted = null;
      let acceptedTol = tolerance;
      let widest = null;
      for (const factor of TOLERANCE_LADDER) {
        const tol = tolerance * factor;
        const region = floodFillRegion(px, w, h, idx, tol);
        if (!widest) widest = region;

        if (isSlotRegion(region, total)) { accepted = region; acceptedTol = tol; break; }

        // เล็กเกินไป = เป็นลายตกแต่ง ลด tolerance ลงอีกก็ยิ่งเล็ก ไม่ต้องไล่ต่อ
        if (region.area / total < SLOT_MIN_AREA_RATIO) break;
      }

      // จองพื้นที่ไว้กัน probe อื่นมาทำซ้ำ (ใช้ผลที่กว้างที่สุดเพื่อครอบให้ทั่ว)
      for (const p of widest.pixels) regionSeed[p] = seedPacked;

      if (!accepted) continue;

      slotCount++;
      slots.push({ region: accepted, tol: acceptedTol, sR: px[pi], sG: px[pi + 1], sB: px[pi + 2] });
      for (const p of accepted.pixels) {
        if (cut[p]) continue;
        cut[p] = 1;
        px[p * 4 + 3] = 0;
        removed++;
      }
    }
  }

  onProgress({ status: 'feathering', progress: 80, message: 'กำลังไล่ขอบให้เนียน...' });
  for (const s of slots) featherSlotEdge(px, w, h, cut, s.region, s.tol, s.sR, s.sG, s.sB);

  ctx.putImageData(imageData, 0, 0);
  onProgress({ status: 'complete', progress: 100, message: `เจาะช่องใส่รูปได้ ${slotCount} ช่อง` });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { blob: blob || imageFile, removedRatio: total ? removed / total : 0, slotCount };
}
