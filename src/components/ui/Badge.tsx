"use client";

import { HTMLAttributes } from "react";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

export type BadgeVariant = "default" | "success" | "error" | "warning" | "info";
export type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-white border-white/20",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

const iconMap: Record<BadgeVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle className="h-3 w-3" />,
  error: <XCircle className="h-3 w-3" />,
  warning: <AlertCircle className="h-3 w-3" />,
  info: <Info className="h-3 w-3" />,
};

function Badge({
  variant = "default",
  size = "md",
  icon = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {icon && iconMap[variant]}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
