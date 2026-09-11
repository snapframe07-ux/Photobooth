import test from 'node:test';
import assert from 'node:assert/strict';
import { bindCatalogDeleteButtons, loadSavedCatalog } from './assetGallery.js';

test('saved frames and stickers merge without duplicates and preserve existing entries', async () => {
  for (const idKey of ['frame_id', 'sticker_id']) {
    const catalog = [{ id: 'existing', name: 'Original', src: 'local' }];
    let renders = 0;
    const options = {
      idKey, fallbackName: 'Saved', render: () => renders++,
      fetchRecords: async () => [
        { [idKey]: 'existing', name: 'Replacement', image_url: 'remote' },
        { [idKey]: 'new', image_url: 'new-url' }
      ]
    };
    await loadSavedCatalog(catalog, options);
    await loadSavedCatalog(catalog, options);
    assert.deepEqual(catalog, [
      { id: 'new', name: 'Saved', src: 'new-url' },
      { id: 'existing', name: 'Original', src: 'local' }
    ]);
    assert.equal(renders, 2);
  }
});

test('catalog deletion respects cancellation and reports remote failures', async t => {
  const catalog = [{ id: 'custom', name: 'Custom' }];
  let click, renders = 0, deletedId, message;
  const container = { querySelectorAll: () => [{ addEventListener: (_, handler) => { click = handler; } }] };
  bindCatalogDeleteButtons(container, catalog, {
    label: 'กรอบ', render: () => renders++,
    deleteRemote: async id => { deletedId = id; throw new Error('offline'); },
    showError: value => { message = value; }
  });
  t.mock.method(console, 'warn', () => {});
  const originalConfirm = globalThis.confirm;
  t.after(() => {
    if (originalConfirm === undefined) delete globalThis.confirm;
    else globalThis.confirm = originalConfirm;
  });
  const event = { stopPropagation() {}, currentTarget: { dataset: { del: 'custom' } } };
  globalThis.confirm = () => false;
  await click(event);
  assert.equal(catalog.length, 1);
  assert.equal(renders, 0);
  assert.equal(deletedId, undefined);
  globalThis.confirm = () => true;
  await click(event);
  assert.equal(catalog.length, 0);
  assert.equal(renders, 1);
  assert.equal(deletedId, 'custom');
  assert.match(message, /offline/);
});
