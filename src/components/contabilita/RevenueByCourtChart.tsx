"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { COURT_PALETTE } from "./chartColors";

interface CourtAgg {
  court: string;
  amount: number;
  hours: number;
  bookings: number;
}

interface RevenueByCourtChartProps {
  data: CourtAgg[];
}

function formatAxis(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k €`;
  return `${value} €`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: CourtAgg }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="bg-white rounded-lg border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-secondary mb-1">{row.court}</p>
      <p className="text-secondary/80 flex justify-between gap-4">
        <span>Ricavo</span>
        <span className="font-medium tabular-nums">{formatCurrency(row.amount)}</span>
      </p>
      <p className="text-secondary/80 flex justify-between gap-4">
        <span>Ore prenotate</span>
        <span className="font-medium tabular-nums">{row.hours} h</span>
      </p>
      <p className="text-secondary/80 flex justify-between gap-4">
        <span>Prenotazioni</span>
        <span className="font-medium tabular-nums">{row.bookings}</span>
      </p>
    </div>
  );
}

/**
 * Bar chart ricavi per campo, con la stessa scala di blu (frozen-lake) usata nel resto
 * della dashboard: un colore diverso per campo, ciclico se i campi sono piu' della palette.
 */
export default function RevenueByCourtChart({ data }: RevenueByCourtChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-secondary/60">
        Nessun ricavo campi nel periodo.
      </div>
    );
  }

  const chartData = [...data].sort((a, b) => b.amount - a.amount);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0000000d" vertical={false} />
          <XAxis
            dataKey="court"
            tick={{ fontSize: 11, fill: "#034863" }}
            tickLine={false}
            axisLine={{ stroke: "#0000001a" }}
            tickFormatter={(court: string) => court.replace(/^Campo\s+/i, "")}
          />
          <YAxis
            tickFormatter={formatAxis}
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0000000a" }} />
          <Bar dataKey="amount" name="Ricavo" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {chartData.map((entry, index) => (
              <Cell key={entry.court} fill={COURT_PALETTE[index % COURT_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
