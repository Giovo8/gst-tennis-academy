"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = 
  | "primary" 
  | "secondary" 
  | "success"
  | "warning"
  | "danger" 
  | "ghost" 
  | "outline"
  | "link";
  
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary hover:bg-primary-hover text-white border-transparent shadow-sm hover:shadow-md transition-all",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-900 border-transparent dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white",
  success: "bg-success hover:bg-success-dark text-white border-transparent shadow-sm",
  warning: "bg-warning hover:bg-warning-dark text-white border-transparent shadow-sm",
  danger: "bg-error hover:bg-error-dark text-white border-transparent shadow-sm",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-700 border-transparent dark:hover:bg-slate-800 dark:text-slate-300",
  outline: "bg-transparent hover:bg-slate-50 text-slate-700 border-slate-300 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800",
  link: "bg-transparent hover:bg-transparent text-primary border-transparent underline-offset-4 hover:underline p-0",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-xs gap-1",
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2.5",
  xl: "px-6 py-3 text-lg gap-3",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg border
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
          disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none
          active:scale-[0.98]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
