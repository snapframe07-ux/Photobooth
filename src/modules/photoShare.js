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

export async function printPhoto(dataUrl, win = globalThis.window, doc = globalThis.document) {
  photoFile(dataUrl);
  if (typeof win?.print !== 'function' || !doc?.body) return 'unsupported';
  let mount = doc.querySelector('#printMount');
  if (!mount) {
    mount = doc.createElement('div');
    mount.id = 'printMount';
    mount.className = 'print-mount';
    const img = doc.createElement('img');
    img.id = 'printImage';
    img.alt = 'ภาพสำหรับพิมพ์';
    mount.append(img);
    doc.body.append(mount);
  }
  const img = mount.querySelector('img');
  img.removeAttribute?.('src');
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('โหลดภาพสำหรับพิมพ์ไม่สำเร็จ'));
    img.src = dataUrl;
  });
  if (typeof img.decode === 'function') {
    try { await img.decode(); } catch (_) {}
  }
  win.print();
  return 'printed';
}
