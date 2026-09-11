// Shared catalog operations for uploaded frames and stickers.
export function bindCatalogDeleteButtons(container, catalog, { label, render, deleteRemote, showError }) {
  container.querySelectorAll('.btn-item-del').forEach(button => {
    button.addEventListener('click', async event => {
      event.stopPropagation();
      const id = event.currentTarget.dataset.del;
      const index = catalog.findIndex(item => item.id === id);
      if (!confirm(`ลบ${label} "${catalog[index]?.name || id}" ออกจากคลัง?`)) return;
      if (index >= 0) catalog.splice(index, 1);
      render();
      try {
        await deleteRemote(id);
      } catch (error) {
        console.warn(`ลบ${label}บน Supabase ไม่สำเร็จ:`, error.message);
        showError(`ลบ${label}ออกจาก Supabase ไม่สำเร็จ: ${error.message}`);
      }
    });
  });
}

export async function loadSavedCatalog(catalog, { fetchRecords, idKey, fallbackName, render }) {
  try {
    const records = await fetchRecords();
    if (!records?.length) return;
    for (const record of records) {
      if (!catalog.some(item => item.id === record[idKey])) {
        catalog.unshift({ id: record[idKey], name: record.name || fallbackName, src: record.image_url });
      }
    }
    render();
  } catch (error) {
    console.warn('Could not load catalog from Supabase:', error.message);
  }
}
