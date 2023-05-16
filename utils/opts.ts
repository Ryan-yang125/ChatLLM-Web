import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    // showToast(Locale.Copy.Success);
  } catch (error) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      // showToast(Locale.Copy.Success);
    } catch (error) {
      // showToast(Locale.Copy.Failed);
    }
    document.body.removeChild(textArea);
  }
}

export async function exportCache() {
  const cacheName = 'tvmjs';
  // const requestUrl = 'https://huggingface.co/mlc-ai/web-lm/resolve/main/vicuna-7b-v1/params_shard_0.bin'
  const zip = new JSZip();
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    await Promise.all(
      keys.map(async (key) => {
        if (key.url.endsWith('bin')) {
          const result = await cache.match(key);
          if (result) {
            zip.file(key.url, result.blob());
            console.log(key.url, 'done');
          }
        }
      }),
    );
    const content = await zip.generateAsync({ type: 'blob' });
    console.log(content);
    saveAs(content, 'my-caches.zip');
  } catch (error) {
    console.error(error);
  }
}
