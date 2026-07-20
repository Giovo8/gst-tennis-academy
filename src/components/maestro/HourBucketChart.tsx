"use client";

import { Clock3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { MAESTRO_COLORS } from "./chartColors";
import { ChartEmptyState } from "./ChartEmptyState";

export interface HourBucketPoint {
  label: string;
  count: number;
}

function HourTooltip({
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
      <p className="font-semibold text-secondary mb-1">Fascia {label}</p>
      <p className="flex items-center gap-2 text-secondary/80">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: MAESTRO_COLORS.secondary }} />
        <span className="flex-1">Lezioni</span>
        <span className="font-medium tabular-nums">{payload[0].value ?? 0}</span>
      </p>
    </div>
  );
}

/**
 * Numero di lezioni per fascia oraria nella settimana corrente. Aiuta il maestro a capire
 * in quali momenti della giornata è più impegnato.
 */
export default function HourBucketChart({ data }: { data: HourBucketPoint[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) {
    return (
      <ChartEmptyState
        icon={<Clock3 className="h-8 w-8" />}
        title="Dati insufficienti"
        description="Le fasce orarie appariranno dopo le prime lezioni."
      />
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={MAESTRO_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: MAESTRO_COLORS.axis, fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: MAESTRO_COLORS.axisLine }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: MAESTRO_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<HourTooltip />} cursor={{ fill: "#0000000a" }} />
          <Bar dataKey="count" name="Lezioni" fill={MAESTRO_COLORS.secondary} radius={[6, 6, 0, 0]} maxBarSize={72}>
            <LabelList
              dataKey="count"
              position="top"
              formatter={(value: number) => (value > 0 ? value : "")}
              style={{ fontSize: 12, fill: MAESTRO_COLORS.axis, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
