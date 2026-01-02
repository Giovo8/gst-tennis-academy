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
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm p-6 text-white transition-all hover:scale-105 hover:shadow-xl`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80 mb-2">{title}</p>
          <p className="text-4xl font-bold tracking-tight">{value}</p>
          
          {trend && (
            <div className="mt-3 flex items-center gap-1.5 text-sm">
              {trend.isPositive !== false ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium">{trend.label}</span>
            </div>
          )}
        </div>
        
        <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {/* Decorative Pattern */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
    </div>
  );
}
