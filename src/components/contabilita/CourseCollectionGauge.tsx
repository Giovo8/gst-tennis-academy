"use client";

import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { CHART_COLORS } from "./chartColors";

interface CourseCollectionGaugeProps {
  quota: number;
  incassato: number;
}

/**
 * Gauge radiale % incassato corsi rispetto alla quota attesa. I corsi non hanno ancora
 * una gestione pagamenti completa, quindi e' un indicatore di massima, non un dato certo.
 */
export default function CourseCollectionGauge({ quota, incassato }: CourseCollectionGaugeProps) {
  const pct = quota > 0 ? Math.min(100, Math.round((incassato / quota) * 100)) : 0;
  const data = [{ name: "Incassato", value: pct, fill: CHART_COLORS.incassatoCorsi }];

  return (
    <div className="w-full h-64 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius="72%"
          outerRadius="92%"
          barSize={16}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#0000000d" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-secondary tabular-nums">{pct}%</span>
        <span className="text-xs text-secondary/60 mt-1">incassato</span>
        <span className="text-[11px] text-secondary/50 mt-2 text-center px-4">
          {formatCurrency(incassato)} su {formatCurrency(quota)} attesi
        </span>
      </div>
    </div>
  );
}
