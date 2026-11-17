import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePhotoGif, snapshotGifFrame, readGifFrames } from './photoGif.js';

test('snapshotGifFrame and readGifFrames overlay the selected frame onto each GIF frame', () => {
  const calls = [];
  const ctx = {
    fillRect() {},
    drawImage(...args) { calls.push(args); },
    getImageData: (x, y, width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })
  };
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const shot = { width: 1280, height: 960 };
    const snap = snapshotGifFrame(shot, 'strip-frame');
    assert.equal(snap.width, 640);
    assert.equal(snap.height, 480);
    assert.deepEqual(calls, [
      [shot, 0, 0, 640, 480],
      ['strip-frame', 0, 0, 640, 480]
    ]);
    calls.length = 0;
    const frames = readGifFrames([{ width: 320, height: 240 }, { width: 320, height: 240 }], 'editor-frame');
    assert.equal(frames.length, 2);
    assert.deepEqual(calls, [
      [{ width: 320, height: 240 }, 0, 0, 320, 240],
      ['editor-frame', 0, 0, 320, 240],
      [{ width: 320, height: 240 }, 0, 0, 320, 240],
      ['editor-frame', 0, 0, 320, 240]
    ]);
  } finally {
    delete globalThis.document;
  }
});

test('encodes a looping GIF with two complete frames and half-second delays', async () => {
  const frame = color => ({ width: 2, height: 2, data: new Uint8ClampedArray(Array(4).fill([...color, 255]).flat()) });
  const progress = [];
  const blob = await encodePhotoGif([frame([255, 0, 0]), frame([0, 0, 255])], i => progress.push(i));
  assert.equal(blob.type, 'image/gif');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 6)), 'GIF89a');
  assert.equal(bytes[6] | bytes[7] << 8, 2);
  assert.equal(bytes[8] | bytes[9] << 8, 2);
  let p = 13 + (bytes[10] & 128 ? 3 * (2 ** ((bytes[10] & 7) + 1)) : 0);
  let images = 0, loop = false;
  const delays = [];
  const skipBlocks = () => { while (bytes[p]) p += bytes[p] + 1; p++; };
  while (bytes[p] !== 0x3b) {
    const marker = bytes[p++];
    if (marker === 0x21) {
      const label = bytes[p++];
      if (label === 0xf9) delays.push(bytes[p + 2] | bytes[p + 3] << 8);
      if (label === 0xff) {
        assert.equal(new TextDecoder().decode(bytes.slice(p + 1, p + 12)), 'NETSCAPE2.0');
        assert.equal(bytes[p + 14] | bytes[p + 15] << 8, 0);
        loop = true;
      }
      skipBlocks();
    } else {
      assert.equal(marker, 0x2c);
      const packed = bytes[p + 8];
      p += 9;
      if (packed & 128) p += 3 * (2 ** ((packed & 7) + 1));
      p++; // LZW minimum code size.
      skipBlocks();
      images++;
    }
    assert.ok(p < bytes.length);
  }
  assert.equal(images, 2);
  assert.equal(loop, true);
  assert.deepEqual(delays, [50, 50]);
  assert.deepEqual(progress, [1, 2]);
  await assert.rejects(encodePhotoGif([]), /2–4/);
  await assert.rejects(encodePhotoGif([frame([0, 0, 0])]), /2–4/);
  await assert.rejects(encodePhotoGif([frame([0, 0, 0]), { ...frame([0, 0, 0]), width: 3 }]), /ไม่ตรงกัน/);
});

test('readGifFrames composites scaled stickers onto each GIF frame', () => {
  const ops = [];
  const ctx = {
    fillRect() {},
    save() { ops.push(['save']); },
    restore() { ops.push(['restore']); },
    translate(x, y) { ops.push(['translate', x, y]); },
    rotate(rad) { ops.push(['rotate', Math.round(rad * 100) / 100]); },
    drawImage(...args) { ops.push(['drawImage', ...args]); },
    getImageData: (x, y, width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })
  };
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const sticker = { image: 'star-img', x: 320, y: 240, width: 100, height: 100, rotation: 90, opacity: 0.8 };
    const frames = readGifFrames(
      [{ width: 320, height: 240 }, { width: 320, height: 240 }],
      null,
      [sticker],
      { width: 640, height: 480 }
    );
    assert.equal(frames.length, 2);
    assert.ok(ops.some(op => op[0] === 'translate' && op[1] === 160 && op[2] === 120));
    assert.ok(ops.some(op => op[0] === 'drawImage' && op[1] === 'star-img' && op[4] === 50 && op[5] === 50));
  } finally {
    delete globalThis.document;
  }
});
