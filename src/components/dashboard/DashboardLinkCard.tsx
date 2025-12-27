"use client";

import Link from "next/link";
import React from "react";

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
  const sizeExtras = size === "lg" ? "p-10" : "p-8";
  return (
    <Link
      href={href}
      className={("group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 " + sizeExtras + " hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 " + className).trim()}
    >
      <div>{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
      {footer && <div className="mt-4 pt-3 border-t border-white/5">{footer}</div>}
    </Link>
  );
}
