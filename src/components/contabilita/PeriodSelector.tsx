"use client";

export type Period = "week" | "month" | "year";

interface PeriodSelectorProps {
  value: Period;
  onChange: (value: Period) => void;
}

const OPTIONS: { value: Period; label: string }[] = [
  { value: "week", label: "Settimana" },
  { value: "month", label: "Mese" },
  { value: "year", label: "Anno" },
];

/**
 * Segmented control per selezionare il periodo della contabilità.
 * Stile allineato ai filtri admin (bookings/corsi).
 */
export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-11 shrink-0 rounded-lg border px-4 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
              isSelected
                ? "border-secondary bg-secondary text-white"
                : "border-black/10 bg-white text-secondary hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
