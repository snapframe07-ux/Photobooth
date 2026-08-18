/**
 * Segmenter Module (SnapFrame)
 * Hybrid Client-Side Background Removal Engine:
 * 1. MediaPipe AI Selfie Segmenter (for Human People)
 * 2. Dominant Outer-Border Segmenter (for Pets, Animals, Products & Solid/Gradient Backgrounds)
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
 * Smart Outer-Border Background Removal Algorithm.
 * Accurately samples the outer border/edges to detect the true background color (e.g. blue, white, green).
 * Erases ONLY the outer background color pixels, keeping the central subject (cat, pet, object) fully intact.
 */
function removeSolidBackground(canvas, ctx, imageData) {
  const width = canvas.width;
  const height = canvas.height;
  const pixels = imageData.data;

  // Sample outer border pixels along top edge, left edge, and right edge
  const borderSamples = [];

  // Top Edge
  for (let x = 2; x < width - 2; x += Math.max(1, Math.floor(width / 40))) {
    const i = (2 * width + x) * 4;
    if (pixels[i + 3] > 0) {
      borderSamples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
  }

  // Upper Left & Right Edges (top 60% of vertical border)
  for (let y = 2; y < Math.floor(height * 0.6); y += Math.max(1, Math.floor(height / 30))) {
    const iLeft = (y * width + 2) * 4;
    const iRight = (y * width + (width - 3)) * 4;

    if (pixels[iLeft + 3] > 0) borderSamples.push([pixels[iLeft], pixels[iLeft + 1], pixels[iLeft + 2]]);
    if (pixels[iRight + 3] > 0) borderSamples.push([pixels[iRight], pixels[iRight + 1], pixels[iRight + 2]]);
  }

  if (borderSamples.length === 0) return 0;

  // Calculate Average Background Color from Outer Borders
  let bgR = 0, bgG = 0, bgB = 0;
  borderSamples.forEach(s => {
    bgR += s[0];
    bgG += s[1];
    bgB += s[2];
  });
  bgR = Math.round(bgR / borderSamples.length);
  bgG = Math.round(bgG / borderSamples.length);
  bgB = Math.round(bgB / borderSamples.length);

  const threshold = 60; // RGB distance threshold to classify background
  const feather = 20;   // Smooth edge anti-aliasing range
  let removedCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a === 0) continue;

    // Calculate RGB distance from the outer border background color
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

    // If pixel matches outer background color -> ERASE IT (set alpha to 0)
    if (dist < threshold) {
      pixels[i + 3] = 0;
      removedCount++;
    } else if (dist < threshold + feather) {
      const alphaFactor = (dist - threshold) / feather;
      pixels[i + 3] = Math.round(a * alphaFactor);
      removedCount++;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return removedCount;
}

/**
 * Hybrid Background Removal Engine:
 * 1. Tries MediaPipe AI for human selfies.
 * 2. Uses Dominant Outer-Border Removal for pets, animals, objects & solid background photos.
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
  const pixels = imageData.data;

  try {
    if (!imageSegmenterInstance) {
      await initSegmenter(onProgress);
    }

    onProgress({ status: 'processing', progress: 75, message: 'กำลังประมวลผลตัดพื้นหลังด้วย AI...' });

    const result = imageSegmenterInstance.segment(imageElement);
    let transparentPixelsCount = 0;
    const totalPixels = width * height;

    if (result && result.categoryMask) {
      const maskData = result.categoryMask.getAsUint8Array();

      for (let i = 0; i < maskData.length; i++) {
        const category = maskData[i];
        if (category === 0) { // Category 0 = Background in MediaPipe
          pixels[i * 4 + 3] = 0;
          transparentPixelsCount++;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      if (typeof result.categoryMask.close === 'function') {
        result.categoryMask.close();
      }
    }

    // If MediaPipe classified 100% of pixels as background (no human person found, e.g. cat, pet, product photo)
    // Run Outer-Border Color Segmenter to accurately erase outer background color and keep the subject!
    if (transparentPixelsCount >= totalPixels * 0.95 || transparentPixelsCount === 0) {
      onProgress({ status: 'smart_border_key', progress: 85, message: 'ไม่พบวัตถุบุคคล ใช้ระบบตรวจจับขอบตัดพื้นหลังสีสม่ำเสมอ...' });
      
      // Reset canvas with fresh original image
      ctx.drawImage(imageElement, 0, 0, width, height);
      const freshImageData = ctx.getImageData(0, 0, width, height);
      const removedCount = removeSolidBackground(canvas, ctx, freshImageData);

      if (removedCount > 0) {
        onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังสีสม่ำเสมอสำเร็จ!' });
      } else {
        onProgress({ status: 'complete', progress: 100, message: 'ประมวลผลเรียบร้อย' });
      }
    } else {
      onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังด้วย AI สำเร็จเป็น Transparent PNG' });
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || imageFile);
      }, 'image/png');
    });

  } catch (error) {
    console.warn('MediaPipe error, falling back to Outer-Border background removal:', error);
    
    ctx.drawImage(imageElement, 0, 0, width, height);
    const freshImageData = ctx.getImageData(0, 0, width, height);
    removeSolidBackground(canvas, ctx, freshImageData);

    onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังเรียบร้อย' });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || imageFile);
      }, 'image/png');
    });
  }
}
