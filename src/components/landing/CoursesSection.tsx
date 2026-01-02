"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type CourseSection = {
  id: string;
  layout_type: "single_box" | "frequency_grid" | "list_with_price" | "list_no_price" | "info_card";
  section_title: string;
  section_description?: string;
  items: any[];
  order_index: number;
  active: boolean;
};

export default function CoursesSection() {
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true});

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      // Use empty sections on error
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section id="programmi">
        <div className="container section">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="programmi" className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-16 md:py-20">
      <div className="space-y-10 sm:space-y-12">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold text-blue-800 mb-4">
            Corsi e Abbonamenti
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3 sm:mb-4">
            Scegli il tuo percorso tennis
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Scopri i nostri programmi di allenamento personalizzati per tutti i livelli
          </p>
        </div>

      <div className="flex flex-col gap-6 sm:gap-8">
          {sections.map((section) => {
        // Layout: Single Box (Quota Iscrizione, Agonistico)
        if (section.layout_type === "single_box") {
          const item = section.items[0];
          return (
            <div key={section.id} className="group rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10 hover:border-blue-800/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-800 transition-colors">{section.section_title}</h3>
                  {section.section_description && (
                    <p className="text-base text-gray-600 leading-relaxed">{section.section_description}</p>
                  )}
                  {item.details && item.details.length > 0 && (
                    <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
                      {item.details.map((detail: string, i: number) => (
                        <p key={i} className="flex items-center gap-2">
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-cyan-500 rounded-full"></span>
                          {detail}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-left md:text-right shrink-0">
                  <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">{item.price}€</span>
                  {item.details && <span className="text-xs sm:text-sm text-gray-500 block mt-1">/anno</span>}
                </div>
              </div>
            </div>
          );
        }

        // Layout: Frequency Grid (Base, Avanzato)
        if (section.layout_type === "frequency_grid") {
          return (
            <div key={section.id} className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10 hover:border-primary/30 transition-all shadow-sm">
              <div className="mb-5 sm:mb-7">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">{section.section_title}</h3>
                {section.section_description && (
                  <p className="text-base text-slate-600 leading-relaxed">{section.section_description}</p>
                )}
              </div>
              
              <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="group rounded-lg sm:rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 sm:p-7 hover:bg-white hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <p className="text-xs sm:text-sm uppercase tracking-wider text-primary mb-3 sm:mb-4 font-bold">{item.frequency}</p>
                    <div className="space-y-2 sm:space-y-3">
                      {item.price_monthly && (
                        <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#1e40af] to-[#2563eb] bg-clip-text text-transparent">
                          {item.price_monthly}€<span className="text-xs sm:text-sm font-normal text-slate-500"> /mese</span>
                        </p>
                      )}
                      {item.price_yearly && (
                        <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#1e40af] to-[#2563eb] bg-clip-text text-transparent">
                          {item.price_yearly}€<span className="text-xs sm:text-sm font-normal text-slate-500"> /anno</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Layout: List with Price (Extra)
        if (section.layout_type === "list_with_price") {
          return (
            <div key={section.id} className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 hover:border-primary/30 transition-all shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">{section.section_title}</h3>
              <div className="space-y-2 sm:space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm text-slate-600">{item.label}</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">{item.price}€</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Layout: List without Price (Sconti)
        if (section.layout_type === "list_no_price") {
          return (
            <div key={section.id} className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 hover:border-cyan-200 transition-all shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">{section.section_title}</h3>
              <div className="space-y-2 sm:space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-[0.3rem] sm:mt-[0.4rem] h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-900 font-semibold">{item.label}</p>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-gray-600">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Layout: Info Card (Note, avvisi)
        if (section.layout_type === "info_card") {
          return (
            <div key={section.id} className="rounded-xl sm:rounded-2xl border border-gray-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-4 sm:p-6 hover:border-cyan-200 transition-all shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">{section.section_title}</h3>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
                {section.items.map((item, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {item.text}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        return null;
          })}
        </div>
      </div>
    </section>
  );
}
