// Live Strip / Video Photobooth encoder (Life4Cuts-style animated photo strip).
// Combines per-shot short frame clips into a single strip video (MP4/WebM) with all editor decorations.

import { composePhotoStrip, drawScaledLayers } from './photoStrip.js';

export function pickSupportedVideoMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

export async function exportLiveStripVideo(shotClips, config, onProgress = () => {}) {
  if (!Array.isArray(shotClips) || !shotClips.length || shotClips.some(c => !c?.length)) {
    throw new Error('ไม่มีคลิปภาพเคลื่อนไหวสำหรับสร้างวิดีโอ Live Strip');
  }
  const mimeType = pickSupportedVideoMimeType();
  if (mimeType === null) {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับการบันทึกวิดีโอ (MediaRecorder)');
  }

  const {
    decoration = null,
    aspectRatio = 4 / 3,
    frameLayout = null,
    stripOrientation = 'vertical',
    stripOptions = {},
    stickers = [],
    doodle = null,
    sourceSize = null,
    fps = 12,
    loops = 2
  } = config || {};

  // Build first frame to determine output dimensions (scale down to max 1080px tall for smooth encoding)
  const firstFrameSet = shotClips.map(clip => clip[0]);
  const probe = composePhotoStrip(firstFrameSet, decoration, aspectRatio, frameLayout, stripOrientation, stripOptions);
  const scale = Math.min(1, 1080 / Math.max(probe.width, probe.height));
  const outW = Math.max(2, Math.round((probe.width * scale) / 2) * 2);
  const outH = Math.max(2, Math.round((probe.height * scale) / 2) * 2);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext('2d');

  if (typeof outCanvas.captureStream !== 'function') {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับการสร้างสตรีมวิดีโอจาก Canvas');
  }

  const stream = outCanvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }));
    recorder.onerror = e => reject(new Error(e.error?.message || 'บันทึกวิดีโอไม่สำเร็จ'));
  });

  const maxClipLen = Math.max(...shotClips.map(c => c.length));
  const totalSteps = maxClipLen * loops;
  const stepMs = Math.round(1000 / fps);
  const cachedFrames = new Array(maxClipLen);

  recorder.start();
  try {
    for (let step = 0; step < totalSteps; step++) {
      const idx = step % maxClipLen;
      ctx.clearRect(0, 0, outW, outH);
      if (cachedFrames[idx]) {
        ctx.drawImage(cachedFrames[idx], 0, 0);
      } else {
        const frameSet = shotClips.map(clip => clip[Math.min(idx, clip.length - 1)]);
        const composed = composePhotoStrip(frameSet, decoration, aspectRatio, frameLayout, stripOrientation, stripOptions);
        ctx.drawImage(composed, 0, 0, outW, outH);
        drawScaledLayers(ctx, stickers, sourceSize, outW, outH);
        if (doodle) ctx.drawImage(doodle, 0, 0, outW, outH);
        if (loops > 1) {
          const snap = document.createElement('canvas');
          snap.width = outW;
          snap.height = outH;
          snap.getContext('2d').drawImage(outCanvas, 0, 0);
          cachedFrames[idx] = snap;
        }
      }

      onProgress(step + 1, totalSteps);
      await new Promise(resolve => setTimeout(resolve, stepMs));
    }
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    stream.getTracks?.().forEach(track => track.stop?.());
  }

  const blob = await stopped;
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  return { blob, ext };
}
