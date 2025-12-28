import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/layout/Footer";
import InfoSection from "@/components/landing/InfoSection";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GST Tennis Academy",
  description:
    "Programmi di tennis professionali, coaching personalizzato e percorsi di crescita per atleti di ogni livello.",
  icons: {
    icon: [
      { url: '/images/logo-tennis.svg', type: 'image/svg+xml' },
      { url: '/images/logo-tennis.png', type: 'image/png' },
    ],
    apple: '/images/logo-tennis.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-[var(--foreground)]`}>
        {children}
        <InfoSection />
        <Footer />
      </body>
    </html>
  );
}
