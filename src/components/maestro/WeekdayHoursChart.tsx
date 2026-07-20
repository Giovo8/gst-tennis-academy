"use client";

import { CalendarDays } from "lucide-react";
import { MAESTRO_COLORS } from "./chartColors";
import { ChartEmptyState } from "./ChartEmptyState";

export interface WeekdayPoint {
  label: string;
  count: number;
}

const SECONDARY_RGB = "3, 72, 99"; // MAESTRO_COLORS.secondary (#034863)

/**
 * Ore di lezione per giorno della settimana corrente. Il giorno odierno e' evidenziato
 * in una cella grande a sinistra, gli altri 6 giorni in una mini griglia 3x2 a destra.
 */
export default function WeekdayHoursChart({ data, todayIdx }: { data: WeekdayPoint[]; todayIdx: number }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) {
    return (
      <ChartEmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Dati insufficienti"
        description="La distribuzione settimanale apparirà dopo le prime lezioni."
      />
    );
  }

  const max = Math.max(...data.map((d) => d.count));
  const cellStyle = (count: number) => {
    const alpha = count === 0 ? 0.06 : 0.18 + (count / max) * 0.82;
    return { alpha, textColor: alpha > 0.5 ? "#ffffff" : MAESTRO_COLORS.secondary };
  };

  const today = data[todayIdx];
  const otherDays = data.filter((_, i) => i !== todayIdx);
  const { alpha: todayAlpha, textColor: todayTextColor } = cellStyle(today.count);

  return (
    <div className="w-full py-4">
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 max-w-xl mx-auto">
        {/* Giorno odierno: cella grande */}
        <div className="w-full sm:w-28 flex flex-col items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold" style={{ color: MAESTRO_COLORS.axis }}>
            {today.label}
          </span>
          <div
            className="w-full h-28 sm:h-auto sm:flex-1 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `rgba(${SECONDARY_RGB}, ${todayAlpha})` }}
            title={`${today.label}: ${today.count}h`}
          >
            <span className="text-4xl font-bold tabular-nums" style={{ color: todayTextColor }}>
              {today.count}
            </span>
          </div>
        </div>

        {/* Altri 6 giorni: griglia 3 sopra + 3 sotto */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1 w-full">
          {otherDays.map((d) => {
            const { alpha, textColor } = cellStyle(d.count);
            return (
              <div key={d.label} className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: MAESTRO_COLORS.axis }}>
                  {d.label}
                </span>
                <div
                  className="w-full aspect-square rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `rgba(${SECONDARY_RGB}, ${alpha})` }}
                  title={`${d.label}: ${d.count}h`}
                >
                  <span className="text-lg font-bold tabular-nums" style={{ color: textColor }}>
                    {d.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
