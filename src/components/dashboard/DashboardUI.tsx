"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";

// ==========================================
// DASHBOARD CARD COMPONENT
// ==========================================
interface DashboardCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function DashboardCard({ children, className = "", hover = true }: DashboardCardProps) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl
      ${hover ? "hover:border-white/20 hover:bg-white/10 transition-all duration-300" : ""}
      ${className}
    `}>
      {children}
    </div>
  );
}

// ==========================================
// STAT CARD COMPONENT
// ==========================================
interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  badge?: string;
  badgeColor?: "green" | "yellow" | "red" | "blue" | "purple" | "cyan";
  gradient?: string;
}

const badgeColors = {
  green: "text-green-400 bg-green-500/10",
  yellow: "text-yellow-400 bg-yellow-500/10",
  red: "text-red-400 bg-red-500/10",
  blue: "text-blue-400 bg-blue-500/10",
  purple: "text-purple-400 bg-purple-500/10",
  cyan: "text-cyan-400 bg-cyan-500/10",
};

const gradientColors = {
  green: "from-green-500/5",
  yellow: "from-yellow-500/5",
  red: "from-red-500/5",
  blue: "from-blue-500/5",
  purple: "from-purple-500/5",
  cyan: "from-cyan-500/5",
};

export function StatCard({ icon, value, label, badge, badgeColor = "cyan", gradient }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient || gradientColors[badgeColor]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-${badgeColor}-500/20 flex items-center justify-center`}>
            {icon}
          </div>
          {badge && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm text-white/50 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ==========================================
// SECTION HEADER COMPONENT
// ==========================================
interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
    color?: "cyan" | "green" | "yellow" | "purple" | "blue";
  };
}

const actionColors = {
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20",
  green: "text-green-400 bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
};

export function SectionHeader({ icon, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <Link
          href={action.href}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${actionColors[action.color || "cyan"]}`}
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// ==========================================
// QUICK ACTION CARD COMPONENT
// ==========================================
interface QuickActionCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  color?: "cyan" | "green" | "yellow" | "purple" | "blue" | "red";
}

const iconBgColors = {
  cyan: "from-cyan-500/20 to-blue-500/20",
  green: "from-green-500/20 to-emerald-500/20",
  yellow: "from-yellow-500/20 to-orange-500/20",
  purple: "from-purple-500/20 to-indigo-500/20",
  blue: "from-blue-500/20 to-sky-500/20",
  red: "from-red-500/20 to-rose-500/20",
};

const iconHoverShadows = {
  cyan: "group-hover:shadow-cyan-500/20",
  green: "group-hover:shadow-green-500/20",
  yellow: "group-hover:shadow-yellow-500/20",
  purple: "group-hover:shadow-purple-500/20",
  blue: "group-hover:shadow-blue-500/20",
  red: "group-hover:shadow-red-500/20",
};

const borderHoverColors = {
  cyan: "hover:border-cyan-500/30",
  green: "hover:border-green-500/30",
  yellow: "hover:border-yellow-500/30",
  purple: "hover:border-purple-500/30",
  blue: "hover:border-blue-500/30",
  red: "hover:border-red-500/30",
};

const arrowColors = {
  cyan: "group-hover:text-cyan-400",
  green: "group-hover:text-green-400",
  yellow: "group-hover:text-yellow-400",
  purple: "group-hover:text-purple-400",
  blue: "group-hover:text-blue-400",
  red: "group-hover:text-red-400",
};

export function QuickActionCard({ href, icon, title, description, color = "cyan" }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 ${borderHoverColors[color]}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${gradientColors[color]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconBgColors[color]} flex items-center justify-center group-hover:shadow-lg ${iconHoverShadows[color]} transition-all`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-white text-lg">{title}</h3>
          <p className="text-sm text-white/50">{description}</p>
        </div>
      </div>
      <ArrowRight className={`relative h-5 w-5 text-white/30 ${arrowColors[color]} group-hover:translate-x-1 transition-all`} />
    </Link>
  );
}

