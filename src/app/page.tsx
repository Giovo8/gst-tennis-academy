"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import CTASection from "@/components/landing/CTASection";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import NewsSection from "@/components/landing/NewsSection";
import CoursesSection from "@/components/landing/CoursesSection";
import StaffSection from "@/components/landing/StaffSection";
import SocialFeed from "@/components/landing/SocialFeed";

type Section = {
  section_key: string;
  order_index: number;
  active: boolean;
};

const sectionComponents: { [key: string]: React.ComponentType } = {
  hero: Hero,
  courses: CoursesSection,
  staff: StaffSection,
  news: NewsSection,
  social: SocialFeed,
  cta: CTASection,
};

export default function Home() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("section_key, order_index, active")
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Filtra per evitare duplicati: se ci sono programs o subscriptions, usa solo courses
        const filteredSections = data.filter((section) => {
          if (section.section_key === "programs" || section.section_key === "subscriptions") {
            // Verifica se esiste già courses
            const hasCourses = data.some(s => s.section_key === "courses");
            return !hasCourses; // Mostra solo se courses non esiste
          }
          return true;
        });
        setSections(filteredSections);
      } else {
        // Fallback to default order
        setSections([
          { section_key: "hero", order_index: 0, active: true },
          { section_key: "courses", order_index: 1, active: true },
          { section_key: "staff", order_index: 2, active: true },
          { section_key: "news", order_index: 3, active: true },
          { section_key: "social", order_index: 4, active: true },
          { section_key: "cta", order_index: 5, active: true },
        ]);
      }
    } catch (error) {
      console.error("Errore nel caricamento dell'ordine delle sezioni:", error);
      // Fallback to default order
      setSections([
        { section_key: "hero", order_index: 0, active: true },
        { section_key: "courses", order_index: 1, active: true },
        { section_key: "staff", order_index: 2, active: true },
        { section_key: "news", order_index: 3, active: true },
        { section_key: "social", order_index: 4, active: true },
        { section_key: "cta", order_index: 5, active: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] text-white">
        <Header />
        <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16 pt-10">
          <p className="text-center text-muted">Caricamento...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021627] text-white">
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16 pt-10">
        {/* Accessibility skip link */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:translate-y-0 focus:top-4">Vai al contenuto</a>

        {sections.map((section, index) => {
          const Component = sectionComponents[section.section_key];
          if (!Component) return null;

          return (
            <section key={section.section_key} id={index === 0 ? "main-content" : undefined}>
              <Component />
            </section>
          );
        })}
      </main>
    </div>
  );
}
