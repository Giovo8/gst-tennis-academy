"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { COURT_PALETTE } from "./chartColors";

interface CourtAgg {
  court: string;
  bookings: number;
  hours: number;
}

interface BookingsByCourtChartProps {
  data: CourtAgg[];
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
        <span>Prenotazioni</span>
        <span className="font-medium tabular-nums">{row.bookings}</span>
      </p>
      <p className="text-secondary/80 flex justify-between gap-4">
        <span>Ore prenotate</span>
        <span className="font-medium tabular-nums">{row.hours} h</span>
      </p>
    </div>
  );
}

/**
 * Occupazione campi nel periodo selezionato: numero prenotazioni per campo.
 * Stessa scala colori (frozen-lake) usata per il grafico ricavi per campo in Contabilita.
 */
export default function BookingsByCourtChart({ data }: BookingsByCourtChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-secondary/60">
        Nessuna prenotazione campi nel periodo.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0000000d" vertical={false} />
          <XAxis
            dataKey="court"
            tick={{ fontSize: 11, fill: "#034863" }}
            tickLine={false}
            axisLine={{ stroke: "#0000001a" }}
            tickFormatter={(court: string) => court.replace(/^Campo\s+/i, "")}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#034863" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0000000a" }} />
          <Bar dataKey="bookings" name="Prenotazioni" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {data.map((entry, index) => (
              <Cell key={entry.court} fill={COURT_PALETTE[index % COURT_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
