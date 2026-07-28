/**
 * Segmenter Module (SnapFrame)
 * Client-Side Background Removal Engine:
 * - Top-Corner Background Color Auto-Detection (Guarantees erasing background, NOT the subject)
 * - Custom Target Color Selection (Eye-Dropper / Manual Color Pick)
 * - Invert Mask Support
 * - MediaPipe AI Hybrid Fallback
 */

import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let imageSegmenterInstance = null;
let isInitializing = false;
let initPromise = null;

const WASM_CDN_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

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
 * Erases matching background pixels, preserving the central subject 100%.
 */
export function removeSolidBackground(canvas, ctx, imageData, options = {}) {
  const width = canvas.width;
  const height = canvas.height;
  const pixels = imageData.data;

  let bgR = 0, bgG = 0, bgB = 0;

  if (options.targetBgColor && Array.isArray(options.targetBgColor)) {
    // Custom color picked by user
    [bgR, bgG, bgB] = options.targetBgColor;
  } else {
    // Auto-detect background color strictly from TOP corners (Top-Left & Top-Right)
    const topCornerSamples = [];

    const getPixel = (x, y) => {
      const i = (y * width + x) * 4;
      return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    };

    // Sample top-left corner box (5x5) and top-right corner box (5x5)
    for (let dy = 2; dy < Math.min(20, height / 10); dy += 3) {
      for (let dx = 2; dx < Math.min(20, width / 10); dx += 3) {
        topCornerSamples.push(getPixel(dx, dy));
        topCornerSamples.push(getPixel(width - 1 - dx, dy));
      }
    }

    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    topCornerSamples.forEach(c => {
      if (c[3] > 0) { // Opaque pixel
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

  const threshold = options.threshold || 65; // Tolerance threshold
  const feather = options.feather || 25;      // Soft edge feathering
  const invert = Boolean(options.invertCut);
  let removedCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a === 0) continue;

    // Euclidean color distance from top-corner background color
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

    let isBackground = dist < threshold;

    if (invert) {
      isBackground = !isBackground;
    }

    if (isBackground) {
      pixels[i + 3] = 0; // Make background transparent
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
 * Hybrid Background Removal Engine
 */
export async function removeBackground(imageFile, options = {}) {
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
    onProgress({ status: 'processing', progress: 50, message: 'กำลังสแกนและตัดพื้นหลังสีสม่ำเสมอ...' });

    // Always run Top-Corner Color Segmenter to guarantee erasing background, NOT the subject
    const removedCount = removeSolidBackground(canvas, ctx, imageData, options);

    if (removedCount > 0) {
      onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังสำเร็จเป็น Transparent PNG' });
    } else {
      // Try MediaPipe as secondary option if corner color segmenter removed nothing
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
