/**
 * Datos públicos de la tienda. No publicar valores de ejemplo como si fueran reales.
 * Completar las variables NEXT_PUBLIC_* en Render cuando se verifiquen.
 */
function optional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && !trimmed.includes('[COMPLETAR') ? trimmed : null;
}

function socialUrl(value: string | undefined): string | null {
  const input = optional(value);
  if (!input) return null;
  try {
    const url = new URL(input);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export const siteConfig = {
  name: 'Pizca del Monte',
  legalName: optional(process.env.NEXT_PUBLIC_STORE_LEGAL_NAME),
  ruc: optional(process.env.NEXT_PUBLIC_STORE_RUC),
  address: optional(process.env.NEXT_PUBLIC_STORE_ADDRESS),
  email: optional(process.env.NEXT_PUBLIC_STORE_EMAIL),
  whatsapp: optional(process.env.NEXT_PUBLIC_STORE_WHATSAPP),
  social: {
    facebook: socialUrl(process.env.NEXT_PUBLIC_STORE_FACEBOOK),
    instagram: socialUrl(process.env.NEXT_PUBLIC_STORE_INSTAGRAM),
    tiktok: socialUrl(process.env.NEXT_PUBLIC_STORE_TIKTOK),
    youtube: socialUrl(process.env.NEXT_PUBLIC_STORE_YOUTUBE),
  },
} as const;
