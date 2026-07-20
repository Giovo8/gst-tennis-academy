"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { CHART_COLORS } from "./chartColors";

export interface NewUsersPoint {
  label: string;
  nuoviUtenti: number;
}

interface NewUsersTrendChartProps {
  data: NewUsersPoint[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white rounded-lg border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-secondary mb-1">{label}</p>
      <p className="flex items-center gap-2 text-secondary/80">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.nuoviUtenti }} />
        <span className="flex-1">Nuovi utenti</span>
        <span className="font-medium tabular-nums">{payload[0].value ?? 0}</span>
      </p>
    </div>
  );
}

/**
 * Nuove registrazioni nel periodo selezionato.
 */
export default function NewUsersTrendChart({ data }: NewUsersTrendChartProps) {
  const hasData = data.some((d) => d.nuoviUtenti > 0);
  if (!hasData) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-secondary/60">
        Nessuna nuova registrazione nel periodo.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0000000d" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#034863" }}
            tickLine={false}
            axisLine={{ stroke: "#0000001a" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0000000a" }} />
          <Bar dataKey="nuoviUtenti" name="Nuovi utenti" fill={CHART_COLORS.nuoviUtenti} radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
