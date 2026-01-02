"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Calendar, Clock, User, Loader2, CheckCircle, XCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Lesson = {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  coach_confirmed: boolean;
  athlete_name: string;
  notes: string | null;
};

export default function CoachLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  useEffect(() => {
    loadLessons();
  }, [filter]);

  async function loadLessons() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("bookings")
        .select("*")
        .eq("coach_id", user.id)
        .order("start_time", { ascending: filter === "upcoming" });

      const now = new Date().toISOString();
      if (filter === "upcoming") {
        query = query.gte("start_time", now);
      } else if (filter === "past") {
        query = query.lt("start_time", now);
      }

      const { data: bookings } = await query.limit(50);

      if (!bookings) {
        setLessons([]);
        setLoading(false);
        return;
      }

      // Get athlete names
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      setLessons(bookings.map(b => ({
        id: b.id,
        court: b.court,
        start_time: b.start_time,
        end_time: b.end_time,
        type: b.type,
        status: b.status,
        coach_confirmed: b.coach_confirmed,
        athlete_name: profileMap.get(b.user_id) || "Sconosciuto",
        notes: b.notes,
      })));
    } catch (error) {
      console.error("Error loading lessons:", error);
    } finally {
      setLoading(false);
    }
  }

  async function confirmLesson(lessonId: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ coach_confirmed: true })
      .eq("id", lessonId);

    if (!error) {
      setLessons(lessons.map(l => 
        l.id === lessonId ? { ...l, coach_confirmed: true } : l
      ));
    }
  }

  const stats = {
    total: lessons.length,
    confirmed: lessons.filter(l => l.coach_confirmed).length,
    pending: lessons.filter(l => !l.coach_confirmed && l.status !== "cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Le Mie Lezioni</h1>
          <p className="text-white/50">Gestisci le tue lezioni private e di gruppo</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-white/50">Totali</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-frozen-500/20 bg-frozen-500/5 backdrop-blur-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-frozen-500/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-frozen-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-frozen-400">{stats.confirmed}</p>
              <p className="text-sm text-white/50">Confermate</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-frozen-500/20 bg-frozen-500/5 backdrop-blur-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-frozen-500/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-frozen-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-frozen-400">{stats.pending}</p>
              <p className="text-sm text-white/50">In Attesa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-5 w-5 text-white/40" />
        <button
          onClick={() => setFilter("upcoming")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filter === "upcoming"
              ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg"
              : "bg-white/5 text-white/60 border border-white/10 hover:border-white/30"
          }`}
        >
          Prossime
        </button>
        <button
          onClick={() => setFilter("past")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filter === "past"
              ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg"
              : "bg-white/5 text-white/60 border border-white/10 hover:border-white/30"
          }`}
        >
          Passate
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filter === "all"
              ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg"
              : "bg-white/5 text-white/60 border border-white/10 hover:border-white/30"
          }`}
        >
          Tutte
        </button>
      </div>

      {/* Lessons List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <p className="mt-4 text-white/50">Caricamento lezioni...</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-white/10 bg-white/5">
          <Calendar className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Nessuna lezione trovata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-cyan-500/30 hover:bg-white/10 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold text-white">
                      {format(new Date(lesson.start_time), "EEEE dd MMMM", { locale: it })}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      lesson.coach_confirmed
                        ? "bg-frozen-500/20 text-frozen-400 border border-frozen-500/30"
                        : "bg-frozen-500/20 text-frozen-400 border border-frozen-500/30"
                    }`}>
                      {lesson.coach_confirmed ? "✓ Confermata" : "⏳ Da confermare"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-frozen-400" />
                      {format(new Date(lesson.start_time), "HH:mm")} - {format(new Date(lesson.end_time), "HH:mm")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                      {lesson.court}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-cyan-400" />
                      {lesson.athlete_name}
                    </span>
                  </div>
                </div>
                {!lesson.coach_confirmed && lesson.status !== "cancelled" && (
                  <button
                    onClick={() => confirmLesson(lesson.id)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                  >
                    Conferma
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
