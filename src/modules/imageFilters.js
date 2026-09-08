// Pixel fallback for browsers without Canvas 2D filters.
export function filterPixels(data, filter) {
  for (const [, name, raw] of filter.matchAll(/([\w-]+)\(([^)]+)\)/g)) {
    let v = parseFloat(raw);
    if (raw.includes('%')) v /= 100;
    const c = Math.cos(v * Math.PI / 180), s = Math.sin(v * Math.PI / 180);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let out;
      if (name === 'brightness') out = [r * v, g * v, b * v];
      else if (name === 'contrast') out = [r, g, b].map(x => (x - 127.5) * v + 127.5);
      else if (name === 'grayscale' || name === 'saturate') {
        const t = name === 'grayscale' ? 1 - Math.min(1, v) : v;
        const l = .2126 * r + .7152 * g + .0722 * b;
        out = [r, g, b].map(x => l + t * (x - l));
      } else if (name === 'sepia') {
        v = Math.min(1, v);
        out = [r * (1 - v) + v * (.393*r + .769*g + .189*b),
          g * (1 - v) + v * (.349*r + .686*g + .168*b),
          b * (1 - v) + v * (.272*r + .534*g + .131*b)];
      } else if (name === 'hue-rotate') {
        out = [(.213+.787*c-.213*s)*r + (.715-.715*c-.715*s)*g + (.072-.072*c+.928*s)*b,
          (.213-.213*c+.143*s)*r + (.715+.285*c+.140*s)*g + (.072-.072*c-.283*s)*b,
          (.213-.213*c-.787*s)*r + (.715-.715*c+.715*s)*g + (.072+.928*c+.072*s)*b];
      }
      if (out) { data[i] = out[0]; data[i + 1] = out[1]; data[i + 2] = out[2]; }
    }
  }
  return data;
}

export function applyPixelFilter(canvas, filter) {
  if (!filter || filter === 'none') return;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  filterPixels(pixels.data, filter);
  ctx.putImageData(pixels, 0, 0);
}

const cache = new WeakMap();
export function filteredSource(source, filter) {
  const previous = cache.get(source);
  if (previous?.filter === filter) return previous.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth || source.width;
  canvas.height = source.naturalHeight || source.height;
  canvas.getContext('2d').drawImage(source, 0, 0);
  applyPixelFilter(canvas, filter);
  cache.set(source, { filter, canvas });
  return canvas;
}
