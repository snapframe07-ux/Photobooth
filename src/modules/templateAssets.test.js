import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeLayerSource } from './templateAssets.js';

test('decorations survive JSON sharing without private or blob URLs; base photo is excluded', t => {
  const original = globalThis.document;
  t.after(() => { if (original === undefined) delete globalThis.document; else globalThis.document = original; });
  const drawn = [];
  globalThis.document = { createElement: () => ({
    getContext: () => ({ drawImage: image => drawn.push(image) }),
    toDataURL: () => 'data:image/png;base64,AQID'
  }) };
  for (const src of ['blob:private-session', 'https://example.test/private/signed-image']) {
    const layer = { type: 'sticker', src, image: { naturalWidth: 100, naturalHeight: 80 } };
    const saved = JSON.parse(JSON.stringify({ src: serializeLayerSource(layer) }));
    assert.equal(saved.src, 'data:image/png;base64,AQID');
  }
  assert.equal(serializeLayerSource({ type: 'base', src: 'private-photo' }), null);
  assert.equal(drawn.length, 2);
  assert.throws(() => serializeLayerSource({ type: 'sticker' }), /โหลดไม่ครบ/);
});
