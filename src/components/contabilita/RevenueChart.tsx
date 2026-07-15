"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export interface RevenuePoint {
  label: string;
  campi: number;
  corsiQuota: number;
  corsiIncassato: number;
}

interface RevenueChartProps {
  data: RevenuePoint[];
}

const COLOR_CAMPI = "#08b3f7"; // frozen-lake 500 (primary)
const COLOR_QUOTA = "#034863"; // frozen-lake 800 (secondary)
const COLOR_INCASSATO = "#0690c6"; // frozen-lake 600

// Formatta gli importi sull'asse Y in modo compatto (es. 1.2k €).
function formatAxis(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k €`;
  return `${value} €`;
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white rounded-lg border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-secondary mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-secondary/80">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="flex-1">{entry.name}</span>
          <span className="font-medium tabular-nums">{formatCurrency(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Grafico andamento entrate (Recharts): aree per ricavi campi e quota corsi,
 * linea per l'incassato corsi. Palette frozen-lake, responsive.
 */
export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillCampi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_CAMPI} stopOpacity={0.35} />
              <stop offset="95%" stopColor={COLOR_CAMPI} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillQuota" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_QUOTA} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLOR_QUOTA} stopOpacity={0.02} />
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
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="campi"
            name="Ricavi campi"
            stroke={COLOR_CAMPI}
            strokeWidth={2}
            fill="url(#fillCampi)"
          />
          <Area
            type="monotone"
            dataKey="corsiQuota"
            name="Quota corsi"
            stroke={COLOR_QUOTA}
            strokeWidth={2}
            fill="url(#fillQuota)"
          />
          <Line
            type="monotone"
            dataKey="corsiIncassato"
            name="Incassato corsi"
            stroke={COLOR_INCASSATO}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
