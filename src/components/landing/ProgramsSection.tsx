"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type Program = {
  id: string;
  title: string;
  focus: string;
  points: string[];
};

const defaultPrograms: Program[] = [
  {
    id: "1",
    title: "Junior Academy",
    focus: "U10 - U16 | Tecnica & coordinazione",
    points: [
      "Gruppi per età e livello con progressioni mirate",
      "Match play guidato e tornei federali",
      "Report trimestrale con video analysis",
    ],
  },
  {
    id: "2",
    title: "Agonisti",
    focus: "Ranking, circuito Fitp & ITF",
    points: [
      "Pianificazione tornei e periodizzazione",
      "Strength & conditioning con test mensili",
      "Mental coaching e gestione pressione",
    ],
  },
  {
    id: "3",
    title: "Adulti & Club",
    focus: "Livelli 3.0 - 5.0 | Performance e divertimento",
    points: [
      "Lesson pack individuali e small group",
      "Video analisi per colpi chiave e pattern",
      "Clinic weekend e sparring dedicato",
    ],
  },
];

export default function ProgramsSection() {
  const [programs, setPrograms] = useState<Program[]>(defaultPrograms);

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setPrograms(data);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei programmi:", error);
      // Mantiene i default in caso di errore
    }
  }

  return (
    <section id="programmi" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
            Programmi
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Percorsi su misura per ogni livello
          </h2>
        </div>
        <div className="hidden rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent sm:inline-flex">
          Indoor & Outdoor
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {programs.map((program) => (
          <article key={program.id} className="flex h-full flex-col rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {program.title}
                </h3>
                <p className="text-sm text-muted">{program.focus}</p>
              </div>
              <span className="rounded-full bg-accent-15 px-3 py-1 text-xs font-semibold text-accent">
                Focus
              </span>
            </div>
            <ul className="space-y-3 text-sm text-muted">
              {program.points.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                >
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-accent-strong" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

