"use client";

import React from "react";

type Color = "blue" | "green" | "purple" | "yellow" | "red" | "neutral";

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
    wrapper: "rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-accent-dark/5 backdrop-blur-xl p-6 hover:border-[var(--glass-border)] hover:border-opacity-70 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1",
    gradient: "from-accent-mid to-accent-strong",
    iconBg: "bg-accent-20 text-accent",
  },
  green: {
    wrapper: "rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-accent-dark/5 backdrop-blur-xl p-6 hover:border-[var(--glass-border)] hover:border-opacity-70 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1",
    gradient: "from-accent-mid to-accent-strong",
    iconBg: "bg-accent-20 text-accent",
  },
  purple: {
    wrapper: "rounded-2xl border border-purple-400/20 bg-gradient-to-br from-accent-strong/10 to-violet-600/5 backdrop-blur-xl p-6 hover:border-purple-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1",
    gradient: "from-accent-strong to-violet-400",
    iconBg: "bg-accent-20 text-purple-300",
  },
  yellow: {
    wrapper: "rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-yellow-500/10 to-amber-600/5 backdrop-blur-xl p-6 hover:border-yellow-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20 hover:-translate-y-1",
    gradient: "from-yellow-400 to-amber-400",
    iconBg: "bg-yellow-500/20 text-yellow-300",
  },
  red: {
    wrapper: "rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/10 to-rose-600/5 backdrop-blur-xl p-6 hover:border-red-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/20 hover:-translate-y-1",
    gradient: "from-red-400 to-rose-400",
    iconBg: "bg-accent-20 text-red-300",
  },
  neutral: {
    wrapper: "rounded-2xl border border-slate-400/20 bg-gradient-to-br from-slate-500/10 to-slate-600/5 backdrop-blur-xl p-6 hover:border-slate-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/20 hover:-translate-y-1",
    gradient: "from-slate-400 to-gray-400",
    iconBg: "bg-slate-500/20 text-slate-300",
  },
};

export default function StatCard({ title, value, icon, color = "blue", size = "md", footer, className = "" }: StatCardProps) {
  const s = styles[color] || styles.blue;

  const sizeMap: Record<string, { valueClass: string; titleClass: string; iconSize: string }> = {
    sm: { valueClass: "text-2xl", titleClass: "text-xs uppercase tracking-wider", iconSize: "w-10 h-10" },
    md: { valueClass: "text-3xl", titleClass: "text-sm uppercase tracking-wider", iconSize: "w-12 h-12" },
    lg: { valueClass: "text-4xl", titleClass: "text-base uppercase tracking-wider", iconSize: "w-14 h-14" },
  };

  const sizeCfg = sizeMap[size] || sizeMap.md;

  return (
    <div className={`${s.wrapper} ${className} group relative overflow-hidden`.trim()}>
      {/* Animated background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
           style={{background: `linear-gradient(135deg, rgba(125,227,255,0.05) 0%, rgba(47,125,225,0.1) 100%)`}} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className={`${sizeCfg.titleClass} text-gray-400 mb-2`}>{title}</p>
          <p className={`${sizeCfg.valueClass} font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>
            {value}
          </p>
        </div>
        <div className={`${sizeCfg.iconSize} ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      {footer && (
        <div className="relative z-10 pt-4 mt-4 border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  );
}
