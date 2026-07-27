/**
 * Segmenter Module (SnapFrame)
 * Client-Side MediaPipe Image Segmentation & Background Removal Module (@mediapipe/tasks-vision)
 * Converts uploaded sticker images to Transparent PNG entirely in the browser.
 */

import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let imageSegmenterInstance = null;
let isInitializing = false;
let initPromise = null;

// CDN Model & WASM Assets (Client-side execution)
const WASM_CDN_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

/**
 * Initializes MediaPipe ImageSegmenter (Client-side WASM + TFLite model)
 * @param {function({status: string, progress: number, message: string}): void} [onProgress]
 * @returns {Promise<ImageSegmenter>}
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
      onProgress({ status: 'wasm_loading', progress: 20, message: 'กำลังโหลด MediaPipe Vision WASM Engine...' });
      
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN_PATH);

      onProgress({ status: 'model_loading', progress: 50, message: 'กำลังดาวน์โหลดโมเดลปัญญาประดิษฐ์ตัดพื้นหลัง (Selfie Segmenter)...' });

      imageSegmenterInstance = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false
      });

      onProgress({ status: 'ready', progress: 100, message: 'การเตรียมโมเดลตัดพื้นหลังเสร็จสมบูรณ์' });
      isInitializing = false;
      return imageSegmenterInstance;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      console.error('MediaPipe Segmenter Initialization Failed:', error);
      throw new Error(`ไม่สามารถโหลดโมเดล MediaPipe ตัดพื้นหลังได้: ${error.message}`);
    }
  })();

  return initPromise;
}

/**
 * Loads an uploaded image File/Blob into an HTMLImageElement.
 * @param {File|Blob} imageFile 
 * @returns {Promise<HTMLImageElement>}
 */
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

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('ไม่สามารถโหลดภาพต้นฉบับได้'));
    };

    img.src = objectUrl;
  });
}

/**
 * Removes background from an uploaded sticker image file and returns a Transparent PNG Blob.
 * If background removal fails, falls back to returning the original image Blob.
 * 
 * @param {File|Blob} imageFile - Uploaded image file
 * @param {Object} [options={}]
 * @param {function({status: string, progress: number, message: string}): void} [options.onProgress]
 * @param {function(Error): void} [options.onError]
 * @returns {Promise<Blob>} Transparent PNG Blob (or original Blob on fallback)
 */
export async function removeBackground(imageFile, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const onError = typeof options.onError === 'function' ? options.onError : () => {};

  let imageElement;
  try {
    imageElement = await loadImageElementFromFile(imageFile);
  } catch (err) {
    console.warn('Failed to parse uploaded image file:', err);
    onError(err);
    return imageFile; // Fallback
  }

  try {
    // Step 1: Ensure segmenter is initialized
    if (!imageSegmenterInstance) {
      await initSegmenter(onProgress);
    }

    onProgress({ status: 'processing', progress: 75, message: 'กำลังประมวลผลตัดพื้นหลัง (Client-side)...' });

    // Step 2: Segment image using MediaPipe
    const result = imageSegmenterInstance.segment(imageElement);

    // Step 3: Draw transparent PNG using category mask
    const width = imageElement.naturalWidth || imageElement.width || 500;
    const height = imageElement.naturalHeight || imageElement.height || 500;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(imageElement, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    let transparentPixelsCount = 0;

    if (result && result.categoryMask) {
      const maskData = result.categoryMask.getAsUint8Array();

      for (let i = 0; i < maskData.length; i++) {
        const category = maskData[i];
        // Category 0 represents Background in MediaPipe selfie segmenter
        if (category === 0) {
          pixels[i * 4 + 3] = 0; // Set Alpha to 0 (Transparent)
          transparentPixelsCount++;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Clean up MPMask memory allocation
      if (typeof result.categoryMask.close === 'function') {
        result.categoryMask.close();
      }
    }

    // Step 4: Validate mask result quality
    const totalPixels = width * height;
    // If entire image became 100% transparent or 0% transparent, warn & fallback if necessary
    if (transparentPixelsCount === totalPixels) {
      console.warn('Segmentation resulted in 100% transparent image. Falling back to original image.');
      onProgress({ status: 'fallback', progress: 100, message: 'ไม่พบวัตถุหลัก ใช้ภาพต้นฉบับแทน' });
      return imageFile;
    }

    onProgress({ status: 'complete', progress: 100, message: 'ตัดพื้นหลังสำเร็จเป็น Transparent PNG' });

    // Step 5: Return PNG Blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(imageFile); // Fallback
        }
      }, 'image/png');
    });

  } catch (error) {
    console.warn('Background removal failed, returning original uploaded image file (Fallback):', error);
    onError(error);
    onProgress({ status: 'fallback', progress: 100, message: 'เกิดข้อผิดพลาดในการตัดพื้นหลัง ใช้ภาพต้นฉบับแทน' });
    
    // Fallback: Return original image Blob directly
    return imageFile;
  }
}