// ==========================================
// PAGE HEADER COMPONENT
// ==========================================
interface PageHeaderProps {
  badge?: string;
  badgeIcon?: ReactNode;
  title: string;
  subtitle?: string;
  gradient?: "purple-cyan" | "sky-blue" | "cyan-teal" | "blue-cyan" | "yellow-orange";
  rightContent?: ReactNode;
}

const gradients = {
  "purple-cyan": "from-purple-500/10 via-transparent to-cyan-500/10",
  "sky-blue": "from-sky-500/10 via-transparent to-blue-500/10",
  "cyan-teal": "from-cyan-500/10 via-transparent to-teal-500/10",
  "blue-cyan": "from-blue-500/10 via-transparent to-cyan-500/10",
  "yellow-orange": "from-yellow-500/10 via-transparent to-orange-500/10",
};

const badgeBorderColors = {
  "purple-cyan": "border-purple-500/30 bg-purple-500/10 text-purple-300",
  "sky-blue": "border-sky-500/30 bg-sky-500/10 text-sky-300",
  "cyan-teal": "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  "blue-cyan": "border-blue-500/30 bg-blue-500/10 text-blue-300",
  "yellow-orange": "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
};

export function PageHeader({ badge, badgeIcon, title, subtitle, gradient = "cyan-teal", rightContent }: PageHeaderProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradients[gradient]} backdrop-blur-xl p-6 sm:p-8`}>
      <div className="pointer-events-none absolute left-10 top-5 h-32 w-32 rounded-full blur-3xl bg-cyan-500/20 animate-pulse" />
      <div className="pointer-events-none absolute right-10 bottom-5 h-24 w-24 rounded-full blur-3xl bg-blue-500/15 animate-pulse" style={{animationDelay: '1s'}} />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {badge && (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider mb-3 ${badgeBorderColors[gradient]}`}>
              {badgeIcon}
              {badge}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{title}</h1>
          {subtitle && <p className="text-white/60">{subtitle}</p>}
        </div>
        {rightContent}
      </div>
    </div>
  );
}

// ==========================================
// STATUS BADGE COMPONENT
// ==========================================
interface StatusBadgeProps {
  status: "confirmed" | "pending" | "cancelled" | "active" | "inactive";
  icon?: ReactNode;
}

const statusStyles = {
  confirmed: "bg-green-500/10 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  active: "bg-green-500/10 text-green-400 border-green-500/30",
  inactive: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const statusLabels = {
  confirmed: "Confermato",
  pending: "In attesa",
  cancelled: "Cancellato",
  active: "Attivo",
  inactive: "Inattivo",
};

export function StatusBadge({ status, icon }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusStyles[status]}`}>
      {icon}
      {statusLabels[status]}
    </span>
  );
}

// ==========================================
// EMPTY STATE COMPONENT
// ==========================================
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
    icon?: ReactNode;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4">
        {icon}
      </div>
      <p className="text-white/50 mb-2">{title}</p>
      {description && <p className="text-sm text-white/30 mb-4">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
        >
          {action.icon}
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ==========================================
// LIST ITEM COMPONENT
// ==========================================
interface ListItemProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}

export function ListItem({ children, href, onClick }: ListItemProps) {
  const className = "p-4 flex items-center justify-between hover:bg-white/5 transition-all group";
  
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  
  return (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  );
}

// ==========================================
// GRADIENT BUTTON COMPONENT
// ==========================================
interface GradientButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function GradientButton({ 
  children, 
  href, 
  onClick, 
  variant = "primary",
  size = "md",
  className = ""
}: GradientButtonProps) {
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/30",
    secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
    outline: "bg-transparent text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10",
  };
  
  const baseClass = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all ${sizes[size]} ${variants[variant]} ${className}`;
  
  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {children}
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} className={baseClass}>
      {children}
    </button>
  );
}
