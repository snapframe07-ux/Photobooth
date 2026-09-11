// Embed only decorations: session URLs and private/signed URLs cannot travel with a template.
export function serializeLayerSource(layer) {
  if (layer.type === 'base') return null;
  const image = layer.image;
  const width = image?.naturalWidth || image?.width;
  const height = image?.naturalHeight || image?.height;
  if (!width || !height) throw new Error('สติกเกอร์หรือกรอบยังโหลดไม่ครบ กรุณาลองบันทึกอีกครั้ง');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0);
  try {
    return canvas.toDataURL('image/png');
  } catch {
    throw new Error('บันทึกภาพสติกเกอร์หรือกรอบไม่ได้ กรุณาอัปโหลดภาพต้นฉบับแล้วบันทึกเทมเพลตใหม่');
  }
}
