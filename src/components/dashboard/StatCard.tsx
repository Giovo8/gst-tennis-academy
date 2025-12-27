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

const styles: Record<Color, { wrapper: string; circle: string }> = {
  blue: {
    wrapper: "rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4 hover:opacity-95 transition",
    circle: "",
  },
  green: {
    wrapper: "rounded-xl border border-green-400/30 bg-green-400/10 p-4 hover:opacity-95 transition",
    circle: "",
  },
  purple: {
    wrapper: "rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 hover:opacity-95 transition",
    circle: "",
  },
  yellow: {
    wrapper: "rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 hover:opacity-95 transition",
    circle: "",
  },
  red: {
    wrapper: "rounded-xl border border-red-400/30 bg-red-400/10 p-4 hover:opacity-95 transition",
    circle: "",
  },
  neutral: {
    wrapper: "rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4 hover:opacity-95 transition",
    circle: "",
  },
};

export default function StatCard({ title, value, icon, color = "blue", size = "md", footer, className = "" }: StatCardProps) {
  const s = styles[color] || styles.blue;

  const sizeMap: Record<string, { wrapperExtras: string; valueClass: string; titleClass: string }> = {
    sm: { wrapperExtras: "p-3", valueClass: "text-lg", titleClass: "text-xs uppercase tracking-wider text-muted-2" },
    md: { wrapperExtras: "p-4", valueClass: "text-2xl", titleClass: "text-xs uppercase tracking-wider text-muted-2" },
    lg: { wrapperExtras: "p-6", valueClass: "text-3xl", titleClass: "text-sm uppercase tracking-wider text-muted-2" },
  };

  const sizeCfg = sizeMap[size] || sizeMap.md;

  return (
    <div className={`${s.wrapper} ${sizeCfg.wrapperExtras} ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${sizeCfg.titleClass}`}>{title}</p>
          <p className={`${sizeCfg.valueClass} font-bold text-white mt-1`}>{value}</p>
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
      {footer && <div className="pt-2 border-t border-white/5 mt-3">{footer}</div>}
    </div>
  );
}
