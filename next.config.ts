import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' necessario solo in dev (React Turbopack ricostruisce call stack con eval)
              // TODO: rimuovere 'unsafe-inline' migrando a nonce-based CSP in produzione
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: https://images.unsplash.com https://*.supabase.co https://cdn.sanity.io",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com",
              "frame-src 'self' https://www.youtube-nocookie.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    // Whitelist vuota di proposito: /_next/image è un endpoint pubblico e senza
    // autenticazione, e ogni URL sorgente mai visto costa una "transformation"
    // (5.000/mese sul piano free). Con `images.unsplash.com`, `cdn.sanity.io` e
    // `*.supabase.co` — quest'ultimo aperto a QUALSIASI progetto, non solo al
    // nostro — chiunque poteva far trasformare immagini arbitrarie dal nostro
    // dominio ed esaurire la quota: verificato in produzione il 12/08/2026, un
    // URL Unsplash estraneo passava la validazione. Ora ogni URL remoto viene
    // rifiutato con 400.
    //
    // Le immagini remote non ne risentono perché sono servite senza
    // ottimizzazione (prop `unoptimized` in ui/NewsImage e ui/Avatar): arrivano
    // da Supabase Storage già in WebP ≤1280px q80, vedi lib/images/optimize.ts.
    // Se in futuro serve riattivare l'ottimizzazione su un host, aggiungerlo qui
    // con `pathname` il più stretto possibile, mai con un hostname wildcard.
    remotePatterns: [],
    // Solo WebP: riguarda ormai le sole immagini locali (il logo). Tenere anche
    // AVIF raddoppiava le transformations, una per formato servito.
    formats: ['image/webp'],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/coach/:path*',
        destination: '/dashboard/maestro/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
