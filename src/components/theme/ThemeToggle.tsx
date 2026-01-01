"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = "" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    if (theme === "system") {
      return <Monitor className="h-5 w-5" />;
    }
    return resolvedTheme === "dark" ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    );
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Chiaro";
      case "dark":
        return "Scuro";
      case "system":
        return "Sistema";
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={`
        inline-flex items-center gap-2 rounded-lg px-3 py-2
        bg-[var(--surface)] border border-[var(--border)]
        text-[var(--foreground-muted)] hover:text-[var(--foreground)]
        hover:bg-[var(--surface-hover)] hover:border-[var(--primary)]
        transition-all duration-200
        ${className}
      `}
      aria-label={`Tema: ${getLabel()}`}
      title={`Tema: ${getLabel()}`}
    >
      {getIcon()}
      {showLabel && <span className="text-sm font-medium">{getLabel()}</span>}
    </button>
  );
}

export function ThemeToggleCompact({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      className={`
        p-2 rounded-full
        bg-[var(--surface)] border border-[var(--border)]
        text-[var(--foreground-muted)] hover:text-[var(--primary)]
        hover:border-[var(--primary)] hover:bg-[var(--primary-50)]
        transition-all duration-200
        ${className}
      `}
      aria-label={resolvedTheme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
