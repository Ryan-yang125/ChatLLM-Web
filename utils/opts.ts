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
