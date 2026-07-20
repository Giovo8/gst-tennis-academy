"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { CATEGORY_PALETTE } from "./chartColors";

interface CourseAgg {
  courseId: string;
  name: string;
  iscritti: number;
}

interface CourseEnrollmentsChartProps {
  data: CourseAgg[];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: CourseAgg }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="bg-white rounded-lg border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-secondary mb-1">{row.name}</p>
      <p className="text-secondary/80 flex justify-between gap-4">
        <span>Iscritti</span>
        <span className="font-medium tabular-nums">{row.iscritti}</span>
      </p>
    </div>
  );
}

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * Iscritti per corso (top corsi), bar chart orizzontale.
 */
export default function CourseEnrollmentsChart({ data }: CourseEnrollmentsChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-secondary/60">
        Nessuna iscrizione ai corsi.
      </div>
    );
  }

  const height = Math.max(220, data.length * 44);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#0000000d" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={{ stroke: "#0000001a" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={false}
            width={140}
            tickFormatter={(name: string) => truncate(name, 18)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0000000a" }} />
          <Bar dataKey="iscritti" name="Iscritti" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell key={entry.courseId} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
