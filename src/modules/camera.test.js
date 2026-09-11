import test from 'node:test';
import assert from 'node:assert/strict';
import { initCamera, switchCamera, stopCamera, getFacingMode, getCurrentStream } from './camera.js';

test('switches front/back with exact constraints, releases tracks, and restores camera on failure', async t => {
  const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalVideo = globalThis.HTMLVideoElement;
  globalThis.HTMLVideoElement = class { setAttribute() {} async play() {} };
  t.after(() => {
    stopCamera();
    Object.defineProperty(globalThis, 'navigator', navDescriptor);
    if (originalVideo === undefined) delete globalThis.HTMLVideoElement;
    else globalThis.HTMLVideoElement = originalVideo;
  });
  t.mock.method(console, 'error', () => {});
  const calls = [], tracks = [];
  let failBack = false;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: {
    async getUserMedia(constraints) {
      assert.ok(tracks.every(track => track.stopped));
      calls.push(constraints);
      const facing = constraints.video.facingMode.exact || constraints.video.facingMode.ideal;
      if (failBack && facing === 'environment') throw new DOMException('No back camera', 'OverconstrainedError');
      const track = { stopped: false, stop() { this.stopped = true; }, getSettings: () => ({ facingMode: facing }) };
      tracks.push(track);
      return { getTracks: () => [track], getVideoTracks: () => [track] };
    }
  } } });
  const video = new HTMLVideoElement();
  await initCamera(video, { facingMode: 'user' });
  await switchCamera(video);
  assert.deepEqual(calls[1].video.facingMode, { exact: 'environment' });
  assert.equal(getFacingMode(), 'environment');
  await switchCamera(video);
  assert.equal(getFacingMode(), 'user');
  failBack = true;
  await assert.rejects(switchCamera(video), /ไม่รองรับ/);
  assert.equal(getFacingMode(), 'user');
  assert.equal(video.srcObject, getCurrentStream());
  video.play = async () => { throw new Error('play failed'); };
  await assert.rejects(initCamera(video), /play failed/);
  assert.equal(getCurrentStream(), null);
  assert.equal(video.srcObject, null);
  assert.ok(tracks.every(track => track.stopped));
});
