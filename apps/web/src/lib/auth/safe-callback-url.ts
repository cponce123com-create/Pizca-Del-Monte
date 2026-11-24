const DEFAULT_CALLBACK_URL = '/mi-cuenta';
const APP_ORIGIN = 'https://pizcadelmonte.invalid';

/** Return only same-origin absolute paths suitable for client-side navigation. */
export function safeCallbackUrl(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return DEFAULT_CALLBACK_URL;
  }

  try {
    const destination = new URL(value, APP_ORIGIN);
    if (destination.origin !== APP_ORIGIN) return DEFAULT_CALLBACK_URL;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_CALLBACK_URL;
  }
}
