import test from 'node:test';
import assert from 'node:assert/strict';
import { sharePhoto } from './photoShare.js';

test('shares image files, handles unsupported devices and cancellation, and reports failures', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const nav = {};
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
