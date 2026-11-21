export { cn, formatPrice, slugify } from '@pizca/utils';

export function formatNumber(num: number, locale = 'es-PE') {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatDate(date: Date | string, locale = 'es-PE', options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(d);
}

export function truncate(text: string, length: number) {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}