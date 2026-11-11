'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2, User, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { errorText, toastError } from '@/lib/toast';
import { computeLessonDates } from '@/lib/courses/schedule';

type Course = {
  name: string;
  schedule_time: string | null;
  schedule_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
  price_per_month: number | null;
  cancelled_dates: string[] | null;
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

type Props = {
  /** Area della dashboard: decide i link e se mostrare la contabilità (solo admin). */
  area: 'admin' | 'maestro';
  courseId: string;
  /** Iscritto con profilo… */
  userId?: string;
  /** …oppure ospite, identificato dal nome. */
  guestName?: string;
};

const DAYS: Record<string, string> = {
  lun: 'Lunedì',
  mar: 'Martedì',
  mer: 'Mercoledì',
  gio: 'Giovedì',
  ven: 'Venerdì',
  sab: 'Sabato',
  dom: 'Domenica',
};

const PAYMENT_COLUMNS = 'id, amount, payment_method, status, paid_at, created_at, metadata';
const INPUT_CLASS =
  'flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-0 focus:border-black/10';
const BUTTON_CLASS =
  'flex-1 flex items-center justify-center px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-medium';

function methodLabel(method: string | null) {
  if (method === 'cash') return 'Contanti';
  if (method === 'bank_transfer') return 'Bonifico';
  return method ?? '—';
}

function InfoRow({
  label,
  children,
  className = 'pb-5 border-b border-gray-100',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 ${className}`}>
      <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">{label}</label>
      <p className="text-secondary font-semibold">{children}</p>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
      <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">{label}</label>
      {children}
    </div>
  );
}

/** Dettaglio di un partecipante a un corso (iscritto o ospite): presenze e, per l'admin, contabilità. */
export default function CourseParticipantView({ area, courseId, userId, guestName }: Props) {
  const isGuest = !userId;
  const participantKey = userId ?? guestName;
  // Colonna e valore che identificano il partecipante in presenze, pagamenti e iscrizioni.
  const participantColumn = isGuest ? 'guest_name' : 'user_id';
  const showAccounting = area === 'admin';
  const coursesPath = `/dashboard/${area}/corsi`;

  const [course, setCourse] = useState<Course | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [enrollmentFee, setEnrollmentFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('cash');
  const [newNote, setNewNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [settingFee, setSettingFee] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [savingFee, setSavingFee] = useState(false);

  useEffect(() => {
    if (!courseId || !participantKey) return;
    void load();
  }, [courseId, participantKey]);

  async function load() {
    setLoading(true);

    const [
      { data: courseData },
      { data: attendanceData },
      { data: profileData },
      { data: paymentsData },
      { data: enrollmentData },
    ] = await Promise.all([
      supabase
        .from('courses')
        .select(
          'name, schedule_time, schedule_days, start_date, end_date, price_per_month, cancelled_dates',
        )
        .eq('id', courseId)
        .single(),
      supabase
        .from('lesson_attendance')
        .select('lesson_date, present')
        .eq('course_id', courseId)
        .eq(participantColumn, participantKey),
      isGuest
        ? { data: null }
        : supabase.from('profiles').select('id, full_name, email, phone').eq('id', userId).single(),
      showAccounting
        ? supabase
            .from('payments')
            .select(PAYMENT_COLUMNS)
            .eq(participantColumn, participantKey)
            .eq('reference_id', courseId)
            .eq('payment_type', 'course')
            .order('created_at', { ascending: true })
        : { data: null },
      showAccounting
        ? supabase
            .from('course_enrollments')
            .select('id, fee')
            .eq('course_id', courseId)
            .eq(participantColumn, participantKey)
            .maybeSingle()
        : { data: null },
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
    if (enrollmentData) {
      setEnrollmentId(enrollmentData.id);
      setEnrollmentFee(enrollmentData.fee != null ? Number(enrollmentData.fee) : null);
    }

    setLoading(false);
  }

  async function updateFee() {
    const fee = parseFloat(feeInput);
    if (isNaN(fee) || fee < 0) return;
    // L'ospite ha sempre una riga di iscrizione; per l'iscritto la si crea se manca.
    if (isGuest && !enrollmentId) return;
    setSavingFee(true);
    const { error } = isGuest
      ? await supabase.from('course_enrollments').update({ fee }).eq('id', enrollmentId)
      : await supabase
          .from('course_enrollments')
          .upsert(
            { course_id: courseId, user_id: userId, fee },
            { onConflict: 'course_id,user_id' },
          );
    if (!error) {
      setEnrollmentFee(fee);
      setSettingFee(false);
      setFeeInput('');
      toast.success('Quota salvata');
    } else {
      toastError(error, 'Salvataggio non riuscito');
    }
    setSavingFee(false);
  }

  async function addPayment() {
    const amount = parseFloat(newAmount);
    if (!amount || isNaN(amount) || amount <= 0) return;
    setPaymentError(null);
    setSavingPayment(true);
    const { data, error } = await supabase
      .from('payments')
      .insert({
        [participantColumn]: participantKey,
        amount,
        currency: 'EUR',
        payment_type: 'course',
        reference_id: courseId,
        payment_method: newMethod,
        status: 'completed',
        paid_at: new Date().toISOString(),
        metadata: newNote ? { note: newNote } : null,
      })
      .select(PAYMENT_COLUMNS)
      .single();
    if (error) {
      setPaymentError(errorText(error, 'Pagamento non registrato'));
    } else if (data) {
      setPayments((prev) => [...prev, data]);
      setNewAmount('');
      setNewNote('');
      setNewMethod('cash');
      setAddingPayment(false);
      toast.success('Pagamento registrato');
    }
    setSavingPayment(false);
  }

  async function deletePayment(id: string) {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) {
      toastError(error, 'Eliminazione non riuscita');
      return;
    }
    setPayments((prev) => prev.filter((p) => p.id !== id));
    toast.success('Pagamento eliminato');
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!course || (!isGuest && !athlete)) return null;

  const lessonDates = computeLessonDates(course);
  const presentCount = lessonDates.filter(
    (d) => attendance[d.toISOString().split('T')[0]] === true,
  ).length;
  const days = (course.schedule_days ?? []).map((d) => DAYS[d] ?? d).join(', ');

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDue = enrollmentFee != null ? enrollmentFee - totalPaid : null;

  return (
    <div className="space-y-6 pt-3">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href={coursesPath} className="hover:text-secondary/80 transition-colors">
            Corsi
          </Link>
          {' › '}
          <Link
            href={`${coursesPath}/${courseId}`}
            className="hover:text-secondary/80 transition-colors"
          >
            Dettagli Corso
          </Link>
          {' › '}
          <span>{isGuest ? 'Ospite' : 'Dettagli Partecipante'}</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Partecipante</h1>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: 'var(--color-frozen-lake-900)',
          borderColor: 'var(--color-frozen-lake-900)',
          borderLeftColor: 'var(--color-frozen-lake-900)',
        }}
      >
        <div className="flex items-start gap-6">
          <User className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              {isGuest ? guestName : athlete?.full_name}
            </h2>
          </div>
        </div>
      </div>

      {/* Informazioni */}
      <div className="page-card">
        <div className="page-card-header">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="px-6 py-6 space-y-5">
          <InfoRow label="Corso">{course.name}</InfoRow>
          {isGuest && <InfoRow label="Tipo">Ospite</InfoRow>}
          {athlete?.email && <InfoRow label="Email">{athlete.email}</InfoRow>}
          {athlete?.phone && <InfoRow label="Telefono">{athlete.phone}</InfoRow>}
          {days && <InfoRow label="Giorni corso">{days}</InfoRow>}
          {course.schedule_time && <InfoRow label="Orario">{course.schedule_time}</InfoRow>}
          {lessonDates.length > 0 && (
            <InfoRow label="Presenze" className="">
              {presentCount} / {lessonDates.length}
            </InfoRow>
          )}
        </div>
      </div>

      {/* Lezioni */}
      <div className="page-card">
        <div className="page-card-header">
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
                const dateStr = d.toISOString().split('T')[0];
                const label = d
                  .toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                  .replace(/^./, (c) => c.toUpperCase());
                const hasRecord = attendance[dateStr] !== undefined;
                const isPresent = attendance[dateStr] === true;
                const bg = hasRecord
                  ? isPresent
                    ? '#023047'
                    : 'var(--color-frozen-lake-900)'
                  : 'var(--secondary)';
                return (
                  <li key={dateStr}>
                    <Link href={`${coursesPath}/${courseId}/lezioni/${dateStr}`}>
                      <div
                        className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ background: bg }}
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{label}</p>
                        </div>
                        {hasRecord && (
                          <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                            {isPresent ? 'PRESENTE' : 'ASSENTE'}
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
      {showAccounting && (
        <div className="page-card">
          <div className="page-card-header">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Contabilità</h2>
          </div>

          {/* Riepilogo */}
          <div className="px-6 py-5 divide-y divide-gray-100 border-b border-gray-100">
            <InfoRow label="Quota" className="pb-4">
              {enrollmentFee != null ? `€${enrollmentFee.toFixed(2)}` : '—'}
            </InfoRow>
            <InfoRow label="Importo pagato" className="py-4">
              €{totalPaid.toFixed(2)}
            </InfoRow>
            <InfoRow label="Importo dovuto" className="pt-4">
              {totalDue != null ? `€${totalDue.toFixed(2)}` : '—'}
            </InfoRow>
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
                  const date = new Date(p.paid_at ?? p.created_at).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                  return (
                    <li key={p.id}>
                      <div
                        className="flex items-center gap-4 py-3 px-3 rounded-lg"
                        style={{ background: '#023047' }}
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm">
                            €{Number(p.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-white/50 mt-0.5">
                            {date} · {methodLabel(p.payment_method)}
                            {p.metadata?.note && <> · {p.metadata.note}</>}
                          </p>
                        </div>
                        <button
                          onClick={() => deletePayment(p.id)}
                          aria-label="Elimina pagamento"
                          className="flex-shrink-0 text-white/30 hover:text-white transition-colors"
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

          {/* Form aggiunta pagamento */}
          {addingPayment && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex flex-col divide-y divide-gray-200">
                <FormRow label="Importo (€)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className={INPUT_CLASS}
                  />
                </FormRow>
                <FormRow label="Metodo">
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="cash">Contanti</option>
                    <option value="bank_transfer">Bonifico</option>
                  </select>
                </FormRow>
                <FormRow label="Nota (opzionale)">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="es. Rata gennaio"
                    className={INPUT_CLASS}
                  />
                </FormRow>
              </div>
              <div className="flex gap-3 mt-4">
                {paymentError && (
                  <p className="flex-1 text-xs text-secondary font-medium self-center">
                    {paymentError}
                  </p>
                )}
                <button
                  onClick={() => {
                    setAddingPayment(false);
                    setNewAmount('');
                    setNewNote('');
                    setPaymentError(null);
                  }}
                  className={`${BUTTON_CLASS} bg-[#022431]`}
                >
                  Annulla
                </button>
                <button
                  onClick={addPayment}
                  disabled={savingPayment || !newAmount}
                  className={`${BUTTON_CLASS} bg-secondary disabled:opacity-50`}
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
                </button>
              </div>
            </div>
          )}

          {/* Form imposta quota */}
          {settingFee && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Quota totale (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  placeholder={enrollmentFee != null ? enrollmentFee.toFixed(2) : '0.00'}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setSettingFee(false);
                    setFeeInput('');
                  }}
                  className={`${BUTTON_CLASS} bg-[#022431]`}
                >
                  Annulla
                </button>
                <button
                  onClick={updateFee}
                  disabled={savingFee || !feeInput}
                  className={`${BUTTON_CLASS} bg-secondary disabled:opacity-50`}
                >
                  {savingFee ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
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
                  if (feeInput === '') {
                    const defaultFee =
                      enrollmentFee ??
                      (course.price_per_month ? Number(course.price_per_month) : null);
                    if (defaultFee != null) setFeeInput(String(defaultFee));
                  }
                }}
                className={`${BUTTON_CLASS} bg-[#023047]`}
              >
                Imposta quota
              </button>
              <button
                onClick={() => setAddingPayment(true)}
                className={`${BUTTON_CLASS} bg-secondary`}
              >
                Aggiungi pagamento
              </button>
            </div>
          )}
        </div>
      )}

      {/* Azioni */}
      {showAccounting && !isGuest && (
        <Link
          href={`/dashboard/admin/users/${userId}`}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:opacity-90 transition-all font-medium"
        >
          Vai al profilo
        </Link>
      )}
    </div>
  );
}
