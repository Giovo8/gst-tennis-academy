"use client";

import { useState, useEffect } from "react";
import { Pause, Play, Square } from "lucide-react";

interface TimeTrackerProps {
  initialTime?: number; // in seconds
  onTimeUpdate?: (time: number) => void;
}

export function TimeTracker({ initialTime = 0, onTimeUpdate }: TimeTrackerProps) {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => {
          const newTime = prev + 1;
          onTimeUpdate?.(newTime);
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, onTimeUpdate]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    onTimeUpdate?.(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/90 to-emerald-800/90 border border-emerald-400/30 p-6 text-white backdrop-blur-sm">
      {/* Decorative Wave Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute right-0 top-0 h-full w-1/2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute h-32 w-32 rounded-full bg-white/20"
              style={{
                right: `${-20 + i * 15}%`,
                top: `${10 + i * 20}%`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="mb-4 text-sm font-medium text-white/80">Time Tracker</h3>
        
        <div className="mb-6">
          <div className="text-5xl font-bold tracking-tight">{formatTime(time)}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            className="flex-1 rounded-xl bg-white/20 px-4 py-2.5 font-medium backdrop-blur-sm transition-all hover:bg-white/30 flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                Pausa
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Avvia
              </>
            )}
          </button>
          
          <button
            onClick={handleReset}
            className="rounded-xl bg-red-500/20 px-4 py-2.5 backdrop-blur-sm transition-all hover:bg-red-500/30 flex items-center justify-center"
            title="Reset"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
