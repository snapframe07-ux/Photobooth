export function snapshotGifFrame(photo) {
  const scale = Math.min(1, 640 / Math.max(photo.width, photo.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(photo.width * scale));
  canvas.height = Math.max(1, Math.round(photo.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function encodePhotoGif(frames, onProgress = () => {}) {
  if (frames.length < 2 || frames.length > 4) throw new Error('กรุณาถ่ายต่อเนื่อง 2–4 ภาพเพื่อสร้าง GIF');
  const { width, height } = frames[0];
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > 640 || height > 640) throw new Error('ขนาดภาพ GIF ไม่ถูกต้อง');
  const encoderModule = await import('gifenc');
  const { GIFEncoder, quantize, applyPalette } = encoderModule.GIFEncoder ? encoderModule : encoderModule.default;
  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (frame.width !== width || frame.height !== height || frame.data.length !== width * height * 4) {
      throw new Error('ขนาดภาพ GIF ไม่ตรงกัน');
    }
    onProgress(i + 1, frames.length);
    await new Promise(resolve => setTimeout(resolve, 0));
    const palette = quantize(frame.data, 256);
    gif.writeFrame(applyPalette(frame.data, palette), width, height, { palette, delay: 500, repeat: 0 });
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

export function readGifFrames(photos) {
  if (photos.length < 2) throw new Error('กรุณาถ่ายต่อเนื่องอย่างน้อย 2 ภาพ');
  const canvas = document.createElement('canvas');
  canvas.width = photos[0].width;
  canvas.height = photos[0].height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return photos.map(photo => {
    // Different custom-slot ratios are letterboxed instead of stretching faces.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / photo.width, canvas.height / photo.height);
    const w = photo.width * scale, h = photo.height * scale;
    ctx.drawImage(photo, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
}
