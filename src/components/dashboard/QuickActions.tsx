"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useStaggeredFadeIn } from "@/lib/hooks/useFadeIn";

type QuickAction = {
  label: string;
  description?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "orange";
  disabled?: boolean;
};

type QuickActionsProps = {
  actions: QuickAction[];
  title?: string;
};

const colorClasses = {
  blue: "from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600",
  green: "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
  yellow: "from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600",
  red: "from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600",
  purple: "from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600",
  orange: "from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
};

export default function QuickActions({ actions, title = "Azioni Rapide" }: QuickActionsProps) {
  const { containerRef, visibleItems } = useStaggeredFadeIn(actions.length);

  return (
    <div ref={containerRef} className="rounded-xl border border-white/10 bg-[#042b4a] p-6 fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Zap className="h-5 w-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const isVisible = visibleItems.has(index)

          if (action.href) {
            return (
              <Link
                key={index}
                href={action.href}
                className={`group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${
                  colorClasses[action.color || "blue"]
                } text-white font-semibold transition-all duration-300 hover-scale hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 button-press fade-in`}
                style={{
                  animationDelay: isVisible ? `${index * 0.1}s` : '0s'
                }}
              >
                <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all duration-300 hover-scale">
                  {action.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{action.label}</p>
                  {action.description && (
                    <p className="text-xs opacity-90 mt-0.5">{action.description}</p>
                  )}
                </div>
              </Link>
            )
          }

          return (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${
                colorClasses[action.color || "blue"]
              } text-white font-semibold transition-all duration-300 hover-scale hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 button-press fade-in`}
              style={{
                animationDelay: isVisible ? `${index * 0.1}s` : '0s'
              }}
            >
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all duration-300 hover-scale">
                {action.icon}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{action.label}</p>
                {action.description && (
                  <p className="text-xs opacity-90 mt-0.5">{action.description}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}
