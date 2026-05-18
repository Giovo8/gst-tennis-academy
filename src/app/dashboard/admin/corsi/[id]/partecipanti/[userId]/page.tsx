"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, User, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Course = {
  name: string;
  schedule_time: string | null;
  schedule_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
  price_per_month: number | null;
};

type Payment = {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  metadata: { note?: string } | null;
};

type Athlete = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
};

const DAY_INDEX: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6,
};

const DAYS: Record<string, string> = {
  lun: "Lunedì", mar: "Martedì", mer: "Mercoledì", gio: "Giovedì",
  ven: "Venerdì", sab: "Sabato", dom: "Domenica",
};

function computeLessonDates(course: Course): Date[] {
  if (!course.start_date || !course.end_date || !course.schedule_days?.length) return [];
  const allowed = new Set(course.schedule_days.map((d) => DAY_INDEX[d] ?? -1));
  const start = new Date(course.start_date);
  const end = new Date(course.end_date);
  const result: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (allowed.has(cur.getDay())) result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export default function PartecipantePresenzePage() {
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const userId = Array.isArray(params?.userId) ? params.userId[0] : params?.userId;

  const [course, setCourse] = useState<Course | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [enrollmentFee, setEnrollmentFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState("cash");
  const [newNote, setNewNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [settingFee, setSettingFee] = useState(false);
  const [feeInput, setFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  useEffect(() => {
    if (!courseId || !userId) return;
    void load();
  }, [courseId, userId]);

  async function load() {
    setLoading(true);

    const [{ data: courseData }, { data: profileData }, { data: attendanceData }, { data: paymentsData }, { data: enrollmentData }] =
      await Promise.all([
        supabase
          .from("courses")
          .select("name, schedule_time, schedule_days, start_date, end_date, price_per_month")
          .eq("id", courseId)
          .single(),
        supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .eq("id", userId)
          .single(),
        supabase
          .from("lesson_attendance")
          .select("lesson_date, present")
          .eq("course_id", courseId)
          .eq("user_id", userId),
        supabase
          .from("payments")
          .select("id, amount, payment_method, status, paid_at, created_at, metadata")
          .eq("user_id", userId)
          .eq("reference_id", courseId)
          .eq("payment_type", "course")
          .order("created_at", { ascending: true }),
        supabase
          .from("course_enrollments")
          .select("fee")
          .eq("course_id", courseId)
          .eq("user_id", userId)
          .single(),
      ]);

    if (courseData) setCourse(courseData);
    if (profileData) setAthlete(profileData);
    if (attendanceData) {
      const map: Record<string, boolean> = {};
      attendanceData.forEach((r: { lesson_date: string; present: boolean }) => {
        map[r.lesson_date] = r.present;
      });
      setAttendance(map);
    }
    if (paymentsData) setPayments(paymentsData);
    if (enrollmentData?.fee != null) setEnrollmentFee(Number(enrollmentData.fee));

    setLoading(false);
  }

  async function updateFee() {
    const fee = parseFloat(feeInput);
    if (isNaN(fee) || fee < 0) return;
    setSavingFee(true);
    const { error } = await supabase
      .from("course_enrollments")
      .upsert(
        { course_id: courseId, user_id: userId, fee },
        { onConflict: "course_id,user_id" }
      );
    if (!error) {
      setEnrollmentFee(fee);
      setSettingFee(false);
      setFeeInput("");
    }
    setSavingFee(false);
  }

  async function addPayment() {
    const amount = parseFloat(newAmount);
    if (!amount || isNaN(amount) || amount <= 0) return;
    setPaymentError(null);
    setSavingPayment(true);
    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        amount,
        currency: "EUR",
        payment_type: "course",
        reference_id: courseId,
        payment_method: newMethod,
        status: "completed",
        paid_at: new Date().toISOString(),
        metadata: newNote ? { note: newNote } : null,
      })
      .select("id, amount, payment_method, status, paid_at, created_at, metadata")
      .single();
    if (error) {
      setPaymentError(error.message);
    } else if (data) {
      setPayments((prev) => [...prev, data]);
      setNewAmount("");
      setNewNote("");
      setNewMethod("cash");
      setAddingPayment(false);
    }
    setSavingPayment(false);
  }

  async function deletePayment(id: string) {
    await supabase.from("payments").delete().eq("id", id);
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!course || !athlete) return null;

  const lessonDates = computeLessonDates(course);
  const presentCount = lessonDates.filter((d) => {
    const dateStr = d.toISOString().split("T")[0];
    return attendance[dateStr] === true;
  }).length;
  const totalWithRecord = lessonDates.filter((d) => {
    const dateStr = d.toISOString().split("T")[0];
    return attendance[dateStr] !== undefined;
  }).length;

  const days = (course.schedule_days ?? []).map((d) => DAYS[d] ?? d).join(", ");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/corsi" className="hover:text-secondary/80 transition-colors">Corsi</Link>
          {" › "}
          <Link href={`/dashboard/admin/corsi/${courseId}`} className="hover:text-secondary/80 transition-colors">Dettagli Corso</Link>
          {" › "}
          <span>Dettagli Partecipante</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Partecipante</h1>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ backgroundColor: "#05384c", borderColor: "#05384c", borderLeftColor: "#023047" }}
      >
        <div className="flex items-start gap-6">
          <User className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{athlete.full_name}</h2>
          </div>
        </div>
      </div>

      {/* Info partecipante */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Corso</label>
            <p className="text-secondary font-semibold">{course.name}</p>
          </div>
          {athlete.email && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Email</label>
              <p className="text-secondary font-semibold">{athlete.email}</p>
            </div>
          )}
          {athlete.phone && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
              <p className="text-secondary font-semibold">{athlete.phone}</p>
            </div>
          )}
          {days && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni corso</label>
              <p className="text-secondary font-semibold">{days}</p>
            </div>
          )}
          {course.schedule_time && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
              <p className="text-secondary font-semibold">{course.schedule_time}</p>
            </div>
          )}
          {lessonDates.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Presenze</label>
              <p className="text-secondary font-semibold">
                {presentCount} / {lessonDates.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lezioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Lezioni</h2>
        </div>
        {lessonDates.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-secondary/50">Nessuna lezione calcolabile</p>
          </div>
        ) : (
          <div className="px-6 py-4">
            <ul className="flex flex-col gap-2">
              {lessonDates.map((d, i) => {
                const dateStr = d.toISOString().split("T")[0];
                const label = d.toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).replace(/^./, (c) => c.toUpperCase());
                const hasRecord = attendance[dateStr] !== undefined;
                const isPresent = attendance[dateStr] === true;
                const bg = hasRecord
                  ? isPresent
                    ? "#023047"
                    : "var(--color-frozen-lake-900)"
                : "var(--secondary)";
                return (
                  <li key={i}>
                    <Link href={`/dashboard/admin/corsi/${courseId}/lezioni/${dateStr}`}>
                      <div
                        className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ background: bg }}
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-white text-sm truncate">{label}</p>
                        </div>
                        {hasRecord && (
                          <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                            {isPresent ? "PRESENTE" : "ASSENTE"}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Contabilità */}
      {(() => {
        const totalPaid = payments
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const totalDue = enrollmentFee != null ? enrollmentFee - totalPaid : null;
        const methodLabel = (m: string | null) => {
          if (m === "cash") return "Contanti";
          if (m === "bank_transfer") return "Bonifico";
          return m ?? "—";
        };
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Contabilità</h2>
            </div>

            {/* Riepilogo */}
            <div className="px-6 py-5 divide-y divide-gray-100 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-4">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Quota</label>
                <p className="text-secondary font-semibold">
                  {enrollmentFee != null ? `€${enrollmentFee.toFixed(2)}` : "—"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-4">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Importo pagato</label>
                <p className="text-secondary font-semibold">€{totalPaid.toFixed(2)}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pt-4">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Importo dovuto</label>
                <p className="text-secondary font-semibold">
                  {totalDue != null ? `€${totalDue.toFixed(2)}` : "—"}
                </p>
              </div>
            </div>

            {/* Lista pagamenti */}
            {payments.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-secondary/50">Nessun pagamento registrato</p>
              </div>
            ) : (
              <div className="px-6 py-4">
                <ul className="flex flex-col gap-2">
                  {payments.map((p, i) => {
                    const date = new Date(p.paid_at ?? p.created_at).toLocaleDateString("it-IT", {
                      day: "numeric", month: "long", year: "numeric",
                    });
                    return (
                      <li key={p.id}>
                        <div
                          className="flex items-center gap-4 py-3 px-3 rounded-lg"
                          style={{ background: "#023047" }}
                        >
                          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm">€{Number(p.amount).toFixed(2)}</p>
                            <p className="text-xs text-white/50 mt-0.5">
                              {date} · {methodLabel(p.payment_method)}
                              {p.metadata?.note && <> · {p.metadata.note}</>}
                            </p>
                          </div>
                          <button
                            onClick={() => deletePayment(p.id)}
                            className="flex-shrink-0 text-white/30 hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Form aggiunta */}
            {addingPayment && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex flex-col divide-y divide-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                    <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Importo (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                    <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Metodo</label>
                    <select
                      value={newMethod}
                      onChange={(e) => setNewMethod(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    >
                      <option value="cash">Contanti</option>
                      <option value="bank_transfer">Bonifico</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                    <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Nota (opzionale)</label>
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="es. Rata gennaio"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  {paymentError && (
                    <p className="flex-1 text-xs text-red-500 self-center">{paymentError}</p>
                  )}
                  <button
                    onClick={() => { setAddingPayment(false); setNewAmount(""); setNewNote(""); setPaymentError(null); }}
                    className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:opacity-90 transition-all font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={addPayment}
                    disabled={savingPayment || !newAmount}
                    className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50"
                  >
                    {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
                  </button>
                </div>
              </div>
            )}

            {/* Form imposta quota */}
            {settingFee && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Quota totale (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    placeholder={enrollmentFee != null ? enrollmentFee.toFixed(2) : "0.00"}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setSettingFee(false); setFeeInput(""); }}
                    className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:opacity-90 transition-all font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={updateFee}
                    disabled={savingFee || !feeInput}
                    className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50"
                  >
                    {savingFee ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
                  </button>
                </div>
              </div>
            )}

            {/* Bottoni azione */}
            {!addingPayment && !settingFee && (
              <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setSettingFee(true);
                    if (feeInput === "") {
                      const defaultFee = enrollmentFee ?? (course?.price_per_month ? Number(course.price_per_month) : null);
                      if (defaultFee != null) setFeeInput(String(defaultFee));
                    }
                  }}
                  className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#023047] rounded-lg hover:opacity-90 transition-all font-medium"
                >
                  Imposta quota
                </button>
                <button
                  onClick={() => setAddingPayment(true)}
                  className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:opacity-90 transition-all font-medium"
                >
                  Aggiungi pagamento
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Azioni */}
      <Link
        href={`/dashboard/admin/users/${userId}`}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:opacity-90 transition-all font-medium"
      >
        Vai al profilo
      </Link>
    </div>
  );
}
