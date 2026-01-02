"use client";

import { HTMLAttributes } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, Zap } from "lucide-react";

export type BadgeVariant = 
  | "default" 
  | "primary"
  | "secondary"
  | "success" 
  | "error" 
  | "warning" 
  | "info";
  
export type BadgeSize = "xs" | "sm" | "md" | "lg";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: boolean;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  primary: "bg-blue-100 text-primary border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  secondary: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
  error: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
  warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  info: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-xs",
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-sm",
};

const iconMap: Record<BadgeVariant, React.ReactNode> = {
  default: null,
  primary: <Zap className="h-3 w-3" />,
  secondary: null,
  success: <CheckCircle className="h-3 w-3" />,
  error: <XCircle className="h-3 w-3" />,
  warning: <AlertCircle className="h-3 w-3" />,
  info: <Info className="h-3 w-3" />,
};

function Badge({
  variant = "default",
  size = "md",
  icon = false,
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full border
        transition-colors duration-200
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${
          variant === 'success' ? 'bg-emerald-500' : 
          variant === 'error' ? 'bg-red-500' : 
          variant === 'warning' ? 'bg-amber-500' : 
          variant === 'info' ? 'bg-blue-500' : 
          'bg-slate-500'
        }`} />
      )}
      {icon && iconMap[variant]}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
