import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPixels } from './imageFilters.js';

test('pixel fallback preserves alpha and applies brightness, contrast and grayscale', () => {
  assert.deepEqual([...filterPixels(new Uint8ClampedArray([100, 50, 20, 80]), 'brightness(2)')], [200, 100, 40, 80]);
  assert.deepEqual([...filterPixels(new Uint8ClampedArray([255, 0, 0, 255]), 'grayscale(1)')], [54, 54, 54, 255]);
  assert.deepEqual([...filterPixels(new Uint8ClampedArray([10, 100, 220, 80]), 'contrast(0)')], [128, 128, 128, 80]);
});

test('color operations honor identity and execute in declared order', () => {
  const original = [120, 80, 40, 255];
  for (const filter of ['none', 'saturate(1)', 'sepia(0)', 'hue-rotate(0deg)']) {
    assert.deepEqual([...filterPixels(new Uint8ClampedArray(original), filter)], original);
  }
  assert.deepEqual([...filterPixels(new Uint8ClampedArray([100, 50, 20, 255]), 'sepia(1)')], [82, 73, 57, 255]);
  const result = filterPixels(new Uint8ClampedArray(original), 'brightness(0) brightness(2)');
  assert.deepEqual([...result], [0, 0, 0, 255]);
  assert.notDeepEqual([...filterPixels(new Uint8ClampedArray(original), 'hue-rotate(180deg)')], original);
});
