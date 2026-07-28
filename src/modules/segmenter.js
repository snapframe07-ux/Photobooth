/**
 * Segmenter Module (SnapFrame)
 * Hybrid Client-Side Background Removal Engine:
 * 1. MediaPipe AI Selfie Segmenter (for Human People)
 * 2. Smart Color-Key / Corner Sampling Segmenter (for Pets, Animals, Products & Solid Backgrounds)
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
 * Smart Color-Key / Corner Background Removal algorithm.
 * Samples background color from corners and removes matching solid/gradient colors.
 */
function removeSolidBackground(canvas, ctx, imageData) {
  const width = canvas.width;
  const height = canvas.height;
  const pixels = imageData.data;

  const getPixel = (x, y) => {
    const i = (y * width + x) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  };

  // Sample background color from corners & top border
  const corners = [
    getPixel(2, 2),
    getPixel(width - 3, 2),
    getPixel(2, height - 3),
    getPixel(width - 3, height - 3),
    getPixel(Math.floor(width / 2), 2)
  ];

  let bgR = 0, bgG = 0, bgB = 0, valid = 0;
  for (const c of corners) {
    if (c[3] > 0) {
      bgR += c[0];
      bgG += c[1];
      bgB += c[2];
      valid++;
    }
  }

  if (valid === 0) return 0;

  bgR = Math.round(bgR / valid);
  bgG = Math.round(bgG / valid);
  bgB = Math.round(bgB / valid);

  const threshold = 55; // RGB color distance threshold
  const feather = 25;   // Edge feathering range
  let removedCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a === 0) continue;

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

    if (dist < threshold) {
      pixels[i + 3] = 0; // Make transparent
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
 * Hybrid Background Removal:
 * Tries MediaPipe AI first (for humans). If non-human object/pet or no person detected,
 * seamlessly uses Smart Color-Key Background Removal.
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
    // Try MediaPipe AI Segmenter
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

    // Check if MediaPipe detected a human person
    // If transparentPixelsCount === totalPixels, MediaPipe found no human (e.g. cat, pet, product photo)
    if (transparentPixelsCount === totalPixels || transparentPixelsCount === 0) {
      onProgress({ status: 'smart_color_key', progress: 85, message: 'ไม่พบวัตถุบุคคล ใช้ระบบ Smart Color-Key ตัดพื้นหลังสีสม่ำเสมอ...' });
      
      // Re-draw original image into canvas to reset pixels for Color-Key segmenter
      ctx.drawImage(imageElement, 0, 0, width, height);
      const freshImageData = ctx.getImageData(0, 0, width, height);
      const removedCount = removeSolidBackground(canvas, ctx, freshImageData);

      if (removedCount > 0) {
        onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังสีสม่ำเสมอสำเร็จ!' });
      } else {
        onProgress({ status: 'complete', progress: 100, message: 'เสร็จสิ้นการประมวลผล' });
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
    console.warn('MediaPipe error, falling back to Smart Color-Key background removal:', error);
    
    // Fallback: Smart Color-Key Background Removal
    ctx.drawImage(imageElement, 0, 0, width, height);
    const freshImageData = ctx.getImageData(0, 0, width, height);
    removeSolidBackground(canvas, ctx, freshImageData);

    onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังด้วย Smart Color-Key เรียบร้อย' });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || imageFile);
      }, 'image/png');
    });
  }
}
