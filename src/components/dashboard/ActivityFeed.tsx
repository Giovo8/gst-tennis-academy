"use client";

import { Activity } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useStaggeredFadeIn } from "@/lib/hooks/useFadeIn";

type ActivityItem = {
  id: string;
  type: "booking" | "lesson" | "tournament" | "payment" | "system";
  title: string;
  description: string;
  timestamp: Date;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
};

type ActivityFeedProps = {
  activities: ActivityItem[];
  maxItems?: number;
};

const colorClasses = {
  blue: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  green: "bg-green-500/20 text-green-300 border-green-400/30",
  yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  red: "bg-red-500/20 text-red-300 border-red-400/30",
  purple: "bg-purple-500/20 text-purple-300 border-purple-400/30",
};

export default function ActivityFeed({ activities, maxItems = 5 }: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);
  const { containerRef, visibleItems } = useStaggeredFadeIn(displayedActivities.length);

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#042b4a] p-6 fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Attività Recenti</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-8">Nessuna attività recente</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-xl border border-white/10 bg-[#042b4a] p-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Attività Recenti</h3>
        </div>
        <span className="text-xs text-gray-400">{activities.length} totali</span>
      </div>

      <div className="space-y-3">
        {displayedActivities.map((activity, index) => (
          <div
            key={activity.id}
            className={`flex items-start gap-3 p-3 rounded-lg bg-[#021627] border border-white/5 hover:border-white/10 card-hover transition-all duration-300 ${
              visibleItems.has(index) ? 'fade-in' : 'opacity-0'
            }`}
            style={{
              animationDelay: visibleItems.has(index) ? `${index * 0.1}s` : '0s'
            }}
          >
            {activity.icon ? (
              <div className={`p-2 rounded-lg border hover-scale ${colorClasses[activity.color || "blue"]}`}>
                {activity.icon}
              </div>
            ) : (
              <div className="w-2 h-2 mt-2 rounded-full bg-blue-400"></div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{activity.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {format(activity.timestamp, "dd MMM yyyy, HH:mm", { locale: it })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {activities.length > maxItems && (
        <div className="mt-3 text-center">
          <button className="text-xs text-blue-400 hover:text-blue-300 hover-scale transition-colors button-press">
            Vedi tutte ({activities.length})
          </button>
        </div>
      )}
    </div>
  );
}
