"use client";

import { Calendar, ChevronRight } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";

type UpcomingEvent = {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: "booking" | "lesson" | "tournament" | "match" | "course";
  location?: string;
  status?: "confirmed" | "pending" | "cancelled";
  link?: string;
};

type UpcomingEventsProps = {
  events: UpcomingEvent[];
  maxItems?: number;
  title?: string;
};

export default function UpcomingEvents({ events, maxItems = 5, title = "Prossimi Eventi" }: UpcomingEventsProps) {
  // Ordina per data e filtra solo eventi futuri
  const sortedEvents = events
    .filter(e => !isPast(e.date) || isToday(e.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, maxItems);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Oggi";
    if (isTomorrow(date)) return "Domani";
    return format(date, "dd MMM", { locale: it });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-300 border-green-400/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-400/30";
      case "cancelled":
        return "bg-red-500/20 text-red-300 border-red-400/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-400/30";
    }
  };

  if (sortedEvents.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#042b4a] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-8">Nessun evento in programma</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#042b4a] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <span className="text-xs text-gray-400">{sortedEvents.length} eventi</span>
      </div>

      <div className="space-y-2">
        {sortedEvents.map((event) => {
          if (event.link) {
            return (
              <Link
                key={event.id}
                href={event.link}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#021627] border border-white/5 hover:border-white/10 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg bg-blue-500/10 border border-blue-400/20">
                  <span className="text-xs text-blue-300 font-semibold uppercase">
                    {getDateLabel(event.date)}
                  </span>
                  <span className="text-lg font-bold text-white">
                    {format(event.date, "HH:mm")}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    {event.status && (
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                        {event.status === "confirmed" && "Confermato"}
                        {event.status === "pending" && "In attesa"}
                        {event.status === "cancelled" && "Annullato"}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-gray-400 truncate">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-xs text-gray-500 mt-0.5">📍 {event.location}</p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
              </Link>
            )
          }

          return (
            <div
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#021627] border border-white/5 hover:border-white/10 transition-all group cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg bg-blue-500/10 border border-blue-400/20">
                <span className="text-xs text-blue-300 font-semibold uppercase">
                  {getDateLabel(event.date)}
                </span>
                <span className="text-lg font-bold text-white">
                  {format(event.date, "HH:mm")}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">{event.title}</p>
                  {event.status && (
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                      {event.status === "confirmed" && "Confermato"}
                      {event.status === "pending" && "In attesa"}
                      {event.status === "cancelled" && "Annullato"}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-gray-400 truncate">{event.description}</p>
                )}
                {event.location && (
                  <p className="text-xs text-gray-500 mt-0.5">📍 {event.location}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {events.length > maxItems && (
        <div className="mt-3 text-center">
          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Vedi tutti ({events.length})
          </button>
        </div>
      )}
    </div>
  );
}
