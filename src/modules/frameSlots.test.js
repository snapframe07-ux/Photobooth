import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFrameSlots, getFrameLayout, clearFrameRectangle } from './frameSlots.js';
import { composePhotoStrip } from './photoStrip.js';

function makeFrame(width = 100, height = 240) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const clear = (x, y, w, h) => {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) data[(row * width + col) * 4 + 3] = 0;
    }
  };
  return { data, width, height, clear };
}

test('detects unequal openings in top-to-bottom order, ignoring outer transparency and tiny holes', () => {
  const frame = makeFrame();
  frame.clear(0, 0, 100, 3);
  frame.clear(4, 4, 2, 2);
  const slots = [
    { x: 10, y: 15, width: 80, height: 45 },
    { x: 20, y: 80, width: 60, height: 70 },
    { x: 12, y: 170, width: 75, height: 50 }
  ];
  for (const slot of slots) frame.clear(slot.x, slot.y, slot.width, slot.height);
  assert.deepEqual(detectFrameSlots(frame), slots);
  const layout = getFrameLayout(frame);
  assert.equal(layout.width / layout.height, frame.width / frame.height);
  assert.equal(layout.slots.length, 3);
  layout.slots.forEach((slot, index) => {
    assert.ok(Math.abs(slot.x / layout.width - slots[index].x / frame.width) < 1e-10);
    assert.ok(Math.abs(slot.height / layout.height - slots[index].height / frame.height) < 1e-10);
  });
});

test('rejects opaque frames, open outer areas, and more than four slots', () => {
  const frame = makeFrame();
  assert.throws(() => getFrameLayout(frame));
  frame.clear(0, 0, 100, 240);
  assert.throws(() => getFrameLayout(frame));
  const five = makeFrame();
  for (let i = 0; i < 5; i++) five.clear(10, 10 + i * 45, 80, 30);
  assert.throws(() => getFrameLayout(five));
});

test('custom frame export preserves frame proportions and uses centered cover crops in its exact slots', () => {
  const calls = [];
  const ctx = { fillRect() {}, fillText() { throw new Error('Custom art must not get extra branding'); }, drawImage(...args) { calls.push(args); } };
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const layout = { width: 600, height: 1400, slots: [
      { x: 25, y: 100, width: 550, height: 400 },
      { x: 75, y: 650, width: 450, height: 600 }
    ] };
    const photos = [{ width: 1280, height: 720 }, { width: 1280, height: 720 }];
    const canvas = composePhotoStrip(photos, 'frame', 4 / 3, layout);
    assert.equal(canvas.width, 600);
    assert.equal(canvas.height, 1400);
    layout.slots.forEach((slot, i) => {
      const [photo, sx, sy, sw, sh, x, y, w, h] = calls[i];
      assert.equal(photo, photos[i]);
      assert.deepEqual([x, y, w, h], [slot.x, slot.y, slot.width, slot.height]);
      assert.ok(Math.abs(sw / sh - w / h) < 1e-10);
      assert.ok(Math.abs(sx * 2 + sw - photo.width) < 1e-10);
      assert.ok(Math.abs(sy * 2 + sh - photo.height) < 1e-10);
    });
    assert.deepEqual(calls.at(-1), ['frame', 0, 0, 600, 1400]);
    assert.throws(() => composePhotoStrip([photos[0]], 'frame', 4 / 3, layout));
  } finally {
    delete globalThis.document;
  }
});

test('manual openings preserve artwork and may touch frame edges', () => {
  const square = makeFrame(100, 100);
  clearFrameRectangle(square, { x: 85, y: 85 }, { x: 14, y: 14 });
  assert.equal(square.data[(10 * 100 + 10) * 4 + 3], 255);
  assert.deepEqual(detectFrameSlots(square), [{ x: 14, y: 14, width: 72, height: 72 }]);
  const meme = makeFrame(100, 100);
  clearFrameRectangle(meme, { x: 0, y: 28 }, { x: 99, y: 99 });
  assert.equal(meme.data[3], 255);
  assert.deepEqual(detectFrameSlots(meme), []);
  assert.deepEqual(detectFrameSlots(meme, { allowEdgeSlots: true }), [{ x: 0, y: 28, width: 100, height: 72 }]);
  assert.equal(getFrameLayout(meme, { allowEdgeSlots: true }).slots.length, 1);
  assert.throws(() => clearFrameRectangle(meme, { x: -1, y: 0 }, { x: 3, y: 4 }));
});
