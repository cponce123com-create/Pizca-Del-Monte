import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['es-PE', 'en-US'] as const;
export const defaultLocale = 'es-PE' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});