import { Suspense } from 'react';
import Image from 'next/image';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/layout/Footer';
import LogoScrollSection from '@/components/landing/LogoScrollSection';
import PublicNavbar from '@/components/layout/PublicNavbar';
import TextHeroSection from '@/components/landing/TextHeroSection';
import ImageOnlySection from '@/components/landing/ImageOnlySection';
import NewsSection from '@/components/landing/NewsSection';
import LiveScoresSection from '@/components/landing/LiveScoresSection';
import StaffSection from '@/components/landing/StaffSection';
import TournamentsSection from '@/components/landing/TournamentsSection';
import Reveal from '@/components/landing/Reveal';
import AuthCodeHandler from '@/components/landing/AuthCodeHandler';
import { getLandingNews, getLandingStaff } from '@/lib/landing/getLandingData';

// ISR: la home viene rigenerata al massimo ogni 60 secondi, quindi news e staff
// modificati dall'admin compaiono entro un minuto.
export const revalidate = 60;

// Server Component: solo le sezioni interattive vengono idratate nel browser.
export default async function Home() {
  const [news, staff] = await Promise.all([getLandingNews(), getLandingStaff()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <AuthCodeHandler />
      </Suspense>
      <div className="max-w-[1400px] mx-auto bg-white">
        <PublicNavbar home flush />
        <main>
          {/* Accessibility skip link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:translate-y-0 focus:top-4"
          >
            Vai al contenuto
          </a>

          {/* Sfondi alternati bianco/grigio: contano solo le <section>, così se una sezione non viene renderizzata (es. Live) l'alternanza resta corretta */}
          <div className="home-sections flex flex-col gap-0" id="main-content">
            <TextHeroSection />
            <ImageOnlySection />
            <TournamentsSection />
            <StaffSection initialStaff={staff} />
            <NewsSection initialNews={news} />
            <LiveScoresSection />
            <CTASection />
            <Reveal>
              <div className="relative h-[56vw] sm:h-[400px] md:h-[500px] w-full overflow-hidden">
                <Image
                  src="/images/3.jpeg"
                  alt="Campo da tennis GST Tennis Academy"
                  fill
                  sizes="(max-width: 1400px) 100vw, 1400px"
                  className="object-cover object-top"
                />
              </div>
            </Reveal>
            <LogoScrollSection />
          </div>
        </main>
        <Footer flush />
      </div>
    </div>
  );
}
