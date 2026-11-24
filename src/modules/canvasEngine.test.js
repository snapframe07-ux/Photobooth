import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initCanvasEngine,
  addLayer,
  getLayers,
  undo,
  redo,
  canUndo,
  canRedo,
  resetHistory,
  downloadDataUrl
} from './canvasEngine.js';

function createMockCanvasEnvironment() {
  const listeners = new Map();
  const makeCtx = () => ({
    clearRect() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {},
    stroke() {},
    strokeRect() {},
    setLineDash() {},
    fillText() {},
    getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) })
  });

  class FakeHTMLCanvasElement {
    constructor() {
      this.width = 400;
      this.height = 400;
      this.style = {};
      this._ctx = makeCtx();
    }
    getContext() { return this._ctx; }
    getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; }
    addEventListener(type, fn) { listeners.set(type, fn); }
    removeEventListener(type) { listeners.delete(type); }
    setPointerCapture() {}
    releasePointerCapture() {}
  }

  class FakeHTMLImageElement {}
  class FakeImageBitmap {}

  return { FakeHTMLCanvasElement, FakeHTMLImageElement, FakeImageBitmap, listeners };
}

test('canvasEngine defers drag undo until pointer moves so clicking a sticker does not push fake undo steps', async () => {
  const prev = {
    HTMLCanvasElement: globalThis.HTMLCanvasElement,
    HTMLImageElement: globalThis.HTMLImageElement,
    ImageBitmap: globalThis.ImageBitmap,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame
  };

  const { FakeHTMLCanvasElement, FakeHTMLImageElement, FakeImageBitmap, listeners } = createMockCanvasEnvironment();
  globalThis.HTMLCanvasElement = FakeHTMLCanvasElement;
  globalThis.HTMLImageElement = FakeHTMLImageElement;
  globalThis.ImageBitmap = FakeImageBitmap;
  globalThis.requestAnimationFrame = fn => { fn(); return 1; };
  globalThis.document = {
    createElement: tag => (tag === 'canvas' ? new FakeHTMLCanvasElement() : {})
  };

  try {
    const canvas = new FakeHTMLCanvasElement();
    initCanvasEngine(canvas, { width: 400, height: 400 });
    resetHistory();

    const stickerCanvas = new FakeHTMLCanvasElement();
    stickerCanvas.width = 100;
    stickerCanvas.height = 100;
    await addLayer({ id: 's1', type: 'sticker', image: stickerCanvas, x: 200, y: 200, width: 100, height: 100 });
    resetHistory();
    assert.equal(canUndo(), false);

    // Click without dragging: should NOT create an undo step
    listeners.get('pointerdown')({ pointerId: 1, clientX: 200, clientY: 200 });
    listeners.get('pointerup')({ pointerId: 1, clientX: 200, clientY: 200 });
    assert.equal(canUndo(), false);

    // Actual drag: should create exactly 1 undo step and restore previous position on undo
    listeners.get('pointerdown')({ pointerId: 1, clientX: 200, clientY: 200 });
    listeners.get('pointermove')({ pointerId: 1, clientX: 240, clientY: 230 });
    listeners.get('pointermove')({ pointerId: 1, clientX: 260, clientY: 250 });
    listeners.get('pointerup')({ pointerId: 1, clientX: 260, clientY: 250 });

    assert.equal(canUndo(), true);
    assert.equal(getLayers()[0].x, 260);
    assert.equal(getLayers()[0].y, 250);

    assert.equal(undo(), true);
    assert.equal(getLayers()[0].x, 200);
    assert.equal(getLayers()[0].y, 200);
    assert.equal(canUndo(), false);
    assert.equal(canRedo(), true);

    assert.equal(redo(), true);
    assert.equal(getLayers()[0].x, 260);
    assert.equal(getLayers()[0].y, 250);
  } finally {
    for (const [key, val] of Object.entries(prev)) {
      if (val === undefined) delete globalThis[key];
      else globalThis[key] = val;
    }
  }
});

test('downloadDataUrl uses anchor download for video files on iOS instead of broken img modal', async () => {
  const prevNav = globalThis.navigator;
  const prevDoc = globalThis.document;
  let clickedLink = null;
  let createdImgModal = false;

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 }
  });
  globalThis.document = {
    createElement: tag => {
      if (tag === 'div') createdImgModal = true;
      return {
        click() { clickedLink = this; }
      };
    },
    body: {
      appendChild() {},
      removeChild() {},
      append() {}
    }
  };

  try {
    await downloadDataUrl('blob:video-url', 'snapframe-live-strip.mp4', 'video/mp4');
    assert.equal(createdImgModal, false);
    assert.equal(clickedLink.href, 'blob:video-url');
    assert.equal(clickedLink.download, 'snapframe-live-strip.mp4');
  } finally {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: prevNav });
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
});
