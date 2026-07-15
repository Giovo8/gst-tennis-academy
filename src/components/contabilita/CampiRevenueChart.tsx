"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { CHART_COLORS } from "./chartColors";

export interface CampiRevenuePoint {
  label: string;
  campi: number;
}

interface CampiRevenueChartProps {
  data: CampiRevenuePoint[];
}

function formatAxis(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k €`;
  return `${value} €`;
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
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.campo }} />
        <span className="flex-1">Ricavi campi</span>
        <span className="font-medium tabular-nums">{formatCurrency(payload[0].value ?? 0)}</span>
      </p>
    </div>
  );
}

/**
 * Grafico andamento ricavi campi (Recharts): area singola, colore allineato al blocco
 * "campo" della timeline prenotazioni admin.
 */
export default function CampiRevenueChart({ data }: CampiRevenueChartProps) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillCampiOnly" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.campo} stopOpacity={0.35} />
              <stop offset="95%" stopColor={CHART_COLORS.campo} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#0000000d" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={{ stroke: "#0000001a" }}
          />
          <YAxis
            tickFormatter={formatAxis}
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="campi"
            name="Ricavi campi"
            stroke={CHART_COLORS.campo}
            strokeWidth={2}
            fill="url(#fillCampiOnly)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
