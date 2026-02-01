import type { Metadata, Viewport } from "next";
import { Inter, Urbanist } from "next/font/google";
import "./globals.css";
import ConditionalFooter from "@/components/layout/ConditionalFooter";
import { defaultMetadata, generateOrganizationSchema } from "@/lib/seo/metadata";
import { ThemeProvider } from "@/components/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  ...defaultMetadata,
  icons: {
    icon: [
      { url: '/images/logo-tennis.svg', type: 'image/svg+xml' },
      { url: '/images/logo-tennis.png', type: 'image/png' },
    ],
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
    <html lang="it" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Force light mode only
                  localStorage.removeItem('gst-theme');
                  localStorage.removeItem('darkMode');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${urbanist.variable} antialiased font-sans`}>
        <ThemeProvider defaultTheme="light">
          {children}
          <ConditionalFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
