import test from 'node:test';
import assert from 'node:assert/strict';
import { loadImageFromBlob } from './imageLoader.js';

test('blob loader validates input and releases object URLs on success and failure', async t => {
  await assert.rejects(loadImageFromBlob(null), /ไฟล์รูปภาพไม่ถูกต้อง/);
  const revoked = [];
  t.mock.method(URL, 'createObjectURL', () => 'blob:test');
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url));
  const originalImage = globalThis.Image;
  t.after(() => {
    if (originalImage === undefined) delete globalThis.Image;
    else globalThis.Image = originalImage;
  });
  let fail = false;
  globalThis.Image = class {
    set src(value) { fail ? this.onerror() : this.onload(); }
  };
  const image = await loadImageFromBlob(new Blob(['image']));
  assert.equal(image.crossOrigin, 'anonymous');
  fail = true;
  await assert.rejects(loadImageFromBlob(new Blob(['bad'])), /ไม่สามารถโหลดภาพต้นฉบับได้/);
  assert.deepEqual(revoked, ['blob:test', 'blob:test']);
});
