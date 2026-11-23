import test from 'node:test';
import assert from 'node:assert/strict';
import { AppUI, PHOTO_TTL_MS, isPhotoExpired } from './appUI.js';

test('session gallery automatically expires and removes photos older than 7 days', () => {
  const ui = new AppUI();
  const baseTime = 1_700_000_000_000;
  const oldPhoto = ui.addSessionPhoto('data:image/png;base64,OLD', baseTime);
  const recentPhoto = ui.addSessionPhoto('data:image/png;base64,NEW', baseTime + 2 * 24 * 60 * 60 * 1000);

  // Just before 7 days: both remain
  const before7Days = baseTime + PHOTO_TTL_MS - 1000;
  assert.equal(isPhotoExpired(oldPhoto, before7Days), false);
  assert.equal(ui.getSessionPhotos(before7Days).length, 2);

  // At 7 days from oldPhoto: oldPhoto is auto-pruned, recentPhoto remains
  const at7Days = baseTime + PHOTO_TTL_MS;
  assert.equal(isPhotoExpired(oldPhoto, at7Days), true);
  assert.equal(isPhotoExpired(recentPhoto, at7Days), false);
  const remaining = ui.getSessionPhotos(at7Days);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, recentPhoto.id);
});
