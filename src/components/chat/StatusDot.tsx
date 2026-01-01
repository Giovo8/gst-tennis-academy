"use client";

import { useUserPresence } from "@/lib/chat/presence";

type StatusDotProps = {
  userId: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
};

export default function StatusDot({ userId, showLabel = false, size = "md" }: StatusDotProps) {
  const { status, isOnline, lastSeen } = useUserPresence(userId);

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  const statusLabels = {
    online: "Online",
    away: "Assente",
    busy: "Occupato",
    offline: "Offline",
  };

  function formatLastSeen() {
    if (!lastSeen || isOnline) return null;

    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);

    if (diffMinutes < 1) return "Ora";
    if (diffMinutes < 60) return `${diffMinutes}m fa`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h fa`;
    return `${Math.floor(diffMinutes / 1440)}g fa`;
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full ${statusColors[status]} ${
            isOnline ? "animate-pulse" : ""
          }`}
        />
        {isOnline && (
          <div
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full ${statusColors[status]} opacity-75 animate-ping`}
          />
        )}
      </div>
      
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isOnline ? statusLabels[status] : formatLastSeen() || "Offline"}
        </span>
      )}
    </div>
  );
}
