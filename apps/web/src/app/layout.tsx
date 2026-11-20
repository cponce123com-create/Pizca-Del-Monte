import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './styles/globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'serif'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: {
    default: 'Pizca del Monte - Especias, Sales y Aceites Gourmet Peruanos',
    template: '%s | Pizca del Monte',
  },
  description: 'Descubre la mejor selección de especias, sales de Maras, aceites de oliva y productos gourmet peruanos. Envío a todo el Perú.',
  keywords: [
    'especias peruanas',
    'sal de Maras',
    'aceite de oliva',
    'ají amarillo',
    'productos gourmet',
    'cocina peruana',
    'ají panca',
    'rocoto',
    'vinagre de manzana',
    'salsa huancaína',
  ],
  authors: [{ name: 'Pizca del Monte' }],
  creator: 'Pizca del Monte',
  publisher: 'Pizca del Monte',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: 'https://pizcadelmonte.pe',
    siteName: 'Pizca del Monte',
    title: 'Pizca del Monte - Especias, Sales y Aceites Gourmet Peruanos',
    description: 'Descubre la mejor selección de especias, sales de Maras, aceites de oliva y productos gourmet peruanos. Envío a todo el Perú.',
    images: [
      {
        url: '/images/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Pizca del Monte - Productos Gourmet Peruanos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pizca del Monte - Especias, Sales y Aceites Gourmet Peruanos',
    description: 'Descubre la mejor selección de especias, sales de Maras, aceites de oliva y productos gourmet peruanos.',
    images: ['/images/og-default.jpg'],
    creator: '@pizcadelmonte',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFBF7' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A1A' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://api.mercadopago.com" />
        <link rel="dns-prefetch" href="https://api.mercadopago.com" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}