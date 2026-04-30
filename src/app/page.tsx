"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CTASection from "@/components/landing/CTASection";
import PublicNavbar from "@/components/layout/PublicNavbar";
import TextHeroSection from "@/components/landing/TextHeroSection";
import ImageOnlySection from "@/components/landing/ImageOnlySection";
import ImageWithTextSection from "@/components/landing/ImageWithTextSection";
import ServicesSection from "@/components/landing/ServicesSection";
import NewsSection from "@/components/landing/NewsSection";
import StaffSection from "@/components/landing/StaffSection";
import TournamentsSection from "@/components/landing/TournamentsSection";

function AuthCodeHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=/auth/reset-password`);
    }
  }, [searchParams, router]);

  return null;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={null}>
        <AuthCodeHandler />
      </Suspense>
      <PublicNavbar />
      <main>
        {/* Accessibility skip link */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:translate-y-0 focus:top-4">Vai al contenuto</a>

        <div className="flex flex-col gap-0" id="main-content">
          <TextHeroSection />
          <ImageOnlySection />
          <ImageWithTextSection />
          <ServicesSection />
          <TournamentsSection />
          <StaffSection />
          <NewsSection />
          <CTASection />
        </div>
      </main>
    </div>
  );
}
