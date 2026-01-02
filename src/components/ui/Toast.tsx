"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { X, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

const variantConfig = {
  success: {
    bg: "bg-blue-50 dark:bg-blue-950 border-primary/30 dark:border-primary/80",
    icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    title: "text-emerald-900 dark:text-emerald-100",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    title: "text-red-900 dark:text-red-100",
    text: "text-red-700 dark:text-red-300",
  },
  warning: {
    bg: "bg-blue-50 dark:bg-blue-950 border-primary/30 dark:border-primary/80",
    icon: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    title: "text-amber-900 dark:text-amber-100",
    text: "text-amber-700 dark:text-amber-300",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    title: "text-blue-900 dark:text-blue-100",
    text: "text-blue-700 dark:text-blue-300",
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = variantConfig[toast.variant];

  return (
    <div
      className={`
        pointer-events-auto
        rounded-lg border p-4 shadow-lg
        animate-slide-in-right
        ${config.bg}
      `}
      role="alert"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">{config.icon}</div>
        <div className="flex-1 space-y-1">
          {toast.title && (
            <h5 className={`font-semibold text-sm ${config.title}`}>
              {toast.title}
            </h5>
          )}
          <div className={`text-sm ${config.text}`}>{toast.message}</div>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${config.text} hover:opacity-70 transition-opacity`}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
