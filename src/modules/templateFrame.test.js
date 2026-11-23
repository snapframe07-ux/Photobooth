import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCaptureFrame, restoreCaptureFrame } from './templateFrame.js';

test('uploaded frame survives JSON sharing without its temporary URL and preserves photo slots', () => {
  const layout = { width: 960, height: 720, slots: [
    { x: 20, y: 20, width: 440, height: 680 },
    { x: 500, y: 20, width: 440, height: 680 }
  ] };
  const decoration = {};
  const calls = [];
  globalThis.document = { createElement: () => ({
    getContext: () => ({ drawImage: (...args) => calls.push(args) }),
    toDataURL: () => 'data:image/png;base64,FRAME'
  }) };
  try {
    const saved = serializeCaptureFrame({ name: 'Custom', src: 'blob:temporary', layout }, decoration, layout);
    const shared = JSON.parse(JSON.stringify({ capture: { count: 2, frame: saved } }));
    const restored = restoreCaptureFrame(shared.capture.frame, shared.capture.count);
    assert.equal(restored.src, 'data:image/png;base64,FRAME');
    assert.deepEqual(restored.layout, layout);
    assert.notEqual(restored.layout, layout);
    assert.deepEqual(calls, [[decoration, 0, 0, 960, 720]]);
    assert.ok(!JSON.stringify(shared).includes('blob:'));
  } finally { delete globalThis.document; }
});

test('legacy templates without a frame still load, invalid saved frames fail clearly', () => {
  assert.equal(restoreCaptureFrame(undefined, 4), null);
  assert.equal(serializeCaptureFrame(null, null, null), null);
  assert.throws(() => restoreCaptureFrame({ src: 'blob:expired' }, 2));
  assert.throws(() => restoreCaptureFrame({ src: 'data:image/png;base64,FRAME', layout: {
    width: 960, height: 720, slots: []
  } }, 2));
});

test('built-in frames serialize without base64 and remote storage URLs restore cleanly', () => {
  const builtinSaved = serializeCaptureFrame({ id: 'polaroid-cream', name: 'Polaroid Cream', layout: null }, {}, { width: 960, height: 2800 });
  assert.deepEqual(builtinSaved, { builtinId: 'polaroid-cream', name: 'Polaroid Cream', layout: null });
  const builtinRestored = restoreCaptureFrame(builtinSaved, 4);
  assert.equal(builtinRestored.id, 'polaroid-cream');
  assert.ok(builtinRestored.src.startsWith('data:image/svg+xml;charset=utf-8,'));

  const remoteRestored = restoreCaptureFrame({
    name: 'Cloud Frame',
    src: 'https://example.supabase.co/storage/v1/object/public/frames/template-frames/u1/f1.png',
    layout: null
  }, 4);
  assert.equal(remoteRestored.src, 'https://example.supabase.co/storage/v1/object/public/frames/template-frames/u1/f1.png');
});
