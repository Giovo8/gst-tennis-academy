"use client";

import { Users } from "lucide-react";
import { MAESTRO_COLORS } from "./chartColors";

export interface AthleteSummary {
  id: string;
  fullName: string;
  lessonsCount: number;
  totalHours: number;
  lastLessonAt: string | null;
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function relativeLast(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const days = Math.floor((nowMs - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 7) return `${days} g fa`;
  if (days < 30) return `${Math.floor(days / 7)} sett fa`;
  if (days < 365) return `${Math.floor(days / 30)} mesi fa`;
  return `${Math.floor(days / 365)} anni fa`;
}

/**
 * Classifica degli atleti più seguiti dal maestro (numero di lezioni, ore totali, ultima lezione).
 * Utile per riconoscere gli allievi più assidui e chi non si vede da tempo (badge inattivo).
 */
export default function TopAthletesCard({ athletes, limit = 6 }: { athletes: AthleteSummary[]; limit?: number }) {
  const nowMs = new Date().getTime();
  const list = athletes.slice(0, limit);
  const maxLessons = Math.max(...list.map((a) => a.lessonsCount), 1);

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Atleti più seguiti</h2>
        <span className="text-xs text-secondary/50">{athletes.length} totali</span>
      </div>

      <div className="p-4">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-secondary/40">
            <Users className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">Nessun atleta seguito</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {list.map((a, i) => {
              const pct = (a.lessonsCount / maxLessons) * 100;
              const inactive =
                a.lastLessonAt &&
                nowMs - new Date(a.lastLessonAt).getTime() > 30 * 24 * 60 * 60 * 1000;
              return (
                <li key={a.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-secondary/5 transition-colors">
                  <span className="w-5 text-sm font-bold text-secondary/40 tabular-nums text-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="h-9 w-9 rounded-lg bg-secondary text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {initials(a.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-secondary text-sm truncate">{a.fullName}</p>
                      {inactive && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
                          Inattivo
                        </span>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-secondary/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: MAESTRO_COLORS.accent }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-secondary tabular-nums leading-none">
                      {a.lessonsCount} <span className="text-[10px] font-medium text-secondary/50">lez</span>
                    </p>
                    <p className="text-[11px] text-secondary/50 mt-1 whitespace-nowrap">
                      {Math.round(a.totalHours * 10) / 10}h · {relativeLast(a.lastLessonAt, nowMs)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
