"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  MapPin,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Video,
  FileText,
  Edit,
  Save,
  X,
} from "lucide-react";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  subscription_type?: string;
  created_at: string;
}

interface Lesson {
  id: string;
  start_time: string;
  end_time: string;
  court: string;
  type: string;
  status: string;
  notes?: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  async function loadStudentData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Load student profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, subscription_type, created_at")
      .eq("id", studentId)
      .single();

    if (!profile) {
      router.push("/dashboard/maestro/students");
      return;
    }

    setStudent(profile);

    // Load lessons history
    const { data: lessonsData } = await supabase
      .from("bookings")
      .select("id, start_time, end_time, court, type, status, notes")
      .eq("user_id", studentId)
      .eq("coach_id", user.id)
      .in("type", ["lezione_privata", "lezione_gruppo"])
      .order("start_time", { ascending: false })
      .limit(20);

    if (lessonsData) {
      setLessons(lessonsData);
    }

    // Load coach notes about this student
    const { data: notesData } = await supabase
      .from("coach_notes")
      .select("id, content, created_at")
      .eq("student_id", studentId)
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (notesData) {
      setNotes(notesData);
    }

    setLoading(false);
  }

  async function handleSaveNote() {
    if (!newNoteContent.trim()) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("coach_notes")
      .insert({
        coach_id: user.id,
        student_id: studentId,
        content: newNoteContent,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes([data, ...notes]);
      setNewNoteContent("");
      setIsEditingNote(false);
    }

    setSaving(false);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
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

  const completedLessons = lessons.filter(l => l.status === "confirmed" || l.status === "completed").length;
  const cancelledLessons = lessons.filter(l => l.status === "cancelled").length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-xl w-64" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Studente non trovato</h2>
        <Link
          href="/dashboard/maestro/students"
          className="text-frozen-600 hover:text-frozen-700"
        >
          Torna all'elenco
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/maestro/students"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna agli allievi
      </Link>

      {/* Student Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-frozen-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {getInitials(student.full_name)}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {student.full_name}
            </h1>
            <div className="flex flex-wrap gap-4 text-gray-600">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {student.email}
              </span>
              {student.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {student.phone}
                </span>
              )}
            </div>
            {student.subscription_type && (
              <div className="mt-3">
                <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-frozen-100 text-frozen-700 border border-frozen-300">
                  {student.subscription_type}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-gray-600 text-sm">Lezioni completate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{completedLessons}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-gray-600 text-sm">Totale lezioni</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{lessons.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-gray-600 text-sm">Cancellate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{cancelledLessons}</p>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Note Allenatore</h2>
              <p className="text-xs text-gray-600">Annotazioni private sui progressi</p>
            </div>
          </div>
          {!isEditingNote && (
            <button
              onClick={() => setIsEditingNote(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-frozen-50 text-frozen-600 hover:bg-frozen-100 transition-colors text-sm font-medium"
            >
              <Edit className="h-4 w-4" />
              Nuova nota
            </button>
          )}
        </div>

        {isEditingNote && (
          <div className="p-5 bg-gray-50 border-b border-gray-200">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Scrivi una nota sui progressi dell'allievo..."
              className="w-full min-h-[120px] p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-frozen-500 resize-none"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleSaveNote}
                disabled={saving || !newNoteContent.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-frozen-600 text-white hover:bg-frozen-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvataggio..." : "Salva nota"}
              </button>
              <button
                onClick={() => {
                  setIsEditingNote(false);
                  setNewNoteContent("");
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                <X className="h-4 w-4" />
                Annulla
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {notes.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nessuna nota registrata</p>
              <p className="text-sm text-gray-400 mt-1">Aggiungi note sui progressi dell'allievo</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="p-5">
                <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {formatDate(note.created_at)} alle {formatTime(note.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lessons History */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-frozen-100 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-frozen-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Storico Lezioni</h2>
            <p className="text-xs text-gray-600">Ultime 20 lezioni</p>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {lessons.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nessuna lezione registrata</p>
            </div>
          ) : (
            lessons.map((lesson) => (
              <div key={lesson.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {formatDate(lesson.start_time)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">
                        {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{lesson.court}</span>
                      <span className="text-gray-400">•</span>
                      <span className="capitalize">{lesson.type.replace(/_/g, " ")}</span>
                    </div>
                    {lesson.notes && (
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {lesson.notes}
                      </p>
                    )}
                  </div>
                  <div>
                    {lesson.status === "confirmed" || lesson.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Completata
                      </span>
                    ) : lesson.status === "cancelled" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3" />
                        Cancellata
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        <Clock className="h-3 w-3" />
                        In attesa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
