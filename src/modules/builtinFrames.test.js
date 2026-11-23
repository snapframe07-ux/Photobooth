import test from 'node:test';
import assert from 'node:assert/strict';
import { isBuiltinFrame, buildBuiltinFrameSvg, buildBuiltinFrameDataUrl } from './builtinFrames.js';

const BUILTIN_IDS = [
  'vintage-gold',
  'vintage-classic',
  'neon-cyber',
  'floral-bloom',
  'retro-film',
  'cute-pastel',
  'birthday-party',
  'minimalist-black',
  'comic-pop',
  'love-romance',
  'festive-sparkle',
  'y2k-chrome',
  'polaroid-cream'
];

test('all built-in frames generate aspect-matched SVGs without preserveAspectRatio="none"', () => {
  for (const id of BUILTIN_IDS) {
    assert.equal(isBuiltinFrame(id), true);
    const vertical = buildBuiltinFrameSvg(id, 960, 2800);
    assert.ok(vertical, `missing SVG for ${id}`);
    assert.ok(vertical.includes('viewBox="0 0 960 2800"'), `${id} should match vertical viewBox`);
    assert.ok(!vertical.includes('preserveAspectRatio="none"'), `${id} must not stretch with preserveAspectRatio="none"`);

    const horizontal = buildBuiltinFrameSvg(id, 960, 740);
    assert.ok(horizontal.includes('viewBox="0 0 960 740"'), `${id} should match horizontal viewBox`);

    const dataUrl = buildBuiltinFrameDataUrl(id, 960, 2800);
    assert.ok(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,'));
  }

  assert.equal(isBuiltinFrame('custom-upload-1'), false);
  assert.equal(buildBuiltinFrameSvg('custom-upload-1', 960, 2800), null);
  assert.equal(buildBuiltinFrameDataUrl('custom-upload-1', 960, 2800), null);
});

test('retro-film switches sprocket rails to left/right on vertical strips and top/bottom on landscape', () => {
  const vertical = buildBuiltinFrameSvg('retro-film', 960, 2800);
  // Left/right rails have height="2800"
  assert.ok(vertical.includes('height="2800"'));

  const landscape = buildBuiltinFrameSvg('retro-film', 1280, 720);
  // Top/bottom rails have width="1280"
  assert.ok(landscape.includes('width="1280"'));
});
