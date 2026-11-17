import { removeBackground } from '@imgly/background-removal';

self.addEventListener('message', async event => {
  const { id, blob } = event.data;
  try {
    const result = await removeBackground(blob, {
      model: 'isnet_quint8',
      progress: (key, current, total) => {
        self.postMessage({ id, type: 'progress', key, current, total });
      }
    });
    self.postMessage({ id, type: 'done', result });
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error?.message || String(error) });
  }
});
