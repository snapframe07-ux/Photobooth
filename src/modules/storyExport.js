// Exports a composed Photo Strip onto a 9:16 (1080x1920) vertical canvas ready for IG Story / TikTok.

export function composeStoryCanvas(stripCanvas, options = {}) {
  if (!stripCanvas || !stripCanvas.width || !stripCanvas.height) {
    throw new Error('ไม่มีภาพสำหรับสร้าง IG Story');
  }
  const {
    width = 1080,
    height = 1920,
    bgStyle = 'blur', // 'blur' | 'matching' | 'dark'
    bgColor = '#FFF5F7'
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Paint 9:16 Background
  if (bgStyle === 'blur') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    ctx.save?.();
    if ('filter' in ctx) ctx.filter = 'blur(38px) brightness(0.88)';
    const coverScale = Math.max(width / stripCanvas.width, height / stripCanvas.height) * 1.15;
    const bw = stripCanvas.width * coverScale;
    const bh = stripCanvas.height * coverScale;
    ctx.drawImage(stripCanvas, (width - bw) / 2, (height - bh) / 2, bw, bh);
    ctx.restore?.();
    ctx.fillStyle = 'rgba(255, 245, 247, 0.28)';
    ctx.fillRect(0, 0, width, height);
  } else if (bgStyle === 'dark') {
    if (typeof ctx.createLinearGradient === 'function') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#18181B');
      grad.addColorStop(0.5, '#2B2233');
      grad.addColorStop(1, '#3B1D36');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#18181B';
    }
    ctx.fillRect(0, 0, width, height);
  } else {
    // 'matching'
    if (typeof ctx.createLinearGradient === 'function') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, bgColor);
      grad.addColorStop(1, '#EDE4FC');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Fit Photo Strip centered inside safe 9:16 margins
  const maxW = width * 0.82;
  const maxH = height * 0.84;
  const fitScale = Math.min(maxW / stripCanvas.width, maxH / stripCanvas.height);
  const drawW = Math.round(stripCanvas.width * fitScale);
  const drawH = Math.round(stripCanvas.height * fitScale);
  const dx = Math.round((width - drawW) / 2);
  const dy = Math.round((height - drawH) / 2);

  ctx.save?.();
  ctx.shadowColor = 'rgba(24, 24, 27, 0.34)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(stripCanvas, dx, dy, drawW, drawH);
  ctx.restore?.();

  return canvas;
}
