import { filteredSource } from './imageFilters.js';

function isDarkHex(color) {
  if (typeof color !== 'string') return false;
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

export function formatStripDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export function buildStripFooterText({ footerText = 'SnapFrame', showDate = false, date = new Date() } = {}) {
  const text = typeof footerText === 'string' ? footerText.trim() : '';
  const dateStr = showDate ? formatStripDate(date) : '';
  if (dateStr && text) return `${dateStr} · ${text}`;
  return dateStr || text;
}

const BG_GRADIENTS = {
  'gradient-pastel': ['#FFE4EC', '#EDE9FE', '#DFF2F3'],
  'gradient-sunset': ['#FDE68A', '#FBCFE8', '#C4B5FD'],
  'gradient-mint': ['#D1FAE5', '#E0F2FE', '#EDE9FE'],
  'gradient-night': ['#1E1B4B', '#312E81', '#4C1D95']
};

function paintStripBackground(ctx, width, height, bgColor, bgPattern) {
  if (BG_GRADIENTS[bgPattern] && typeof ctx.createLinearGradient === 'function') {
    const stops = BG_GRADIENTS[bgPattern];
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.5, stops[1]);
    grad.addColorStop(1, stops[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  if (bgPattern === 'checker') {
    const tile = Math.max(24, Math.round(width * 0.04));
    ctx.fillStyle = isDarkHex(bgColor) ? 'rgba(255,255,255,0.12)' : 'rgba(176,36,85,0.09)';
    for (let y = 0; y < height; y += tile) {
      for (let x = 0; x < width; x += tile) {
        if (((Math.floor(x / tile) + Math.floor(y / tile)) % 2) === 0) {
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }
  } else if (bgPattern === 'dots' && typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function') {
    const step = Math.max(28, Math.round(width * 0.045));
    const r = Math.max(4, Math.round(step * 0.16));
    ctx.fillStyle = isDarkHex(bgColor) ? 'rgba(255,255,255,0.16)' : 'rgba(176,36,85,0.13)';
    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// A single layout shared by the frame preview and the exported photo strip.
export function getStripLayout(count, width = 960, aspect = 4 / 3, orientation = 'vertical') {
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new Error('Photo Strip ต้องมี 1–4 ภาพ');
  }
  const padding = Math.round(width * 0.035);
  const gap = Math.round(width * 0.025);
  const horizontal = orientation === 'horizontal';
  const columns = horizontal ? (count === 4 ? 2 : count) : 1;
  const rows = Math.ceil(count / columns);
  const photoWidth = (width - padding * 2 - (columns - 1) * gap) / columns;
  const photoHeight = Math.round(photoWidth / aspect);
  return {
    width,
    height: padding * 3 + rows * photoHeight + (rows - 1) * gap,
    slots: Array.from({ length: count }, (_, i) => ({
      x: padding + (i % columns) * (photoWidth + gap),
      y: padding + Math.floor(i / columns) * (photoHeight + gap),
      width: photoWidth, height: photoHeight
    }))
  };
}

export function composePhotoStrip(frames, decoration, aspect = 4 / 3, frameLayout = null, orientation = 'vertical', options = {}) {
  const {
    bgColor = '#FFF5F7',
    bgPattern = 'solid',
    filter = 'none',
    footerText = 'SnapFrame',
    showDate = false,
    footerFont = 'sans-serif'
  } = options || {};
  const layout = frameLayout || getStripLayout(frames.length, 960, aspect, orientation);
  if (layout.slots.length !== frames.length) throw new Error('จำนวนภาพไม่ตรงกับช่องในกรอบ');
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  paintStripBackground(ctx, canvas.width, canvas.height, bgColor, bgPattern);
  const hasFilter = Boolean(filter && filter !== 'none');
  const nativeFilter = 'filter' in ctx;
  layout.slots.forEach((slot, i) => {
    let photo = frames[i];
    if (hasFilter) {
      ctx.save?.();
      if (nativeFilter) ctx.filter = filter;
      else photo = filteredSource(photo, filter);
    }
    if (frameLayout) {
      // Cover each opening without stretching the subject.
      const scale = Math.max(slot.width / photo.width, slot.height / photo.height);
      const sw = slot.width / scale, sh = slot.height / scale;
      ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh,
        slot.x, slot.y, slot.width, slot.height);
    } else {
      ctx.drawImage(photo, slot.x, slot.y, slot.width, slot.height);
    }
    if (hasFilter) {
      if (nativeFilter) ctx.filter = 'none';
      ctx.restore?.();
    }
  });
  const isDarkBg = bgPattern === 'gradient-night' || (bgPattern !== 'gradient-pastel' && bgPattern !== 'gradient-sunset' && bgPattern !== 'gradient-mint' && isDarkHex(bgColor));
  const caption = buildStripFooterText({ footerText, showDate });
  if (!frameLayout && caption) {
    ctx.fillStyle = isDarkBg ? '#E2E8F0' : '#936575';
    ctx.font = `600 20px ${footerFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(caption, canvas.width / 2, canvas.height - 16);
  }
  if (decoration) ctx.drawImage(decoration, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function drawScaledLayers(ctx, layers, sourceSize, targetW, targetH) {
  if (!layers?.length || !sourceSize?.width || !sourceSize?.height) return;
  const s = Math.min(targetW / sourceSize.width, targetH / sourceSize.height);
  for (const layer of layers) {
    if (!layer?.image) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.translate((layer.x / sourceSize.width) * targetW, (layer.y / sourceSize.height) * targetH);
    ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
    if (layer.mirror && typeof ctx.scale === 'function') ctx.scale(-1, 1);
    const dw = layer.width * s * (layer.scaleX || 1) * (layer.scale || 1);
    const dh = layer.height * s * (layer.scaleY || 1) * (layer.scale || 1);
    ctx.drawImage(layer.image, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}
