/**
 * Opening a user supplied link safely: only absolute http(s) URLs are allowed
 * (never `javascript:`), and the new tab never gets a handle on `window.opener`.
 */
export const isExternalHttpUrl = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Opens `url` in a new tab. Returns `false` when the URL is missing or unsafe,
 * so callers can surface a message instead of silently doing nothing.
 */
export const openExternalUrl = (url: string | null | undefined): boolean => {
  if (!isExternalHttpUrl(url)) return false;
  window.open((url as string).trim(), '_blank', 'noopener,noreferrer');
  return true;
};

/** Copies text to the clipboard, falling back to a hidden textarea. */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};
