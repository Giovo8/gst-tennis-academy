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
      // Use default programs on error
    }
  }

  return (
    <section id="programmi" className="py-20">
      <div className="container section">
        <div className="section-header space-y-2 mb-12">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-cyan-300">
            Programmi
          </p>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-200 to-pink-300 bg-clip-text text-transparent leading-tight">
          Percorsi su misura per ogni livello
        </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
        {programs.map((program) => (
          <article key={program.id} className="group flex h-full flex-col rounded-2xl border border-purple-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent backdrop-blur-xl p-6 hover:border-purple-400/40 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-200 to-pink-300 bg-clip-text text-transparent">
                  {program.title}
                </h3>
                <p className="text-sm text-gray-400">{program.focus}</p>
              </div>
              <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-400/30">
                Focus
              </span>
            </div>
            <ul className="space-y-3 text-sm text-gray-300">
              {program.points.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 rounded-xl border border-purple-400/20 bg-cyan-500/5 px-3 py-2 hover:border-purple-400/30 hover:bg-cyan-500/10 transition-all"
                >
                  <span className="mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}

