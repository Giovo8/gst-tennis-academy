import type { ReactNode } from "react";

/**
 * Stato vuoto condiviso dai grafici dell'Area Maestro.
 */
export function ChartEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="h-14 w-14 rounded-full bg-secondary/5 text-secondary/40 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-secondary">{title}</p>
      <p className="text-xs text-secondary/60 mt-1 max-w-xs">{description}</p>
    </div>
  );
}
