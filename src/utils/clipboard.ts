export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const succeeded = document.execCommand('copy');
    if (!succeeded) {
      throw new Error('Clipboard copy command failed');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
