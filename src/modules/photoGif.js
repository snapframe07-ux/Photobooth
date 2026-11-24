import { filteredSource } from './imageFilters.js';
import { drawScaledLayers } from './photoStrip.js';

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
  const slots = typeof options === 'object' && Array.isArray(options?.slots) ? options.slots : null;
  const hasFilter = Boolean(filter && filter !== 'none');
  const canvas = document.createElement('canvas');
  canvas.width = photos[0].width;
  canvas.height = photos[0].height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const nativeFilter = 'filter' in ctx;
  return photos.map((photo, frameIndex) => {
    // Different custom-slot ratios are letterboxed instead of stretching faces.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / photo.width, canvas.height / photo.height);
    const w = photo.width * scale, h = photo.height * scale;
    const dx = (canvas.width - w) / 2, dy = (canvas.height - h) / 2;
    let sourcePhoto = photo;
    if (hasFilter) {
      ctx.save?.();
      if (nativeFilter) ctx.filter = filter;
      else sourcePhoto = filteredSource(photo, filter);
    }
    ctx.drawImage(sourcePhoto, dx, dy, w, h);
    if (hasFilter) {
      if (nativeFilter) ctx.filter = 'none';
      ctx.restore?.();
    }
    if (decoration) ctx.drawImage(decoration, 0, 0, canvas.width, canvas.height);

    const slot = slots?.[frameIndex];
    if (slot && slot.width > 0 && slot.height > 0) {
      const canClip = typeof ctx.beginPath === 'function' && typeof ctx.rect === 'function' && typeof ctx.clip === 'function';
      if (canClip) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, w, h);
        ctx.clip();
      }
      if (stickers.length) {
        const s = Math.min(w / slot.width, h / slot.height);
        for (const layer of stickers) {
          if (!layer?.image) continue;
          const sx = dx + ((layer.x - slot.x) / slot.width) * w;
          const sy = dy + ((layer.y - slot.y) / slot.height) * h;
          const dw = layer.width * s * (layer.scaleX || 1) * (layer.scale || 1);
          const dh = layer.height * s * (layer.scaleY || 1) * (layer.scale || 1);
          const radius = Math.hypot(dw, dh) / 2;
          if (sx + radius < dx || sx - radius > dx + w || sy + radius < dy || sy - radius > dy + h) continue;
          ctx.save();
          ctx.globalAlpha = layer.opacity ?? 1;
          ctx.translate(sx, sy);
          ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
          if (layer.mirror && typeof ctx.scale === 'function') ctx.scale(-1, 1);
          ctx.drawImage(layer.image, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }
      }
      if (doodle && sourceSize?.width > 0 && sourceSize?.height > 0) {
        const dsx = doodle.width / sourceSize.width;
        const dsy = doodle.height / sourceSize.height;
        ctx.drawImage(doodle, slot.x * dsx, slot.y * dsy, slot.width * dsx, slot.height * dsy, dx, dy, w, h);
      }
      if (canClip) ctx.restore();
    } else {
      drawScaledLayers(ctx, stickers, sourceSize, canvas.width, canvas.height);
      if (doodle) ctx.drawImage(doodle, 0, 0, canvas.width, canvas.height);
    }
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
}
