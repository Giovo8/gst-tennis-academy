import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { defaultMetadata, generateOrganizationSchema } from '@/lib/seo/metadata';
import AppToaster from '@/components/ui/AppToaster';

// Font self-hosted (variable, subset latin): evita il fetch da Google Fonts in fase di build
const inter = localFont({
  src: './fonts/InterTight-latin.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '300 900',
});

const urbanist = localFont({
  src: './fonts/Urbanist-latin.woff2',
  variable: '--font-urbanist',
  display: 'swap',
  weight: '300 900',
});

export const metadata: Metadata = {
  ...defaultMetadata,
  icons: {
    icon: [{ url: '/images/logo-tennis.png', type: 'image/png' }],
    apple: '/images/logo-tennis.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = generateOrganizationSchema();

  return (
    <html lang="it" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={`${inter.variable} ${urbanist.variable} antialiased font-sans`}>
        {/* Il footer non sta qui: ogni pagina pubblica lo rende nel proprio
            contenitore, così resta in fondo e non si duplica durante la navigazione */}
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
