"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { CHART_COLORS } from "./chartColors";

interface BookingsByTypeChartProps {
  byType: Record<string, number>;
}

const TYPE_LABELS: Record<string, string> = {
  campo: "Campo",
  lezione_privata: "Lezione privata",
  lezione_gruppo: "Lezione di gruppo",
  arena: "Arena",
};

function typeColor(tipo: string): string {
  if (tipo === "campo") return CHART_COLORS.campo;
  if (tipo === "lezione_privata" || tipo === "lezione_gruppo") return CHART_COLORS.lezione;
  if (tipo === "arena") return CHART_COLORS.arena;
  return CHART_COLORS.neutral;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: { color?: string } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="bg-white rounded-lg border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="flex items-center gap-2 text-secondary/80">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: entry.payload?.color }} />
        <span className="flex-1">{entry.name}</span>
        <span className="font-medium tabular-nums">{entry.value}</span>
      </p>
    </div>
  );
}

/**
 * Donut prenotazioni per tipo nel periodo selezionato.
 */
export default function BookingsByTypeChart({ byType }: BookingsByTypeChartProps) {
  const entries = Object.entries(byType)
    .filter(([, value]) => value > 0)
    .map(([tipo, value]) => ({
      name: TYPE_LABELS[tipo] ?? tipo,
      value,
      color: typeColor(tipo),
    }))
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((sum, e) => sum + e.value, 0);

  if (entries.length === 0 || total <= 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-secondary/60">
        Nessuna prenotazione nel periodo.
      </div>
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
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-secondary tabular-nums">{total}</span>
          <span className="text-xs text-secondary/60">prenotazioni</span>
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
