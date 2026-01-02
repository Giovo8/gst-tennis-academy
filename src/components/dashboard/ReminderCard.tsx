"use client";

import { Calendar, Clock, Video } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  time: string;
  type?: "meeting" | "booking" | "tournament";
}

interface ReminderCardProps {
  reminders: Reminder[];
  onStartAction?: (id: string) => void;
}

export function ReminderCard({ reminders, onStartAction }: ReminderCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Promemoria</h3>
      
      <div className="space-y-4">
        {reminders.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nessun promemoria</p>
        ) : (
          reminders.map((reminder) => (
            <div key={reminder.id} className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{reminder.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  {reminder.time}
                </p>
              </div>
              
              {onStartAction && (
                <button
                  onClick={() => onStartAction(reminder.id)}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  Inizia
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
