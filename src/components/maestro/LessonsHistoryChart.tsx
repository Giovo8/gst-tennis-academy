"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { MAESTRO_COLORS } from "./chartColors";
import { ChartEmptyState } from "./ChartEmptyState";

export interface HistoryPoint {
  label: string;
  lessonsCount: number;
}

function HistoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value ?? 0;
  return (
    <div className="bg-white rounded-lg border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-secondary mb-1">{label}</p>
      <p className="flex items-center gap-2 text-secondary/80">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: MAESTRO_COLORS.secondary }} />
        <span className="flex-1">Lezioni</span>
        <span className="font-medium tabular-nums">{value}</span>
      </p>
    </div>
  );
}

/**
 * Andamento delle lezioni svolte nel periodo selezionato (giornaliero per settimana/mese,
 * mensile per anno). Area chart con gradiente, coerente con gli altri grafici della dashboard.
 */
export default function LessonsHistoryChart({ data }: { data: HistoryPoint[] }) {
  const total = data.reduce((acc, d) => acc + d.lessonsCount, 0);
  if (total === 0) {
    return (
      <ChartEmptyState
        icon={<LineChartIcon className="h-8 w-8" />}
        title="Nessuna lezione nel periodo"
        description="Lo storico apparirà dopo le prime lezioni svolte."
      />
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillLessonsHistory" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={MAESTRO_COLORS.secondary} stopOpacity={0.35} />
              <stop offset="95%" stopColor={MAESTRO_COLORS.secondary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={MAESTRO_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: MAESTRO_COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: MAESTRO_COLORS.axisLine }}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: MAESTRO_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<HistoryTooltip />} />
          <Area
            type="monotone"
            dataKey="lessonsCount"
            name="Lezioni"
            stroke={MAESTRO_COLORS.secondary}
            strokeWidth={2}
            fill="url(#fillLessonsHistory)"
            dot={data.length <= 12 ? { r: 3, fill: MAESTRO_COLORS.secondary, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
