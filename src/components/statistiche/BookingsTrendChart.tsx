"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { CHART_COLORS } from "./chartColors";

export interface BookingsTrendPoint {
  label: string;
  campo: number;
  lezione: number;
  arena: number;
}

interface BookingsTrendChartProps {
  data: BookingsTrendPoint[];
}

const SERIES = [
  { key: "campo", name: "Campo", color: CHART_COLORS.campo },
  { key: "lezione", name: "Lezioni", color: CHART_COLORS.lezione },
  { key: "arena", name: "Arena", color: CHART_COLORS.arena },
] as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number; color?: string; name?: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);
  if (total <= 0) return null;
  return (
    <div className="bg-white rounded-lg border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-secondary mb-1">{label}</p>
      {payload
        .filter((p) => (p.value ?? 0) > 0)
        .map((p) => (
          <p key={p.dataKey} className="flex items-center gap-2 text-secondary/80">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="flex-1">{p.name}</span>
            <span className="font-medium tabular-nums">{p.value}</span>
          </p>
        ))}
    </div>
  );
}

/**
 * Andamento prenotazioni per tipo (campo / lezioni / arena), area chart impilata.
 * Colori allineati alla timeline prenotazioni admin.
 */
export default function BookingsTrendChart({ data }: BookingsTrendChartProps) {
  const hasData = data.some((d) => d.campo + d.lezione + d.arena > 0);
  if (!hasData) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-secondary/60">
        Nessuna prenotazione nel periodo.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`fillTrend-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#0000000d" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={{ stroke: "#0000001a" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#034863" }}
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stackId="1"
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#fillTrend-${s.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
