import { Metadata } from 'next'

export const defaultMetadata: Metadata = {
  metadataBase: new URL('https://gst-tennis-academy.vercel.app'),
  title: {
    default: 'GST Tennis Academy | Scuola Tennis Roma',
    template: '%s | GST Tennis Academy'
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
    url: 'https://gst-tennis-academy.vercel.app',
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
  verification: {
    google: 'your-google-verification-code',
  },
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: 'GST Tennis Academy',
    description: 'Scuola tennis a Roma con corsi per tutti i livelli',
    url: 'https://gst-tennis-academy.vercel.app',
    logo: 'https://gst-tennis-academy.vercel.app/images/logo-tennis.png',
    image: 'https://gst-tennis-academy.vercel.app/images/og-image.jpg',
    telephone: '+39-XXX-XXXXXXX',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Example',
      addressLocality: 'Roma',
      addressRegion: 'RM',
      postalCode: '00100',
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

export function generateCourseSchema(course: {
  name: string
  description: string
  price: number
  duration: string
  level: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'GST Tennis Academy',
      url: 'https://gst-tennis-academy.vercel.app',
    },
    offers: {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    educationalLevel: course.level,
    timeRequired: course.duration,
    inLanguage: 'it',
    isAccessibleForFree: false,
  }
}

export function generateEventSchema(event: {
  name: string
  description: string
  startDate: string
  endDate: string
  location: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Roma',
        addressCountry: 'IT',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'GST Tennis Academy',
      url: 'https://gst-tennis-academy.vercel.app',
    },
    sport: 'Tennis',
  }
}
