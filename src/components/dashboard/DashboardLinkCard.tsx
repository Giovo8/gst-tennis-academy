"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight } from "lucide-react";

interface Props {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}

export default function DashboardLinkCard({ href, icon, title, description, footer, size = "md", className = "" }: Props) {
  const sizeClasses = size === "lg" ? "p-8" : "p-6";
  
  return (
    <Link
      href={href}
      className={`
        group relative overflow-hidden
        rounded-2xl border border-blue-400/20 
        bg-gradient-to-br from-blue-500/10 to-transparent
        backdrop-blur-xl
        ${sizeClasses}
        hover:border-blue-400/50 
        hover:shadow-xl hover:shadow-blue-500/20
        hover:-translate-y-2
        transition-all duration-300
        ${className}
      `.trim()}
    >
      {/* Animated gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <div className="relative z-10">
        {/* Icon with animated background */}
        <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 text-blue-300 group-hover:scale-110 group-hover:bg-blue-500/30 transition-all duration-300">
          {icon}
        </div>
        
        {/* Title with gradient on hover */}
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center justify-between group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-cyan-300 group-hover:bg-clip-text transition-all duration-300">
          {title}
          <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        </h3>
        
        <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
          {description}
        </p>
        
        {footer && (
          <div className="mt-4 pt-4 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </Link>
  );
}
