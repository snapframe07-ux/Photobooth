import test from 'node:test';
import assert from 'node:assert/strict';
import { getStripLayout, composePhotoStrip, formatStripDate, buildStripFooterText } from './photoStrip.js';

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

test('horizontal export matches preview, using a 2x2 grid for four photos', () => {
  const calls = [];
  const ctx = { fillRect() {}, fillText() {}, drawImage(...args) { calls.push(args); } };
  globalThis.document = { createElement() { return { getContext: () => ctx }; } };
  try {
    for (const count of [1, 2, 3, 4]) {
      for (const aspect of [4 / 3, 1, 16 / 9]) {
        calls.length = 0;
        const layout = getStripLayout(count, 960, aspect, 'horizontal');
        const photos = Array.from({ length: count }, (_, i) => `photo-${i}`);
        const canvas = composePhotoStrip(photos, 'frame', aspect, null, 'horizontal');
        assert.equal(canvas.width, layout.width);
        assert.equal(canvas.height, layout.height);
        layout.slots.forEach((slot, i) => {
          if (count === 4) {
            assert.equal(slot.x, layout.slots[i % 2].x);
            assert.equal(slot.y, layout.slots[i < 2 ? 0 : 2].y);
            if (i >= 2) assert.ok(slot.y > layout.slots[i - 2].y + layout.slots[i - 2].height);
          } else {
            assert.equal(slot.y, layout.slots[0].y);
          }
          assert.ok(slot.x + slot.width <= layout.width);
          assert.ok(slot.y + slot.height < layout.height);
          assert.ok(Math.abs(slot.height - slot.width / aspect) <= 0.5);
          if (i && (count !== 4 || i % 2 === 1)) assert.ok(slot.x > layout.slots[i - 1].x + layout.slots[i - 1].width);
          assert.deepEqual(calls[i], [photos[i], slot.x, slot.y, slot.width, slot.height]);
        });
        assert.deepEqual(calls.at(-1), ['frame', 0, 0, canvas.width, canvas.height]);
      }
    }
  } finally {
    delete globalThis.document;
  }
});

test('composePhotoStrip applies custom background color and isolates filter to photos only', () => {
  const drawEvents = [];
  let fillColor = null;
  const ctx = {
    filter: 'none',
    set fillStyle(val) { if (fillColor === null) fillColor = val; },
    get fillStyle() { return fillColor; },
    save() {},
    restore() { this.filter = 'none'; },
    fillRect() {},
    fillText() {},
    drawImage(src) { drawEvents.push({ src, filter: this.filter }); }
  };
  globalThis.document = { createElement() { return { getContext: () => ctx }; } };
  try {
    composePhotoStrip(['shot-1', 'shot-2'], 'color-frame', 4 / 3, null, 'vertical', {
      bgColor: '#18181B',
      filter: 'grayscale(1)'
    });
    assert.equal(fillColor, '#18181B');
    assert.deepEqual(drawEvents, [
      { src: 'shot-1', filter: 'grayscale(1)' },
      { src: 'shot-2', filter: 'grayscale(1)' },
      { src: 'color-frame', filter: 'none' }
    ]);
  } finally {
    delete globalThis.document;
  }
});

test('composePhotoStrip supports custom footer text, date stamp, and background patterns', () => {
  const texts = [];
  const rects = [];
  const ctx = {
    fillRect(...args) { rects.push(args); },
    fillText(text) { texts.push(text); },
    drawImage() {}
  };
  globalThis.document = { createElement() { return { getContext: () => ctx }; } };
  try {
    const fixedDate = new Date(2026, 10, 23);
    assert.equal(formatStripDate(fixedDate), '2026.11.23');
    assert.equal(buildStripFooterText({ footerText: 'Bestie Day ♡', showDate: true, date: fixedDate }), '2026.11.23 · Bestie Day ♡');
    assert.equal(buildStripFooterText({ footerText: '', showDate: true, date: fixedDate }), '2026.11.23');

    composePhotoStrip(['shot-1'], null, 4 / 3, null, 'vertical', {
      bgColor: '#FFFFFF',
      bgPattern: 'checker',
      footerText: 'Bestie Day ♡',
      showDate: true
    });
    assert.ok(rects.length > 1, 'checker pattern should draw tiled rectangles');
    assert.equal(texts.length, 1);
    assert.ok(texts[0].endsWith('· Bestie Day ♡'));
  } finally {
    delete globalThis.document;
  }
});
