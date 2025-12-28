"use client";

import React from "react";

type Color = "blue" | "green" | "purple" | "yellow" | "red" | "neutral" | "teal" | "indigo" | "sky" | "violet" | "orange" | "lime";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color?: Color;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
  className?: string;
}

const styles: Record<Color, { wrapper: string; gradient: string; iconBg: string }> = {
  blue: {
    wrapper: "rounded-2xl border-2 border-blue-400/50 bg-gradient-to-br from-blue-500/25 via-blue-600/20 to-blue-700/15 backdrop-blur-sm p-5 hover:border-blue-400/70 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300",
    gradient: "from-blue-300 via-blue-400 to-blue-600",
    iconBg: "bg-gradient-to-br from-blue-500/40 to-blue-600/30 text-blue-200 shadow-md",
  },
  green: {
    wrapper: "rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 via-green-600/20 to-green-700/15 backdrop-blur-sm p-5 hover:border-emerald-400/70 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300",
    gradient: "from-emerald-300 via-emerald-400 to-green-600",
    iconBg: "bg-gradient-to-br from-emerald-500/40 to-green-600/30 text-emerald-200 shadow-md",
  },
  purple: {
    wrapper: "rounded-2xl border-2 border-purple-400/50 bg-gradient-to-br from-purple-500/25 via-purple-600/20 to-purple-700/15 backdrop-blur-sm p-5 hover:border-purple-400/70 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300",
    gradient: "from-purple-300 via-purple-400 to-purple-600",
    iconBg: "bg-gradient-to-br from-purple-500/40 to-purple-600/30 text-purple-200 shadow-md",
  },
  yellow: {
    wrapper: "rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/25 via-yellow-600/20 to-yellow-700/15 backdrop-blur-sm p-5 hover:border-amber-400/70 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300",
    gradient: "from-amber-300 via-amber-400 to-yellow-600",
    iconBg: "bg-gradient-to-br from-amber-500/40 to-yellow-600/30 text-amber-200 shadow-md",
  },
  red: {
    wrapper: "rounded-2xl border-2 border-red-400/50 bg-gradient-to-br from-red-500/25 via-rose-600/20 to-red-700/15 backdrop-blur-sm p-5 hover:border-red-400/70 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300",
    gradient: "from-red-300 via-red-400 to-rose-600",
    iconBg: "bg-gradient-to-br from-red-500/40 to-rose-600/30 text-red-200 shadow-md",
  },
  neutral: {
    wrapper: "rounded-2xl border-2 border-slate-400/50 bg-gradient-to-br from-slate-500/25 via-slate-600/20 to-slate-700/15 backdrop-blur-sm p-5 hover:border-slate-400/70 hover:shadow-xl hover:shadow-slate-500/30 transition-all duration-300",
    gradient: "from-slate-300 via-slate-400 to-gray-600",
    iconBg: "bg-gradient-to-br from-slate-500/40 to-slate-600/30 text-slate-200 shadow-md",
  },
  teal: {
    wrapper: "rounded-2xl border-2 border-teal-400/50 bg-gradient-to-br from-teal-500/25 via-teal-600/20 to-teal-700/15 backdrop-blur-sm p-5 hover:border-teal-400/70 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300",
    gradient: "from-teal-300 via-teal-400 to-teal-600",
    iconBg: "bg-gradient-to-br from-teal-500/40 to-teal-600/30 text-teal-200 shadow-md",
  },
  indigo: {
    wrapper: "rounded-2xl border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-500/25 via-indigo-600/20 to-indigo-700/15 backdrop-blur-sm p-5 hover:border-indigo-400/70 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300",
    gradient: "from-indigo-300 via-indigo-400 to-indigo-600",
    iconBg: "bg-gradient-to-br from-indigo-500/40 to-indigo-600/30 text-indigo-200 shadow-md",
  },
  sky: {
    wrapper: "rounded-2xl border-2 border-sky-400/50 bg-gradient-to-br from-sky-500/25 via-sky-600/20 to-sky-700/15 backdrop-blur-sm p-5 hover:border-sky-400/70 hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300",
    gradient: "from-sky-300 via-sky-400 to-sky-600",
    iconBg: "bg-gradient-to-br from-sky-500/40 to-sky-600/30 text-sky-200 shadow-md",
  },
  violet: {
    wrapper: "rounded-2xl border-2 border-violet-400/50 bg-gradient-to-br from-violet-500/25 via-violet-600/20 to-violet-700/15 backdrop-blur-sm p-5 hover:border-violet-400/70 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300",
    gradient: "from-violet-300 via-violet-400 to-violet-600",
    iconBg: "bg-gradient-to-br from-violet-500/40 to-violet-600/30 text-violet-200 shadow-md",
  },
  orange: {
    wrapper: "rounded-2xl border-2 border-orange-400/50 bg-gradient-to-br from-orange-500/25 via-orange-600/20 to-orange-700/15 backdrop-blur-sm p-5 hover:border-orange-400/70 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300",
    gradient: "from-orange-300 via-orange-400 to-orange-600",
    iconBg: "bg-gradient-to-br from-orange-500/40 to-orange-600/30 text-orange-200 shadow-md",
  },
  lime: {
    wrapper: "rounded-2xl border-2 border-lime-400/50 bg-gradient-to-br from-lime-500/25 via-lime-600/20 to-lime-700/15 backdrop-blur-sm p-5 hover:border-lime-400/70 hover:shadow-xl hover:shadow-lime-500/30 transition-all duration-300",
    gradient: "from-lime-300 via-lime-400 to-lime-600",
    iconBg: "bg-gradient-to-br from-lime-500/40 to-lime-600/30 text-lime-200 shadow-md",
  },
};

export default function StatCard({ title, value, icon, color = "blue", size = "md", footer, className = "" }: StatCardProps) {
  const s = styles[color] || styles.blue;

  const sizeMap: Record<string, { valueClass: string; titleClass: string; iconSize: string }> = {
    sm: { valueClass: "text-2xl", titleClass: "text-xs uppercase tracking-wider font-semibold", iconSize: "w-10 h-10" },
    md: { valueClass: "text-3xl", titleClass: "text-xs uppercase tracking-wider font-semibold", iconSize: "w-12 h-12" },
    lg: { valueClass: "text-4xl", titleClass: "text-sm uppercase tracking-wider font-semibold", iconSize: "w-14 h-14" },
  };

  const sizeCfg = sizeMap[size] || sizeMap.md;

  return (
    <div className={`${s.wrapper} ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={`${sizeCfg.titleClass} text-gray-400 mb-2`}>{title}</p>
          <p className={`${sizeCfg.valueClass} font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent leading-tight`}>
            {value}
          </p>
        </div>
        <div className={`${sizeCfg.iconSize} ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
      {footer && (
        <div className="pt-4 mt-4 border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  );
}
