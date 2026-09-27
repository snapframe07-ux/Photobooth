export function isMobilePhotoDevice(device = navigator) {
  return device.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod/i.test(device.userAgent || '')
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
}

// Keep file creation synchronous so the share sheet retains the button's user activation.
function photoFile(dataUrl, filename = 'snapframe-photo.png') {
  const [header, body] = dataUrl.split(',');
  const mime = /^data:(image\/[\w.+-]+);base64$/.exec(header)?.[1];
  if (!mime || !body) throw new Error('ข้อมูลรูปภาพไม่ถูกต้อง');
  const bytes = Uint8Array.from(atob(body), char => char.charCodeAt(0));
  return new File([bytes], filename, { type: mime });
}

export async function copyPhoto(dataUrl) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined'
    || (ClipboardItem.supports && !ClipboardItem.supports('image/png'))) return 'unsupported';
  const file = photoFile(dataUrl);
  if (file.type !== 'image/png') throw new Error('กรุณาคัดลอกภาพในรูปแบบ PNG');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]);
  return 'copied';
}

export async function sharePhoto(dataUrl, filename = 'snapframe-photo.png') {
  const file = photoFile(dataUrl, filename);
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (error) {
    if (error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}
