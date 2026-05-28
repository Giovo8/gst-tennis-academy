import { Metadata } from 'next'

export const defaultMetadata: Metadata = {
  metadataBase: new URL('https://www.gstacademy.it'),
  title: {
    default: 'GST Academy',
    template: '%s | GST Academy'
  },
  description: 'Scuola tennis a Roma con corsi per tutti i livelli: principianti, intermedi, avanzati e agonisti. Tornei, lezioni private, prenotazione campi online.',
  keywords: ['tennis', 'scuola tennis', 'Roma', 'corsi tennis', 'lezioni tennis', 'tornei tennis', 'prenotazione campi', 'tennis academy', 'GST Academy'],
  authors: [{ name: 'GST Tennis Academy' }],
  creator: 'GST Tennis Academy',
  publisher: 'GST Tennis Academy',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://www.gstacademy.it',
    siteName: 'GST Tennis Academy',
    title: 'GST Tennis Academy | Scuola Tennis Roma',
    description: 'Scuola tennis a Roma con corsi per tutti i livelli. Prenota lezioni, partecipa ai tornei e migliora il tuo gioco.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GST Tennis Academy - Scuola Tennis Roma',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GST Tennis Academy | Scuola Tennis Roma',
    description: 'Scuola tennis a Roma con corsi per tutti i livelli. Prenota lezioni, partecipa ai tornei.',
    images: ['/images/og-image.jpg'],
  },
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

}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: 'GST Tennis Academy',
    description: 'Scuola tennis a Roma con corsi per tutti i livelli',
    url: 'https://www.gstacademy.it',
    logo: 'https://www.gstacademy.it/images/logo-tennis.png',
    image: 'https://www.gstacademy.it/images/og-image.jpg',
    telephone: '+39 379 195 8651',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Cassia, 24300',
      addressLocality: 'Formello',
      addressRegion: 'RM',
      postalCode: '00060',
      addressCountry: 'IT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 41.9028,
      longitude: 12.4964,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '22:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday', 'Sunday'],
        opens: '09:00',
        closes: '20:00',
      },
    ],
    sameAs: [
      'https://www.facebook.com/gst-tennis-academy',
      'https://www.instagram.com/gst-tennis-academy',
      'https://www.youtube.com/@gst-tennis-academy',
    ],
  }
}


