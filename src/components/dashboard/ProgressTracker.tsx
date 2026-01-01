"use client";

import { Target, CheckCircle } from "lucide-react";

type ProgressItem = {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
};

type ProgressTrackerProps = {
  items: ProgressItem[];
  title?: string;
};

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
};

export default function ProgressTracker({ items, title = "Obiettivi" }: ProgressTrackerProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#042b4a] p-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-5 w-5 text-green-400" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const percentage = Math.min((item.current / item.target) * 100, 100);
          const isComplete = item.current >= item.target;

          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isComplete && <CheckCircle className="h-4 w-4 text-green-400" />}
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-300">
                  {item.current}{item.unit || ""} / {item.target}{item.unit || ""}
                </span>
              </div>

              <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                    colorClasses[item.color || "blue"]
                  }`}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {percentage.toFixed(0)}% completato
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
