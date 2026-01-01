"use client";

import { Loader2 } from "lucide-react";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <Loader2
      className={`animate-spin text-accent ${sizeStyles[size]} ${className}`}
    />
  );
}

// Full page loading state
interface LoadingScreenProps {
  message?: string;
}

function LoadingScreen({ message = "Caricamento..." }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Spinner size="xl" />
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}

// Inline loading state
interface LoadingInlineProps {
  message?: string;
}

function LoadingInline({ message = "Caricamento..." }: LoadingInlineProps) {
  return (
    <div className="flex items-center gap-2 text-muted">
      <Spinner size="sm" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export { Spinner, LoadingScreen, LoadingInline };
export type { SpinnerProps };
