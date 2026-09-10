// Persist only the transparent decoration, never the captured photo or a session blob URL.
export function serializeCaptureFrame(frame, decoration, outputLayout) {
  if (!frame || !decoration) return null;
  const canvas = document.createElement('canvas');
  canvas.width = outputLayout.width;
  canvas.height = outputLayout.height;
  canvas.getContext('2d').drawImage(decoration, 0, 0, canvas.width, canvas.height);
  return {
    name: frame.name,
    src: canvas.toDataURL('image/png'),
    layout: frame.layout ? structuredClone(outputLayout) : null
  };
}

export function restoreCaptureFrame(saved, count) {
  if (!saved) return null;
  if (typeof saved.src !== 'string' || !saved.src.startsWith('data:image/png;base64,')) {
    throw new Error('รูปกรอบในเทมเพลตไม่สมบูรณ์ กรุณาให้เจ้าของบันทึกเทมเพลตใหม่');
  }
  const layout = saved.layout;
  if (layout) {
    if (!Number.isFinite(layout.width) || !Number.isFinite(layout.height)
      || layout.width <= 0 || layout.height <= 0 || layout.width > 4096 || layout.height > 4096
      || !Array.isArray(layout.slots) || layout.slots.length !== count
      || layout.slots.some(s => !s || ![s.x, s.y, s.width, s.height].every(Number.isFinite)
        || s.x < 0 || s.y < 0 || s.width <= 0 || s.height <= 0
        || s.x + s.width > layout.width + 1 || s.y + s.height > layout.height + 1)) {
      throw new Error('ช่องภาพของกรอบไม่ตรงกับเทมเพลต กรุณาบันทึกเทมเพลตใหม่');
    }
  }
  return { id: 'template-capture-frame', name: saved.name || 'กรอบเทมเพลต', src: saved.src,
    layout: layout ? structuredClone(layout) : null };
}
