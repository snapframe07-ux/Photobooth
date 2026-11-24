import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSupportedVideoMimeType, exportLiveStripVideo } from './liveStripVideo.js';

test('pickSupportedVideoMimeType picks first supported video codec and handles missing MediaRecorder', () => {
  const prev = globalThis.MediaRecorder;
  try {
    delete globalThis.MediaRecorder;
    assert.equal(pickSupportedVideoMimeType(), null);

    globalThis.MediaRecorder = {
      isTypeSupported: type => type === 'video/webm;codecs=vp9'
    };
    assert.equal(pickSupportedVideoMimeType(), 'video/webm;codecs=vp9');
  } finally {
    if (prev === undefined) delete globalThis.MediaRecorder;
    else globalThis.MediaRecorder = prev;
  }
});

test('exportLiveStripVideo validates input, caches frames across loops, and stops stream tracks', async () => {
  await assert.rejects(exportLiveStripVideo([], {}), /ไม่มีคลิป/);
  await assert.rejects(exportLiveStripVideo([[]], {}), /ไม่มีคลิป/);

  const prevDoc = globalThis.document;
  const prevRec = globalThis.MediaRecorder;
  let tracksStopped = 0;
  let canvasesCreated = 0;

  const makeMockCanvas = () => {
    canvasesCreated++;
    const ctx = {
      clearRect() {},
      fillRect() {},
      fillText() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      drawImage() {}
    };
    return {
      width: 0,
      height: 0,
      getContext: () => ctx,
      captureStream: () => ({
        getTracks: () => [{ stop: () => { tracksStopped++; } }]
      })
    };
  };

  class FakeRecorder {
    static isTypeSupported(type) { return type === 'video/mp4'; }
    constructor(_stream, opts) {
      this.mimeType = opts?.mimeType || 'video/mp4';
      this.state = 'inactive';
    }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['video-bytes'], { type: this.mimeType }) });
      this.onstop?.();
    }
  }

  globalThis.document = { createElement: () => makeMockCanvas() };
  globalThis.MediaRecorder = FakeRecorder;

  try {
    const shotA = [{ width: 400, height: 300 }, { width: 400, height: 300 }];
    const shotB = [{ width: 400, height: 300 }]; // shorter clip should clamp to last frame
    const progress = [];
    const result = await exportLiveStripVideo(
      [shotA, shotB],
      { fps: 1000, loops: 2 },
      (cur, total) => progress.push([cur, total])
    );

    assert.equal(result.ext, 'mp4');
    assert.equal(result.blob.type, 'video/mp4');
    assert.deepEqual(progress, [[1, 4], [2, 4], [3, 4], [4, 4]]);
    assert.equal(tracksStopped, 1);
    // 1 probe + 1 outCanvas + 2 first-loop composed + 2 cached snapshots = 6 (loop 2 reuses cache)
    assert.equal(canvasesCreated, 6);
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
    if (prevRec === undefined) delete globalThis.MediaRecorder;
    else globalThis.MediaRecorder = prevRec;
  }
});
