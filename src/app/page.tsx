"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/layout/Footer";
import LogoScrollSection from "@/components/landing/LogoScrollSection";
import PublicNavbar from "@/components/layout/PublicNavbar";
import TextHeroSection from "@/components/landing/TextHeroSection";
import ImageOnlySection from "@/components/landing/ImageOnlySection";
import NewsSection from "@/components/landing/NewsSection";
import StaffSection from "@/components/landing/StaffSection";
import TournamentsSection from "@/components/landing/TournamentsSection";

function AuthCodeHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=/auth/reset-password`);
      return;
    }

    if (tokenHash && type) {
      router.replace(
        `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&next=/auth/reset-password`
      );
    }
  }, [searchParams, router]);

  return null;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <AuthCodeHandler />
      </Suspense>
      <div className="max-w-[1400px] mx-auto bg-white">
        <PublicNavbar home />
        <main>
          {/* Accessibility skip link */}
          <a href="#main-content" className="sr-only focus:not-sr-only focus:translate-y-0 focus:top-4">Vai al contenuto</a>

          <div className="flex flex-col gap-0" id="main-content">
            <TextHeroSection />
            <ImageOnlySection />
            <TournamentsSection />
            <StaffSection />
            <NewsSection />
            <CTASection />
            <div
              className="h-[56vw] sm:h-[400px] md:h-[500px] w-full"
              style={{
                backgroundImage: 'url(/images/3.jpeg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }}
              role="img"
              aria-label="Campo da tennis GST Tennis Academy"
            />
            <LogoScrollSection />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
