import test from 'node:test';
import assert from 'node:assert/strict';
import { sharePhoto, copyPhoto, printPhoto, isMobilePhotoDevice } from './photoShare.js';

test('photo actions distinguish phones and iPads from desktop and touch Windows PCs', () => {
  assert.equal(isMobilePhotoDevice({ userAgent: 'Windows NT 10.0', maxTouchPoints: 10 }), false);
  assert.equal(isMobilePhotoDevice({ platform: 'MacIntel', maxTouchPoints: 0 }), false);
  assert.equal(isMobilePhotoDevice({ platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(isMobilePhotoDevice({ userAgent: 'iPhone' }), true);
  assert.equal(isMobilePhotoDevice({ userAgent: 'Android' }), true);
  assert.equal(isMobilePhotoDevice({ userAgentData: { mobile: true } }), true);
});

test('shares image files, handles unsupported devices and cancellation, and reports failures', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const nav = { userAgentData: { platform: 'Windows' } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: nav });
  t.after(() => Object.defineProperty(globalThis, 'navigator', descriptor));
  const url = 'data:image/png;base64,AQID';
  assert.equal(await sharePhoto(url), 'unsupported');
  let shared;
  nav.canShare = ({ files }) => files[0].type === 'image/png';
  nav.share = async data => { shared = data; };
  assert.equal(await sharePhoto(url), 'shared');
  assert.equal(shared.files[0].name, 'snapframe-photo.png');
  assert.deepEqual([...new Uint8Array(await shared.files[0].arrayBuffer())], [1, 2, 3]);
  nav.share = async () => { throw new DOMException('cancelled', 'AbortError'); };
  assert.equal(await sharePhoto(url), 'cancelled');
  nav.share = async () => { throw new Error('blocked'); };
  await assert.rejects(sharePhoto(url), /blocked/);
});

test('copies PNG bytes as an image, handles missing support, and propagates denied permission', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const itemDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ClipboardItem');
  const nav = {};
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: nav });
  t.after(() => {
    Object.defineProperty(globalThis, 'navigator', descriptor);
    if (itemDescriptor) Object.defineProperty(globalThis, 'ClipboardItem', itemDescriptor);
    else delete globalThis.ClipboardItem;
  });
  const url = 'data:image/png;base64,AQID';
  assert.equal(await copyPhoto(url), 'unsupported');
  Object.defineProperty(globalThis, 'ClipboardItem', { configurable: true, value: class {
    constructor(data) { this.data = data; }
    static supports(type) { return type === 'image/png'; }
  } });
  let written;
  nav.clipboard = { write: async items => { written = items; } };
  assert.equal(await copyPhoto(url), 'copied');
  assert.deepEqual(Object.keys(written[0].data), ['image/png']);
  assert.deepEqual([...new Uint8Array(await written[0].data['image/png'].arrayBuffer())], [1, 2, 3]);
  await assert.rejects(copyPhoto('data:image/jpeg;base64,AQID'), /PNG/);
  nav.clipboard.write = async () => { throw new DOMException('denied', 'NotAllowedError'); };
  await assert.rejects(copyPhoto(url), { name: 'NotAllowedError' });
});

test('prints photo after image decode, handles missing print support, and validates data URL', async () => {
  const url = 'data:image/png;base64,AQID';
  await assert.rejects(printPhoto('not-a-data-url'), /ไม่ถูกต้อง/);
  assert.equal(await printPhoto(url, {}, null), 'unsupported');

  let printed = 0, decoded = 0, appendedMount = null;
  const img = {
    removeAttribute() { delete this._src; },
    decode() { decoded++; return Promise.resolve(); },
    set src(value) { this._src = value; this.onload?.(); },
    get src() { return this._src; }
  };
  const doc = {
    body: { append(node) { appendedMount = node; } },
    querySelector: () => appendedMount,
    createElement(tag) {
      if (tag === 'img') return img;
      return { append() {}, querySelector: () => img };
    }
  };
  const win = { print() { printed++; } };
  assert.equal(await printPhoto(url, win, doc), 'printed');
  assert.equal(img.src, url);
  assert.equal(decoded, 1);
  assert.equal(printed, 1);
});
