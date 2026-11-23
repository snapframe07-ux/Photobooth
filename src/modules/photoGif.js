import { filteredSource } from './imageFilters.js';

export function snapshotGifFrame(photo, decoration = null) {
  const scale = Math.min(1, 640 / Math.max(photo.width, photo.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(photo.width * scale));
  canvas.height = Math.max(1, Math.round(photo.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
  if (decoration) ctx.drawImage(decoration, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function buildGifSequence(frames, boomerang = false) {
  if (!Array.isArray(frames)) return [];
  if (!boomerang || frames.length < 3) return frames;
  return [...frames, ...frames.slice(1, -1).reverse()];
}

export async function encodePhotoGif(frames, onProgress = () => {}, options = {}) {
  const { delay = 500, boomerang = false } = options || {};
  if (frames.length < 2 || frames.length > 4) throw new Error('กรุณาถ่ายต่อเนื่อง 2–4 ภาพเพื่อสร้าง GIF');
  const { width, height } = frames[0];
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > 640 || height > 640) throw new Error('ขนาดภาพ GIF ไม่ถูกต้อง');
  const sequence = buildGifSequence(frames, boomerang);
  const frameDelay = Math.max(100, Math.min(2000, Number(delay) || 500));
  const encoderModule = await import('gifenc');
  const { GIFEncoder, quantize, applyPalette } = encoderModule.GIFEncoder ? encoderModule : encoderModule.default;
  const gif = GIFEncoder();
  for (let i = 0; i < sequence.length; i++) {
    const frame = sequence[i];
    if (frame.width !== width || frame.height !== height || frame.data.length !== width * height * 4) {
      throw new Error('ขนาดภาพ GIF ไม่ตรงกัน');
    }
    onProgress(i + 1, sequence.length);
    await new Promise(resolve => setTimeout(resolve, 0));
    const palette = quantize(frame.data, 256);
    gif.writeFrame(applyPalette(frame.data, palette), width, height, { palette, delay: frameDelay, repeat: 0 });
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

export function readGifFrames(photos, decoration = null, stickers = [], sourceSize = null, options = {}) {
  if (photos.length < 2) throw new Error('กรุณาถ่ายต่อเนื่องอย่างน้อย 2 ภาพ');
  const filter = typeof options === 'string' ? options : (options?.filter || 'none');
  const doodle = typeof options === 'object' ? (options?.doodle || null) : null;
  const hasFilter = Boolean(filter && filter !== 'none');
  const canvas = document.createElement('canvas');
  canvas.width = photos[0].width;
  canvas.height = photos[0].height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const nativeFilter = 'filter' in ctx;
  return photos.map(photo => {
    // Different custom-slot ratios are letterboxed instead of stretching faces.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / photo.width, canvas.height / photo.height);
    const w = photo.width * scale, h = photo.height * scale;
    let sourcePhoto = photo;
    if (hasFilter) {
      ctx.save?.();
      if (nativeFilter) ctx.filter = filter;
      else sourcePhoto = filteredSource(photo, filter);
    }
    ctx.drawImage(sourcePhoto, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    if (hasFilter) {
      if (nativeFilter) ctx.filter = 'none';
      ctx.restore?.();
    }
    if (decoration) ctx.drawImage(decoration, 0, 0, canvas.width, canvas.height);
    if (stickers.length && sourceSize?.width > 0 && sourceSize?.height > 0) {
      // shortcut: maps editor sticker positions proportionally to GIF frame size; upgrade for per-slot strip clipping
      const s = Math.min(canvas.width / sourceSize.width, canvas.height / sourceSize.height);
      for (const layer of stickers) {
        if (!layer.image) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity ?? 1;
        ctx.translate((layer.x / sourceSize.width) * canvas.width, (layer.y / sourceSize.height) * canvas.height);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        const drawW = layer.width * s * (layer.scaleX || 1) * (layer.scale || 1);
        const drawH = layer.height * s * (layer.scaleY || 1) * (layer.scale || 1);
        ctx.drawImage(layer.image, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }
    }
    if (doodle) ctx.drawImage(doodle, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
}
