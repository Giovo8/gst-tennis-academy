"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type Course = {
  id: string;
  type: "iscrizione" | "base" | "avanzato" | "agonistico" | "extra" | "sconto";
  title: string;
  description?: string;
  frequency?: string;
  price_monthly?: number;
  price_yearly?: number;
  details?: string[];
  order_index: number;
  active: boolean;
};

export default function CoursesSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Errore nel caricamento dei corsi:", error);
    } finally {
      setLoading(false);
    }
  }

  // Group courses by type
  const iscrizione = courses.find((c) => c.type === "iscrizione");
  const baseCorsi = courses.filter((c) => c.type === "base");
  const avanzatoCorsi = courses.filter((c) => c.type === "avanzato");
  const agonistico = courses.find((c) => c.type === "agonistico");
  const extra = courses.filter((c) => c.type === "extra");
  const sconti = courses.filter((c) => c.type === "sconto");

  if (loading) {
    return (
      <section id="programmi" className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </section>
    );
  }

  return (
    <section id="programmi" className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
          Corsi e Abbonamenti
        </p>
        <h2 className="text-2xl font-semibold text-white">
          Scegli il tuo percorso tennis
        </h2>
      </div>

      {/* Quota Iscrizione */}
      {iscrizione && (
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">{iscrizione.title}</h3>
              {iscrizione.description && (
                <p className="text-sm text-muted">{iscrizione.description}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">{iscrizione.price_yearly}€</span>
            </div>
          </div>
        </div>
      )}

      {/* Corso Base */}
      {baseCorsi.length > 0 && (
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">
              {baseCorsi[0].title.replace(/ - (Mono|Bi|Tri)settimanale/i, "")}
            </h3>
            {baseCorsi[0].description && (
              <p className="text-sm text-muted">{baseCorsi[0].description}</p>
            )}
          </div>
          
          <div className="grid gap-3 md:grid-cols-3">
            {baseCorsi.map((corso) => (
              <div key={corso.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wider text-accent mb-2">
                  {corso.frequency === "mono" && "Monosettimanale"}
                  {corso.frequency === "bi" && "Bisettimanale"}
                  {corso.frequency === "tri" && "Trisettimanale"}
                </p>
                <div className="space-y-1">
                  {corso.price_monthly && (
                    <p className="text-lg font-bold text-white">
                      {corso.price_monthly}€<span className="text-sm font-normal text-muted"> /mese</span>
                    </p>
                  )}
                  {corso.price_yearly && (
                    <p className="text-lg font-bold text-white">
                      {corso.price_yearly}€<span className="text-sm font-normal text-muted"> /anno</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corso Avanzato */}
      {avanzatoCorsi.length > 0 && (
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">
              {avanzatoCorsi[0].title.replace(/ - (Mono|Bi|Tri)settimanale/i, "")}
            </h3>
            {avanzatoCorsi[0].description && (
              <p className="text-sm text-muted">{avanzatoCorsi[0].description}</p>
            )}
          </div>
          
          <div className="grid gap-3 md:grid-cols-3">
            {avanzatoCorsi.map((corso) => (
              <div key={corso.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wider text-accent mb-2">
                  {corso.frequency === "mono" && "Monosettimanale"}
                  {corso.frequency === "bi" && "Bisettimanale"}
                  {corso.frequency === "tri" && "Trisettimanale"}
                </p>
                <div className="space-y-1">
                  {corso.price_monthly && (
                    <p className="text-lg font-bold text-white">
                      {corso.price_monthly}€<span className="text-sm font-normal text-muted"> /mese</span>
                    </p>
                  )}
                  {corso.price_yearly && (
                    <p className="text-lg font-bold text-white">
                      {corso.price_yearly}€<span className="text-sm font-normal text-muted"> /anno</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corso Agonistico */}
      {agonistico && (
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">{agonistico.title}</h3>
            {agonistico.details && agonistico.details.length > 0 && (
              <div className="space-y-1 text-sm text-muted">
                {agonistico.details.map((detail, i) => (
                  <p key={i}>{detail}</p>
                ))}
              </div>
            )}
          </div>
          
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 inline-block">
            <p className="text-3xl font-bold text-white">
              {agonistico.price_yearly}€<span className="text-lg font-normal text-muted"> /anno</span>
            </p>
          </div>
        </div>
      )}

      {/* Extra e Sconti */}
      {(extra.length > 0 || sconti.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Extra */}
          {extra.length > 0 && (
            <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Extra</h3>
              <div className="space-y-3">
                {extra.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-sm text-muted">{item.title}</span>
                    <span className="text-lg font-bold text-white">{item.price_yearly}€</span>
                  </div>
                ))}
              </div>
              {extra.some((item) => item.details && item.details.length > 0) && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {extra.map((item) =>
                    item.details?.map((detail, i) => (
                      <p key={i} className="text-xs text-muted mt-2">
                        {detail}
                      </p>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sconti */}
          {sconti.length > 0 && (
            <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sconti</h3>
              <div className="space-y-3">
                {sconti.map((sconto) => (
                  <div key={sconto.id} className="flex items-start gap-2">
                    <span className="mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-semibold">{sconto.title}</p>
                      {sconto.description && (
                        <p className="text-xs text-muted">{sconto.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {sconti.some((s) => s.details && s.details.length > 0) && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {sconti.map((s) =>
                    s.details?.map((detail, i) => (
                      <p key={i} className="text-xs text-muted mt-2">
                        {detail}
                      </p>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
