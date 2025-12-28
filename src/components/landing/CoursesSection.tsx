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
        .from("courses")
        .select("*")
        .eq("active", true)
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
    <section id="programmi" className="py-20">
      <div className="container section">
        <div className="section-header space-y-2 mb-12">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-accent">
            Corsi e Abbonamenti
          </p>
          <h2 className="text-4xl font-bold gradient-text leading-tight">
          Scegli il tuo percorso tennis
        </h2>
      </div>

      <div className="flex flex-col gap-lg">
          {sections.map((section) => {
        // Layout: Single Box (Quota Iscrizione, Agonistico)
        if (section.layout_type === "single_box") {
          const item = section.items[0];
          return (
            <div key={section.id} className="group rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl p-8 hover:border-[var(--glass-border)] hover:border-opacity-70 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-accent transition-colors">{section.section_title}</h3>
                  {section.section_description && (
                    <p className="text-base text-gray-400">{section.section_description}</p>
                  )}
                  {item.details && item.details.length > 0 && (
                    <div className="mt-4 space-y-2 text-sm text-gray-400">
                      {item.details.map((detail: string, i: number) => (
                        <p key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-accent-strong rounded-full"></span>
                          {detail}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-left md:text-right shrink-0">
                  <span className="text-4xl font-bold gradient-text">{item.price}€</span>
                  {item.details && <span className="text-sm text-gray-400 block mt-1">/anno</span>}
                </div>
              </div>
            </div>
          );
        }

        // Layout: Frequency Grid (Base, Avanzato)
        if (section.layout_type === "frequency_grid") {
          return (
            <div key={section.id} className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{section.section_title}</h3>
                {section.section_description && (
                  <p className="text-base text-gray-400">{section.section_description}</p>
                )}
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="group rounded-xl border border-[var(--glass-border)] bg-accent-12 p-6 hover:bg-accent-15 hover:border-[var(--glass-border)] hover:border-opacity-70 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--shadow-glow)]">
                    <p className="text-xs uppercase tracking-wider text-accent mb-3 font-bold">{item.frequency}</p>
                    <div className="space-y-2">
                      {item.price_monthly && (
                        <p className="text-2xl font-bold gradient-text">
                          {item.price_monthly}€<span className="text-sm font-normal text-gray-400"> /mese</span>
                        </p>
                      )}
                      {item.price_yearly && (
                        <p className="text-2xl font-bold gradient-text">
                          {item.price_yearly}€<span className="text-sm font-normal text-gray-400"> /anno</span>
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
            <div key={section.id} className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{section.section_title}</h3>
              <div className="space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm text-muted">{item.label}</span>
                    <span className="text-lg font-bold text-white">{item.price}€</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Layout: List without Price (Sconti)
        if (section.layout_type === "list_no_price") {
          return (
            <div key={section.id} className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{section.section_title}</h3>
              <div className="space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-semibold">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-muted">{item.description}</p>
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
            <div key={section.id} className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{section.section_title}</h3>
              <div className="space-y-3 text-xs text-muted">
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
