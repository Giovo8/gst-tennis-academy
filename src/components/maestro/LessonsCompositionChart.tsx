"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { COMPOSITION_COLORS } from "./chartColors";
import { ChartEmptyState } from "./ChartEmptyState";

interface LessonsCompositionChartProps {
  privata: number;
  gruppo: number;
  corso: number;
}

/**
 * Donut della composizione delle lezioni svolte: individuali / di gruppo / corso.
 */
export default function LessonsCompositionChart({ privata, gruppo, corso }: LessonsCompositionChartProps) {
  const entries = [
    { name: "Individuali", value: privata, color: COMPOSITION_COLORS.privata },
    { name: "Di gruppo", value: gruppo, color: COMPOSITION_COLORS.gruppo },
    { name: "Corso", value: corso, color: COMPOSITION_COLORS.corso },
  ].filter((e) => e.value > 0);

  const total = entries.reduce((sum, e) => sum + e.value, 0);

  if (total === 0) {
    return (
      <ChartEmptyState
        icon={<PieChartIcon className="h-8 w-8" />}
        title="Nessuna lezione svolta"
        description="La composizione apparirà dopo le prime lezioni."
      />
    );
  }

  return (
    <div className="w-full">
      <div className="w-full h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={entries}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {entries.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-secondary tabular-nums">{total}</span>
          <span className="text-xs text-secondary/60">lezioni</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {entries.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5 text-xs text-secondary/80">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            {entry.name} · {entry.value}
          </span>
        ))}
      </div>
    </div>
  );
}
