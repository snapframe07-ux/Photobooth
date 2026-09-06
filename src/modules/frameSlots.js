// Find enclosed transparent openings; ignore transparent outer margins and tiny decoration.
export function detectFrameSlots({ data, width, height }) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const slots = [];
  for (let seed = 0; seed < total; seed++) {
    if (visited[seed] || data[seed * 4 + 3] >= 128) continue;
    let head = 0, tail = 1;
    queue[0] = seed;
    visited[seed] = 1;
    let minX = width, minY = height, maxX = 0, maxY = 0, touchesEdge = false;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width, y = Math.floor(pixel / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      if (!x || !y || x === width - 1 || y === height - 1) touchesEdge = true;
      const visit = next => {
        if (!visited[next] && data[next * 4 + 3] < 128) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      };
      if (x > 0) visit(pixel - 1);
      if (x + 1 < width) visit(pixel + 1);
      if (y > 0) visit(pixel - width);
      if (y + 1 < height) visit(pixel + width);
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    if (!touchesEdge && tail >= total * 0.015 && w >= width * 0.12
      && h >= height * 0.06 && tail / (w * h) >= 0.45) {
      slots.push({ x: minX, y: minY, width: w, height: h });
    }
  }
  return slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

export function getFrameLayout(imageData) {
  const slots = detectFrameSlots(imageData);
  if (!slots.length || slots.length > 4) {
    throw new Error('กรุณาใช้กรอบที่มีช่องภาพปิดล้อมชัดเจน 1–4 ช่อง ระบบยังจัดตำแหน่งกรอบนี้อัตโนมัติไม่ได้');
  }
  const scale = Math.min(960 / imageData.width, 4096 / imageData.height);
  return {
    width: Math.round(imageData.width * scale),
    height: Math.round(imageData.height * scale),
    slots: slots.map(slot => Object.fromEntries(Object.entries(slot).map(([key, value]) => [key, value * scale])))
  };
}
