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

export function composePhotoStrip(frames, decoration, aspect = 4 / 3, frameLayout = null, orientation = 'vertical') {
  const layout = frameLayout || getStripLayout(frames.length, 960, aspect, orientation);
  if (layout.slots.length !== frames.length) throw new Error('จำนวนภาพไม่ตรงกับช่องในกรอบ');
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFF5F7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  layout.slots.forEach((slot, i) => {
    const photo = frames[i];
    if (frameLayout) {
      // Cover each opening without stretching the subject.
      const scale = Math.max(slot.width / photo.width, slot.height / photo.height);
      const sw = slot.width / scale, sh = slot.height / scale;
      ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh,
        slot.x, slot.y, slot.width, slot.height);
    } else {
      ctx.drawImage(photo, slot.x, slot.y, slot.width, slot.height);
    }
  });
  ctx.fillStyle = '#936575';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  if (!frameLayout) ctx.fillText('SnapFrame', canvas.width / 2, canvas.height - 14);
  if (decoration) ctx.drawImage(decoration, 0, 0, canvas.width, canvas.height);
  return canvas;
}
