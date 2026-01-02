"use client";

import { HTMLAttributes, forwardRef } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type AlertVariant = "default" | "success" | "error" | "warning" | "info";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantConfig = {
  default: {
    container: "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700",
    icon: <Info className="h-5 w-5 text-slate-600 dark:text-slate-400" />,
    title: "text-slate-900 dark:text-slate-100",
    text: "text-slate-700 dark:text-slate-300",
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800",
    icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    title: "text-emerald-900 dark:text-emerald-100",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  error: {
    container: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    title: "text-red-900 dark:text-red-100",
    text: "text-red-700 dark:text-red-300",
  },
  warning: {
    container: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
    icon: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    title: "text-amber-900 dark:text-amber-100",
    text: "text-amber-700 dark:text-amber-300",
  },
  info: {
    container: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    title: "text-blue-900 dark:text-blue-100",
    text: "text-blue-700 dark:text-blue-300",
  },
};

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = "default",
      title,
      dismissible = false,
      onDismiss,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant];

    return (
      <div
        ref={ref}
        className={`
          relative rounded-lg border p-4
          ${config.container}
          ${className}
        `}
        role="alert"
        {...props}
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0">{config.icon}</div>
          <div className="flex-1 space-y-1">
            {title && (
              <h5 className={`font-semibold text-sm ${config.title}`}>
                {title}
              </h5>
            )}
            <div className={`text-sm ${config.text}`}>{children}</div>
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 ${config.text} hover:opacity-70 transition-opacity`}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { Alert };
export type { AlertProps };
