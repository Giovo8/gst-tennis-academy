"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

type QuickStat = {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "cyan";
};

type QuickStatsProps = {
  stats: QuickStat[];
};

const colorClasses = {
  blue: "from-blue-600 to-cyan-500",
  green: "from-green-600 to-emerald-500",
  yellow: "from-yellow-600 to-amber-500",
  red: "from-red-600 to-rose-500",
  purple: "from-purple-600 to-violet-500",
  cyan: "from-cyan-600 to-teal-500",
};

export default function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-xl border border-white/10 bg-[#042b4a] p-4 hover:border-white/20 transition-all hover:scale-105"
        >
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClasses[stat.color || "blue"]} opacity-10 blur-2xl`}></div>
          
          <div className="relative z-10">
            {stat.icon && (
              <div className="mb-2 text-gray-400">
                {stat.icon}
              </div>
            )}
            
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-xs text-gray-400 mb-2">{stat.label}</p>
            
            {stat.change !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${stat.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {stat.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(stat.change)}%</span>
                {stat.changeLabel && (
                  <span className="text-gray-500 ml-1">{stat.changeLabel}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
