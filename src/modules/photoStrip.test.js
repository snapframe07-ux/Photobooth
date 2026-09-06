import test from 'node:test';
import assert from 'node:assert/strict';
import { getStripLayout, composePhotoStrip } from './photoStrip.js';

test('all supported shot counts and camera ratios produce one vertical column', () => {
  for (const count of [1, 2, 3, 4]) {
    for (const aspect of [4 / 3, 1, 16 / 9]) {
      const layout = getStripLayout(count, 960, aspect);
      assert.equal(layout.slots.length, count);
      if (count > 1) assert.ok(layout.height > layout.width);
      layout.slots.forEach((slot, index) => {
        assert.equal(slot.x, layout.slots[0].x);
        assert.ok(slot.x + slot.width <= layout.width);
        assert.ok(slot.y + slot.height < layout.height);
        if (index) assert.ok(slot.y > layout.slots[index - 1].y + slot.height);
      });
    }
  }
});

test('export draws shots in order, then one frame covering the entire strip', () => {
  const calls = [];
  const ctx = { fillRect() {}, fillText() {}, drawImage(...args) { calls.push(args); } };
  globalThis.document = { createElement() { return { getContext: () => ctx }; } };
  try {
    for (const count of [1, 2, 3, 4]) {
    calls.length = 0;
    const photos = ['first', 'second', 'third', 'fourth'].slice(0, count);
    const canvas = composePhotoStrip(photos, 'selected-frame');
    assert.equal(calls.length, count + 1);
    photos.forEach((photo, index) => {
      assert.equal(calls[index][0], photo);
    });
    assert.deepEqual(calls.at(-1), ['selected-frame', 0, 0, canvas.width, canvas.height]);
    calls.length = 0;
    composePhotoStrip(photos, null);
    assert.equal(calls.length, count);
    }
  } finally {
    delete globalThis.document;
  }
});

test('invalid shot counts are rejected', () => {
  for (const count of [0, 5, 6, 1.5, NaN]) assert.throws(() => getStripLayout(count));
});
