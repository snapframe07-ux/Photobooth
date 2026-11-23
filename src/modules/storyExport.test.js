import test from 'node:test';
import assert from 'node:assert/strict';
import { composeStoryCanvas } from './storyExport.js';

test('composeStoryCanvas outputs 1080x1920 9:16 frame and centers strip for all background styles', () => {
  const draws = [];
  const ctx = {
    fillRect() {},
    save() {},
    restore() {},
    drawImage(...args) { draws.push(args); }
  };
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const strip = { width: 960, height: 2800 };
    for (const bgStyle of ['blur', 'matching', 'dark']) {
      draws.length = 0;
      const out = composeStoryCanvas(strip, { bgStyle, bgColor: '#FFF5F7' });
      assert.equal(out.width, 1080);
      assert.equal(out.height, 1920);
      const mainDraw = draws.at(-1);
      assert.equal(mainDraw[0], strip);
      const [, dx, dy, dw, dh] = mainDraw;
      assert.ok(dx > 0 && dy > 0, `${bgStyle}: strip should have safe margins`);
      assert.ok(dw <= 1080 * 0.82 + 1 && dh <= 1920 * 0.84 + 1);
      assert.ok(Math.abs((dx + dw / 2) - 540) <= 1, 'strip should be horizontally centered');
      assert.ok(Math.abs((dy + dh / 2) - 960) <= 1, 'strip should be vertically centered');
    }
  } finally {
    delete globalThis.document;
  }
});
