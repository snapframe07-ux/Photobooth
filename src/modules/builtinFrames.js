// Aspect-adaptive SVG generator for built-in frames.
// Renders borders, corner ornaments, film sprocket holes, and text with uniform scale
// so vertical photo strips, horizontal grids, and single shots never distort.

const n = value => Number(value.toFixed(2));

function svgWrap(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}" width="${n(w)}" height="${n(h)}">${body}</svg>`;
}

function starPoints(cx, cy, outerR, innerR) {
  const pts = [
    [cx, cy - outerR],
    [cx + innerR, cy - innerR],
    [cx + outerR, cy],
    [cx + innerR, cy + innerR],
    [cx, cy + outerR],
    [cx - innerR, cy + innerR],
    [cx - outerR, cy],
    [cx - innerR, cy - innerR]
  ];
  return pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
}

function renderRetroFilm(w, h, s) {
  const vertical = h > w;
  const holes = [];
  if (vertical) {
    const railW = 46 * s;
    const holeW = 24 * s;
    const holeH = 34 * s;
    const rx = 4 * s;
    const step = 76 * s;
    const padX = (railW - holeW) / 2;
    const margin = 24 * s;
    for (let y = margin; y + holeH <= h - margin + 1; y += step) {
      holes.push(`<rect x="${n(padX)}" y="${n(y)}" width="${n(holeW)}" height="${n(holeH)}" rx="${n(rx)}"/>`);
      holes.push(`<rect x="${n(w - railW + padX)}" y="${n(y)}" width="${n(holeW)}" height="${n(holeH)}" rx="${n(rx)}"/>`);
    }
    return `
      <rect x="0" y="0" width="${n(railW)}" height="${n(h)}" fill="#18181b"/>
      <rect x="${n(w - railW)}" y="0" width="${n(railW)}" height="${n(h)}" fill="#18181b"/>
      <g fill="#ffffff">${holes.join('')}</g>
    `;
  }

  const railH = 60 * s;
  const holeW = 40 * s;
  const holeH = 30 * s;
  const rx = 4 * s;
  const step = 100 * s;
  const padY = (railH - holeH) / 2;
  const margin = 40 * s;
  for (let x = margin; x + holeW <= w - margin + 1; x += step) {
    holes.push(`<rect x="${n(x)}" y="${n(padY)}" width="${n(holeW)}" height="${n(holeH)}" rx="${n(rx)}"/>`);
    holes.push(`<rect x="${n(x)}" y="${n(h - railH + padY)}" width="${n(holeW)}" height="${n(holeH)}" rx="${n(rx)}"/>`);
  }
  return `
    <rect x="0" y="0" width="${n(w)}" height="${n(railH)}" fill="#18181b"/>
    <rect x="0" y="${n(h - railH)}" width="${n(w)}" height="${n(railH)}" fill="#18181b"/>
    <g fill="#ffffff">${holes.join('')}</g>
  `;
}

