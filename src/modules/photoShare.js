// Keep file creation synchronous so the share sheet retains the button's user activation.
export async function sharePhoto(dataUrl, filename = 'snapframe-photo.png') {
  const [header, body] = dataUrl.split(',');
  const mime = /^data:(image\/[\w.+-]+);base64$/.exec(header)?.[1];
  if (!mime || !body) throw new Error('ข้อมูลรูปภาพไม่ถูกต้อง');
  const bytes = Uint8Array.from(atob(body), char => char.charCodeAt(0));
  const file = new File([bytes], filename, { type: mime });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (error) {
    if (error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}
