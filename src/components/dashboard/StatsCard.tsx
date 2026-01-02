"use client";

import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: "green" | "blue" | "purple" | "orange";
}

const colorClasses = {
  green: "from-emerald-500/90 to-emerald-700/90 border-emerald-400/30",
  blue: "from-blue-500/90 to-blue-700/90 border-blue-400/30",
  purple: "from-purple-500/90 to-purple-700/90 border-purple-400/30",
  orange: "from-orange-500/90 to-orange-700/90 border-orange-400/30",
};

export function StatsCard({ title, value, icon: Icon, trend, color = "green" }: StatsCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm p-4 sm:p-6 text-white transition-all hover:scale-105 hover:shadow-xl touch-manipulation`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-all">{value}</p>
          
          {trend && (
            <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs sm:text-sm">
              {trend.isPositive !== false ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              )}
              <span className="font-medium truncate">{trend.label}</span>
            </div>
          )}
        </div>
        
        <div className="rounded-lg sm:rounded-xl bg-white/20 p-2 sm:p-3 backdrop-blur-sm flex-shrink-0">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
      
      {/* Decorative Pattern */}
      <div className="absolute -right-6 -top-6 sm:-right-8 sm:-top-8 h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-white/10 blur-2xl" />
    </div>
  );
}