const FRAME_BUILDERS = {
  'vintage-gold': (w, h, s) => {
    const o = 20 * s;
    const i = 36 * s;
    const c = 60 * s;
    const d = 50 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(20 * s)}" fill="none" stroke="#eab308" stroke-width="${n(16 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" rx="${n(12 * s)}" fill="none" stroke="#fef08a" stroke-width="${n(4 * s)}"/>
      <path d="M ${n(o)},${n(o + d)} L ${n(o + d)},${n(o)} M ${n(w - o)},${n(o + d)} L ${n(w - o - d)},${n(o)} M ${n(o)},${n(h - o - d)} L ${n(o + d)},${n(h - o)} M ${n(w - o)},${n(h - o - d)} L ${n(w - o - d)},${n(h - o)}" stroke="#ca8a04" stroke-width="${n(8 * s)}"/>
      <circle cx="${n(c)}" cy="${n(c)}" r="${n(18 * s)}" fill="#eab308"/>
      <circle cx="${n(w - c)}" cy="${n(c)}" r="${n(18 * s)}" fill="#eab308"/>
      <circle cx="${n(c)}" cy="${n(h - c)}" r="${n(18 * s)}" fill="#eab308"/>
      <circle cx="${n(w - c)}" cy="${n(h - c)}" r="${n(18 * s)}" fill="#eab308"/>
    `;
  },

  'vintage-classic': (w, h, s) => {
    const o = 20 * s;
    const i = 40 * s;
    const c = 50 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(30 * s)}" fill="none" stroke="#f59e0b" stroke-width="${n(16 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" rx="${n(20 * s)}" fill="none" stroke="#ec4899" stroke-width="${n(6 * s)}" stroke-dasharray="${n(16 * s)} ${n(12 * s)}"/>
      <text x="${n(w / 2)}" y="${n(h - 24 * s)}" font-family="sans-serif" font-size="${n(28 * s)}" font-weight="bold" fill="#f59e0b" text-anchor="middle">✨ SnapFrame Memories ✨</text>
      <circle cx="${n(c)}" cy="${n(c)}" r="${n(15 * s)}" fill="#f43f5e"/>
      <circle cx="${n(w - c)}" cy="${n(c)}" r="${n(15 * s)}" fill="#f43f5e"/>
      <circle cx="${n(c)}" cy="${n(h - c)}" r="${n(15 * s)}" fill="#f43f5e"/>
      <circle cx="${n(w - c)}" cy="${n(h - c)}" r="${n(15 * s)}" fill="#f43f5e"/>
    `;
  },

  'neon-cyber': (w, h, s) => {
    const o = 25 * s;
    const i = 40 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(16 * s)}" fill="none" stroke="#06b6d4" stroke-width="${n(12 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" rx="${n(8 * s)}" fill="none" stroke="#ec4899" stroke-width="${n(6 * s)}" stroke-dasharray="${n(24 * s)} ${n(16 * s)}"/>
      <text x="${n(w / 2)}" y="${n(h - 26 * s)}" font-family="monospace" font-size="${n(24 * s)}" font-weight="900" fill="#06b6d4" text-anchor="middle" letter-spacing="${n(3 * s)}">⚡ SNAPFRAME // CYBERPUNK ⚡</text>
    `;
  },

  'floral-bloom': (w, h, s) => {
    const o = 30 * s;
    const c = 60 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(30 * s)}" fill="none" stroke="#f472b6" stroke-width="${n(12 * s)}"/>
      <circle cx="${n(c)}" cy="${n(c)}" r="${n(25 * s)}" fill="#fb7185"/>
      <circle cx="${n(c)}" cy="${n(c)}" r="${n(10 * s)}" fill="#fef08a"/>
      <circle cx="${n(w - c)}" cy="${n(c)}" r="${n(25 * s)}" fill="#fb7185"/>
      <circle cx="${n(w - c)}" cy="${n(c)}" r="${n(10 * s)}" fill="#fef08a"/>
      <circle cx="${n(c)}" cy="${n(h - c)}" r="${n(25 * s)}" fill="#fb7185"/>
      <circle cx="${n(c)}" cy="${n(h - c)}" r="${n(10 * s)}" fill="#fef08a"/>
      <circle cx="${n(w - c)}" cy="${n(h - c)}" r="${n(25 * s)}" fill="#fb7185"/>
      <circle cx="${n(w - c)}" cy="${n(h - c)}" r="${n(10 * s)}" fill="#fef08a"/>
      <text x="${n(w / 2)}" y="${n(h - 26 * s)}" font-family="sans-serif" font-size="${n(26 * s)}" font-style="italic" fill="#db2777" text-anchor="middle">🌸 Bloom with Joy 🌸</text>
    `;
  },

  'retro-film': (w, h, s) => renderRetroFilm(w, h, s),

  'cute-pastel': (w, h, s) => {
    const o = 20 * s;
    const i = 40 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(40 * s)}" fill="none" stroke="#a7f3d0" stroke-width="${n(16 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" rx="${n(30 * s)}" fill="none" stroke="#c084fc" stroke-width="${n(8 * s)}"/>
      <text x="${n(w / 2)}" y="${n(h - 24 * s)}" font-family="sans-serif" font-size="${n(28 * s)}" font-weight="bold" fill="#ec4899" text-anchor="middle">🎀 CUTE MOMENTS 🎀</text>
    `;
  },

  'birthday-party': (w, h, s) => {
    const o = 25 * s;
    const flagW = 70 * s;
    const flagH = 44 * s;
    const leftPts = [
      [o + 40 * s, o], [o + 40 * s + flagW * 0.5, o + flagH], [o + 40 * s + flagW, o],
      [o + 40 * s + flagW * 1.5, o + flagH], [o + 40 * s + flagW * 2, o]
    ].map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
    const rx0 = w - o - 40 * s - flagW * 2;
    const rightPts = [
      [rx0, o], [rx0 + flagW * 0.5, o + flagH], [rx0 + flagW, o],
      [rx0 + flagW * 1.5, o + flagH], [rx0 + flagW * 2, o]
    ].map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(20 * s)}" fill="none" stroke="#f59e0b" stroke-width="${n(14 * s)}"/>
      <polygon points="${leftPts}" fill="#ef4444"/>
      <polygon points="${rightPts}" fill="#3b82f6"/>
      <text x="${n(w / 2)}" y="${n(h - 24 * s)}" font-family="sans-serif" font-size="${n(28 * s)}" font-weight="900" fill="#f59e0b" text-anchor="middle">🎉 HAPPY CELEBRATION 🎉</text>
    `;
  },

  'minimalist-black': (w, h, s) => {
    const o = 24 * s;
    const i = 40 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" fill="none" stroke="#0f172a" stroke-width="${n(20 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" fill="none" stroke="#ffffff" stroke-width="${n(2 * s)}"/>
      <text x="${n(w - 48 * s)}" y="${n(h - 24 * s)}" font-family="monospace" font-size="${n(20 * s)}" fill="#94a3b8" text-anchor="end">SNAPFRAME • EDITION 2026</text>
    `;
  },

  'comic-pop': (w, h, s) => {
    const o = 20 * s;
    const i = 34 * s;
    const tri = 80 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(10 * s)}" fill="none" stroke="#000000" stroke-width="${n(14 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" rx="${n(4 * s)}" fill="none" stroke="#facc15" stroke-width="${n(8 * s)}"/>
      <path d="M ${n(o + 6 * s)},${n(o + 6 * s)} L ${n(o + 6 * s + tri)},${n(o + 6 * s)} L ${n(o + 6 * s)},${n(o + 6 * s + tri)} Z" fill="#ef4444" stroke="#000000" stroke-width="${n(4 * s)}"/>
      <path d="M ${n(w - o - 6 * s)},${n(o + 6 * s)} L ${n(w - o - 6 * s - tri)},${n(o + 6 * s)} L ${n(w - o - 6 * s)},${n(o + 6 * s + tri)} Z" fill="#3b82f6" stroke="#000000" stroke-width="${n(4 * s)}"/>
      <text x="${n(w / 2)}" y="${n(h - 24 * s)}" font-family="impact, sans-serif" font-size="${n(30 * s)}" fill="#ef4444" stroke="#000000" stroke-width="${n(1.8 * s)}" text-anchor="middle">💥 POP ART VIBES 💥</text>
    `;
  },

  'love-romance': (w, h, s) => {
    const o = 25 * s;
    const cx = w / 2;
    const hy = 22 * s;
    const hs = 0.7 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(30 * s)}" fill="none" stroke="#f43f5e" stroke-width="${n(12 * s)}"/>
      <g transform="translate(${n(cx)}, ${n(hy)}) scale(${n(hs)})">
        <path d="M 0 20 C -20 0, -60 0, -80 20 C -100 40, -80 70, 0 120 C 80 70, 100 40, 80 20 C 60 0, 20 0, 0 20 Z" fill="#f43f5e"/>
      </g>
      <text x="${n(w / 2)}" y="${n(h - 24 * s)}" font-family="sans-serif" font-size="${n(26 * s)}" font-weight="bold" fill="#f43f5e" text-anchor="middle">❤️ Forever &amp; Always ❤️</text>
    `;
  },

  'festive-sparkle': (w, h, s) => {
    const o = 25 * s;
    const c = 64 * s;
    const outerR = 26 * s;
    const innerR = 9 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(20 * s)}" fill="none" stroke="#a855f7" stroke-width="${n(12 * s)}"/>
      <polygon points="${starPoints(c, c, outerR, innerR)}" fill="#fef08a"/>
      <polygon points="${starPoints(w - c, c, outerR, innerR)}" fill="#fef08a"/>
      <polygon points="${starPoints(c, h - c, outerR, innerR)}" fill="#fef08a"/>
      <polygon points="${starPoints(w - c, h - c, outerR, innerR)}" fill="#fef08a"/>
      <text x="${n(w / 2)}" y="${n(h - 24 * s)}" font-family="sans-serif" font-size="${n(26 * s)}" font-weight="900" fill="#c084fc" text-anchor="middle">✨ SHINE LIKE A STAR ✨</text>
    `;
  },

  'y2k-chrome': (w, h, s) => {
    const o = 18 * s;
    const i = 34 * s;
    const c = 68 * s;
    return `
      <defs>
        <linearGradient id="y2kGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e0f2fe"/>
          <stop offset="50%" stop-color="#c084fc"/>
          <stop offset="100%" stop-color="#f472b6"/>
        </linearGradient>
      </defs>
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(28 * s)}" fill="none" stroke="url(#y2kGrad)" stroke-width="${n(24 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" rx="${n(18 * s)}" fill="none" stroke="#ffffff" stroke-width="${n(4 * s)}" stroke-opacity="0.85"/>
      <polygon points="${starPoints(c, c, 24 * s, 6 * s)}" fill="#ffffff"/>
      <polygon points="${starPoints(w - c, h - c, 24 * s, 6 * s)}" fill="#ffffff"/>
      <text x="${n(w / 2)}" y="${n(h - 20 * s)}" font-family="sans-serif" font-weight="800" font-size="${n(18 * s)}" letter-spacing="${n(4 * s)}" fill="#a855f7" text-anchor="middle">✦ Y2K SNAPFRAME ✦</text>
    `;
  },

  'polaroid-cream': (w, h, s) => {
    const o = 16 * s;
    const m = 32 * s;
    const i = 44 * s;
    return `
      <rect x="${n(o)}" y="${n(o)}" width="${n(w - o * 2)}" height="${n(h - o * 2)}" rx="${n(12 * s)}" fill="none" stroke="#faf7f2" stroke-width="${n(28 * s)}"/>
      <rect x="${n(m)}" y="${n(m)}" width="${n(w - m * 2)}" height="${n(h - m * 2)}" rx="${n(6 * s)}" fill="none" stroke="#e7dfd3" stroke-width="${n(4 * s)}"/>
      <rect x="${n(i)}" y="${n(i)}" width="${n(w - i * 2)}" height="${n(h - i * 2)}" fill="none" stroke="#d6cbb9" stroke-width="${n(2 * s)}" stroke-dasharray="${n(10 * s)} ${n(8 * s)}"/>
      <text x="${n(w / 2)}" y="${n(h - 20 * s)}" font-family="Georgia, serif" font-style="italic" font-size="${n(22 * s)}" fill="#7c6f5e" text-anchor="middle">SnapFrame · Memories</text>
    `;
  }
};

export function isBuiltinFrame(frameId) {
  return typeof frameId === 'string' && Object.prototype.hasOwnProperty.call(FRAME_BUILDERS, frameId);
}

export function buildBuiltinFrameSvg(frameId, width, height) {
  const builder = FRAME_BUILDERS[frameId];
  if (!builder) return null;
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const s = Math.min(w / 1280, h / 720);
  return svgWrap(w, h, builder(w, h, s));
}

export function buildBuiltinFrameDataUrl(frameId, width, height) {
  const svg = buildBuiltinFrameSvg(frameId, width, height);
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
}
