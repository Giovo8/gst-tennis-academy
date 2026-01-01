"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Search,
  User,
  Mail,
  Calendar,
  TrendingUp,
  Video,
  ChevronRight,
  Plus,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface Student {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  subscription_type: string | null;
  lessons_count?: number;
  last_lesson?: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubscription, setFilterSubscription] = useState("all");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get students who have had lessons with this coach
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        user_id,
        start_time,
        user:profiles!bookings_user_id_fkey(id, full_name, email, created_at, subscription_type)
      `)
      .eq("coach_id", user.id)
      .in("type", ["lezione_privata", "lezione_gruppo"])
      .order("start_time", { ascending: false });

    if (bookings) {
      // Group by student
      const studentMap = new Map<string, Student & { lessons: string[] }>();
      
      bookings.forEach(b => {
        // Handle Supabase returning array for joined tables
        const userProfile = Array.isArray(b.user) ? b.user[0] : b.user;
        if (userProfile) {
          const existing = studentMap.get(b.user_id);
          if (existing) {
            existing.lessons_count = (existing.lessons_count || 0) + 1;
          } else {
            studentMap.set(b.user_id, {
              id: userProfile.id,
              full_name: userProfile.full_name || "Senza nome",
              email: userProfile.email,
              created_at: userProfile.created_at,
              subscription_type: userProfile.subscription_type,
              lessons_count: 1,
              last_lesson: b.start_time,
              lessons: [b.start_time],
            });
          }
        }
      });

      setStudents(Array.from(studentMap.values()));
    }

    setLoading(false);
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterSubscription === "all" ||
      (filterSubscription === "active" && student.subscription_type) ||
      (filterSubscription === "none" && !student.subscription_type);

    return matchesSearch && matchesFilter;
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="h-12 skeleton rounded-lg" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">I Miei Allievi</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            {students.length} allievi totali
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Cerca allievo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />
        </div>
        <select
          value={filterSubscription}
          onChange={(e) => setFilterSubscription(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          <option value="all">Tutti gli abbonamenti</option>
          <option value="active">Con abbonamento</option>
          <option value="none">Senza abbonamento</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <Users className="h-5 w-5 text-[var(--primary)] mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">{students.length}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Allievi totali</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <TrendingUp className="h-5 w-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {students.filter(s => s.subscription_type).length}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Con abbonamento</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <Calendar className="h-5 w-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {students.reduce((sum, s) => sum + (s.lessons_count || 0), 0)}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Lezioni totali</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <Video className="h-5 w-5 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {Math.round(students.reduce((sum, s) => sum + (s.lessons_count || 0), 0) / Math.max(students.length, 1))}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Media lezioni</p>
        </div>
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Users className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            {searchQuery || filterSubscription !== "all" 
              ? "Nessun allievo trovato"
              : "Nessun allievo"}
          </h3>
          <p className="text-[var(--foreground-muted)]">
            {searchQuery || filterSubscription !== "all"
              ? "Prova a modificare i filtri di ricerca"
              : "I tuoi allievi appariranno qui dopo la prima lezione"}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {filteredStudents.map((student) => (
              <Link
                key={student.id}
                href={`/dashboard/maestro/students/${student.id}`}
                className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    <span className="text-[var(--primary)] font-semibold">
                      {getInitials(student.full_name)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{student.full_name}</p>
                    <div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {student.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {student.lessons_count} lezioni
                    </p>
                    {student.last_lesson && (
                      <p className="text-xs text-[var(--foreground-muted)]">
                        Ultima: {formatDate(student.last_lesson)}
                      </p>
                    )}
                  </div>
                  {student.subscription_type && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      {student.subscription_type}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-[var(--foreground-muted)]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
