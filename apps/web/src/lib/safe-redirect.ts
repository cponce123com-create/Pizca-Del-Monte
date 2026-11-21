/** Acepta exclusivamente rutas internas, evitando URLs ambiguas o normalizadas por el navegador. */
export function safeRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value) || /[a-z][a-z\d+.-]*:/i.test(value) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return '/mi-cuenta';
  return value;
}
