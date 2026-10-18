'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import { getSessionUser } from '@/lib/auth/clientSession';
import { createNotification } from '@/lib/notifications/createNotification';
import { resolveCourseCourtsForDate } from '@/lib/bookings/courseConflicts';
import {
  TOURNAMENT_BOOKING_TYPE,
  TOURNAMENT_BOOKING_BACKGROUND,
} from '@/lib/bookings/tournamentBookings';
import {
  Calendar,
  Plus,
  Loader2,
  XCircle,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  MoreVertical,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Booking {
  id: string;
  court: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  coach_id: string | null;
  notes: string | null;
  coach?: {
    full_name: string;
  };
  // For BookingsTimeline compatibility
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
  participants?: Array<{
    id?: string;
    booking_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_registered: boolean;
    user_id?: string | null;
    order_index?: number;
  }>;
}

type BookingsPageProps = {
  mode?: 'default' | 'history';
};

type ProfileLite = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
};

type CourseData = {
  id: string;
  name: string;
  schedule_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
  cancelled_dates: string[] | null;
  extra_dates: string[] | null;
  lesson_overrides: Record<string, string> | null;
  lesson_time_overrides: Record<string, string> | null;
  schedule_periods:
    | { days: string[]; time: string | null; court?: string | null; courts?: string[] | null }[]
    | null;
  court_name: string | null;
  schedule_time: string | null;
};

type CourseLesson = {
  courseId: string;
  courseName: string;
  dateStr: string;
  court: string | null;
  time: string | null;
};

const COURSE_DAY_INDEX: Record<string, number> = {
  dom: 0,
  lun: 1,
  mar: 2,
  mer: 3,
  gio: 4,
  ven: 5,
  sab: 6,
};
const COURSE_DAY_CODE: Record<number, string> = {
  0: 'dom',
  1: 'lun',
  2: 'mar',
  3: 'mer',
  4: 'gio',
  5: 'ven',
  6: 'sab',
};

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function getNextCourseLessonDate(course: CourseData, fromDateStr: string): string | null {
  const { start_date, end_date, schedule_days, cancelled_dates, extra_dates } = course;
  if (!start_date || !end_date || !schedule_days?.length) return null;
  const allowed = new Set(schedule_days.map((d) => COURSE_DAY_INDEX[d] ?? -1));
  const cancelled = new Set(cancelled_dates ?? []);
  const startStr = fromDateStr > start_date ? fromDateStr : start_date;
  const cur = new Date(startStr + 'T12:00:00');
  const endD = new Date(end_date + 'T12:00:00');
  while (cur <= endD) {
    const dateStr = cur.toISOString().split('T')[0];
    if (allowed.has(cur.getDay()) && !cancelled.has(dateStr)) return dateStr;
    cur.setDate(cur.getDate() + 1);
  }
  const futureExtras = (extra_dates ?? []).filter((d) => d >= fromDateStr).sort();
  return futureExtras[0] ?? null;
}

function getCourseCourtForDate(course: CourseData, dateStr: string): string | null {
  const dayCode = COURSE_DAY_CODE[new Date(dateStr + 'T12:00:00').getDay()];
  const courts = resolveCourseCourtsForDate(course, dateStr, dayCode);
  return courts.length > 0 ? courts.join(', ') : null;
}

function getCourseTimeForDate(course: CourseData, dateStr: string): string | null {
  if (course.lesson_time_overrides?.[dateStr]) return course.lesson_time_overrides[dateStr];
  if (course.schedule_periods?.length) {
    const dayCode = COURSE_DAY_CODE[new Date(dateStr + 'T12:00:00').getDay()];
    const period = course.schedule_periods.find((p) => p.days?.includes(dayCode));
    if (period?.time) return period.time;
  }
  return course.schedule_time;
}

export default function BookingsPage({ mode = 'default' }: BookingsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dashboardBase = pathname.split('/bookings')[0];
  const isMaestroDashboard = dashboardBase.includes('/dashboard/maestro');
  const isHistoryMode = mode === 'history';
  const secondaryCardClassName = 'bg-white rounded-lg border border-black/10 overflow-hidden';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVisibility, setFilterVisibility] = useState<
    'active' | 'today' | 'archived' | 'cancelled' | 'past' | 'all'
  >('active');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterCoach, setFilterCoach] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCourt, setFilterCourt] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('start_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [courseNextLessons, setCourseNextLessons] = useState<CourseLesson[]>([]);

  async function loadCourseNextLessons(maestroFullName: string) {
    const now = new Date();
    const todayStr = localDateStr(now);
    const tomorrowStr = localDateStr(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    );
    const { data } = await supabase
      .from('courses')
      .select(
        'id, name, schedule_days, start_date, end_date, cancelled_dates, extra_dates, lesson_overrides, lesson_time_overrides, schedule_periods, court_name, schedule_time',
      )
      .eq('is_active', true)
      .ilike('instructor_name', `%${maestroFullName}%`);
    if (!data) return;
    const lessons: CourseLesson[] = [];
    for (const course of data as CourseData[]) {
      let dateStr = getNextCourseLessonDate(course, todayStr);
      if (!dateStr) continue;
      // Se la lezione è oggi, controlla se l'orario è già passato
      if (dateStr === todayStr) {
        const time = getCourseTimeForDate(course, dateStr);
        if (time) {
          const endMatch = time.match(/(\d{1,2}):(\d{2})\s*$/);
          if (endMatch) {
            const lessonEnd = new Date();
            lessonEnd.setHours(parseInt(endMatch[1]), parseInt(endMatch[2]), 0, 0);
            if (now > lessonEnd) {
              dateStr = getNextCourseLessonDate(course, tomorrowStr);
            }
          }
        }
      }
      if (!dateStr) continue;
      lessons.push({
        courseId: course.id,
        courseName: course.name,
        dateStr,
        court: getCourseCourtForDate(course, dateStr),
        time: getCourseTimeForDate(course, dateStr),
      });
    }
    setCourseNextLessons(lessons);
  }

  useEffect(() => {
    if (!isMaestroDashboard || isHistoryMode) return;
    async function init() {
      const {
        data: { user },
      } = await getSessionUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) await loadCourseNextLessons(profile.full_name);
    }
    void init();
  }, [isMaestroDashboard, isHistoryMode]);

  const getPrimaryParticipant = (booking: Booking) =>
    booking.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

  const getAthleteDisplayName = (booking: Booking) =>
    getPrimaryParticipant(booking)?.full_name || booking.user_profile?.full_name || 'N/A';

  const getAthleteDisplayEmail = (booking: Booking) => {
    if ((booking.participants?.length || 0) > 0) {
      return getPrimaryParticipant(booking)?.email || '';
    }

    return booking.user_profile?.email || '';
  };

  const closeActionMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const openActionMenu = (bookingId: string, buttonRect: DOMRect) => {
    const menuWidth = 176;
    const menuHeight = 136;
    const viewportPadding = 8;

    let left = buttonRect.right - menuWidth;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - menuWidth - viewportPadding),
    );

    let top = buttonRect.bottom + 6;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, buttonRect.top - menuHeight - 6);
    }

    setOpenMenuId(bookingId);
    setMenuPosition({ top, left });
  };

  async function loadBookings() {
    setLoading(true);

    const {
      data: { user },
    } = await getSessionUser();
    if (!user) {
      setLoading(false);
      return;
    }

    if (isMaestroDashboard) {
      // For list mode in maestro dashboard, always load all bookings where the maestro is involved
      // (as coach OR as athlete), even outside the timeline date range.
      const { data: involvedBookingsData, error: involvedBookingsError } = await supabase
        .from('bookings')
        .select('*')
        .or(`coach_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('start_time', { ascending: false })
        .limit(2000);

      if (involvedBookingsError) {
        console.error(
          '❌ Errore caricamento prenotazioni coinvolte maestro:',
          involvedBookingsError,
        );
        setLoading(false);
        return;
      }

      const involvedData = involvedBookingsData ?? [];
      const involvedUserIds = [
        ...new Set([
          ...involvedData.map((b) => b.user_id),
          ...involvedData.map((b) => b.coach_id).filter(Boolean),
        ]),
      ];

      const involvedBookingIds = involvedData.map((b) => b.id);
      let involvedParticipantsData: Booking['participants'] | null = null;

      // Profili e partecipanti dipendono solo dalle prenotazioni: in parallelo
      const [{ data: involvedProfiles }, participantsQuery] = await Promise.all([
        involvedUserIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, full_name, email, phone')
              .in('id', involvedUserIds)
          : Promise.resolve({ data: [] as ProfileLite[] }),
        involvedBookingIds.length > 0
          ? supabase
              .from('booking_participants')
              .select(
                'id, booking_id, full_name, email, phone, is_registered, user_id, order_index',
              )
              .in('booking_id', involvedBookingIds)
              .order('booking_id', { ascending: true })
              .order('order_index', { ascending: true })
          : Promise.resolve(null),
      ]);

      const involvedProfilesMap = new Map<string, ProfileLite>(
        ((involvedProfiles ?? []) as ProfileLite[]).map((p) => [p.id, p]),
      );

      if (participantsQuery) {
        if (participantsQuery.error?.message?.toLowerCase().includes('phone')) {
          const fallbackQuery = await supabase
            .from('booking_participants')
            .select('id, booking_id, full_name, email, is_registered, user_id, order_index')
            .in('booking_id', involvedBookingIds);
          if (!fallbackQuery.error) involvedParticipantsData = fallbackQuery.data || [];
        } else if (!participantsQuery.error) {
          involvedParticipantsData = participantsQuery.data || [];
        }
      }

      const involvedEnrichedBookings = involvedData.map((booking) => {
        const coachData = booking.coach_id ? involvedProfilesMap.get(booking.coach_id) : null;

        return {
          ...booking,
          coach: coachData ? { full_name: coachData.full_name } : undefined,
          user_profile: involvedProfilesMap.get(booking.user_id) || null,
          coach_profile: coachData
            ? {
                full_name: coachData.full_name,
                email: coachData.email,
                phone: coachData.phone,
              }
            : null,
          participants: involvedParticipantsData?.filter((p) => p.booking_id === booking.id) || [],
        };
      });

      // In dashboard maestro, show all bookings where the maestro is involved,
      // regardless of default/history page mode.
      setBookings(involvedEnrichedBookings);
      setLoading(false);
      return;
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', user.id)
      .single();

    // Query base
    let query = supabase.from('bookings').select('*').eq('user_id', user.id);

    // In modalità default mostra solo dal giorno corrente in avanti
    // In modalità history mostra solo prenotazioni passate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (mode === 'default') {
      query = query.gte('start_time', today.toISOString());
    } else if (mode === 'history') {
      query = query.lt('start_time', today.toISOString());
    }

    const { data: bookingsData, error: bookingsError } = await query
      .order('start_time', { ascending: false })
      .limit(100);

    if (bookingsError) {
      console.error('❌ Errore caricamento prenotazioni:', bookingsError);
      setLoading(false);
      return;
    }

    if (!bookingsData || bookingsData.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Seconda query: prendi i profili dei coach se esistono
    const coachIds = [...new Set(bookingsData.map((b) => b.coach_id).filter(Boolean))];

    let coachesMap = new Map<string, ProfileLite>();
    if (coachIds.length > 0) {
      const { data: coachesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', coachIds);

      if (coachesData) {
        coachesMap = new Map<string, ProfileLite>(
          (coachesData as ProfileLite[]).map((c) => [c.id, c]),
        );
      }
    }

    // Combina i dati con struttura compatibile con BookingsTimeline
    const enrichedBookings = bookingsData.map((booking) => {
      const coachData = booking.coach_id ? coachesMap.get(booking.coach_id) : null;
      return {
        ...booking,
        coach: coachData,
        user_profile: userProfile || null,
        coach_profile: coachData
          ? {
              full_name: coachData.full_name,
              email: coachData.email,
              phone: coachData.phone,
            }
          : null,
      };
    });

    setBookings(enrichedBookings);
    setLoading(false);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (filterType !== 'lezione_privata' && filterCoach !== 'all') {
      setFilterCoach('all');
    }
  }, [filterType, filterCoach]);

  async function cancelBooking(id: string) {
    if (!confirm('Sei sicuro di voler annullare questa prenotazione?')) return;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }

      const {
        data: { user },
      } = await getSessionUser();

      if (!user) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }

      const updateQuery = supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);

      const { error: updateError } = isMaestroDashboard
        ? await updateQuery.or(`user_id.eq.${user.id},coach_id.eq.${user.id}`)
        : await updateQuery.eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message || "Errore durante l'annullamento");
      }

      const cancelledBooking = bookings.find((booking) => booking.id === id);
      if (cancelledBooking) {
        const { data: actorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        const actorName = actorProfile?.full_name?.trim() || 'Un utente';
        const dateLabel = new Date(cancelledBooking.start_time).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeLabel = new Date(cancelledBooking.start_time).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const bookingLabel =
          cancelledBooking.type === 'lezione_privata'
            ? 'lezione privata'
            : cancelledBooking.type === 'lezione_gruppo'
            ? 'lezione di gruppo'
            : cancelledBooking.type === 'arena'
            ? 'match arena'
            : 'prenotazione';

        const notifyPromises: Array<Promise<void>> = [];

        if (cancelledBooking.coach_id && cancelledBooking.coach_id !== user.id) {
          notifyPromises.push(
            createNotification({
              userId: cancelledBooking.coach_id,
              type: 'booking',
              title: 'Prenotazione annullata',
              message: `${actorName} ha annullato la ${bookingLabel} ${cancelledBooking.court} del ${dateLabel} alle ${timeLabel}.`,
              link: `/dashboard/maestro/bookings/${cancelledBooking.id}`,
            }),
          );
        }

        if (cancelledBooking.user_id && cancelledBooking.user_id !== user.id) {
          notifyPromises.push(
            createNotification({
              userId: cancelledBooking.user_id,
              type: 'booking',
              title: 'Prenotazione annullata',
              message: `${actorName} ha annullato la ${bookingLabel} ${cancelledBooking.court} del ${dateLabel} alle ${timeLabel}.`,
              link: `/dashboard/atleta/bookings/${cancelledBooking.id}`,
            }),
          );
        }

        const { data: managers } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'gestore']);

        for (const manager of managers || []) {
          if (manager.id === user.id) continue;
          notifyPromises.push(
            createNotification({
              userId: manager.id,
              type: 'booking',
              title: 'Prenotazione annullata',
              message: `${actorName} ha annullato la ${bookingLabel} ${cancelledBooking.court} del ${dateLabel} alle ${timeLabel}.`,
              link: `/dashboard/admin/bookings/${cancelledBooking.id}`,
            }),
          );
        }

        await Promise.all(notifyPromises);
      }

      await loadBookings();
    } catch (error) {
      console.error("Errore durante l'annullamento della prenotazione:", error);
      toast.error(error instanceof Error ? error.message : "Errore durante l'annullamento");
    }
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const getLocalDateInputValue = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasActiveFilters =
    filterVisibility !== 'active' ||
    filterUser !== 'all' ||
    filterCoach !== 'all' ||
    filterType !== 'all' ||
    filterCourt !== 'all' ||
    Boolean(filterDateFrom) ||
    Boolean(filterDateTo);

  const now = new Date();

  const filteredBookings = bookings
    .filter((booking) => {
      const bookingStartDateObj = new Date(booking.start_time);
      const bookingEndDateObj = new Date(booking.end_time);
      const isPast = bookingEndDateObj < now;
      const isPresentOrFuture = bookingEndDateObj >= now;
      const isTodayBooking =
        bookingStartDateObj.getDate() === now.getDate() &&
        bookingStartDateObj.getMonth() === now.getMonth() &&
        bookingStartDateObj.getFullYear() === now.getFullYear();
      const isCancelled =
        booking.status === 'cancelled' || booking.status === 'cancellation_requested';
      const isSuccessful =
        booking.status === 'confirmed' ||
        booking.status === 'completed' ||
        booking.status === 'confirmed_by_coach';

      const matchesVisibility =
        filterVisibility === 'active'
          ? isPresentOrFuture && !isCancelled
          : filterVisibility === 'today'
          ? isTodayBooking && !isCancelled
          : filterVisibility === 'archived'
          ? (isPast && isSuccessful) || isCancelled
          : filterVisibility === 'cancelled'
          ? isCancelled
          : filterVisibility === 'all'
          ? true
          : isPast && isSuccessful && !isCancelled;

      const matchesType = filterType === 'all' || booking.type === filterType;
      const matchesCourt = filterCourt === 'all' || booking.court === filterCourt;
      const matchesUser = filterUser === 'all' || getAthleteDisplayName(booking) === filterUser;
      const shouldFilterByCoach = filterType === 'lezione_privata';
      const matchesCoach =
        !shouldFilterByCoach ||
        filterCoach === 'all' ||
        (booking.coach_profile?.full_name || '') === filterCoach;
      const bookingDate = getLocalDateInputValue(booking.start_time);
      const matchesDateFrom = !filterDateFrom || bookingDate >= filterDateFrom;
      const matchesDateTo = !filterDateTo || bookingDate <= filterDateTo;
      const normalizedSearch = search.toLowerCase();
      const matchesSearch =
        !search ||
        getAthleteDisplayName(booking).toLowerCase().includes(normalizedSearch) ||
        getAthleteDisplayEmail(booking).toLowerCase().includes(normalizedSearch) ||
        booking.participants?.some(
          (participant) =>
            participant.full_name?.toLowerCase().includes(normalizedSearch) ||
            participant.email?.toLowerCase().includes(normalizedSearch),
        ) ||
        booking.coach_profile?.full_name?.toLowerCase().includes(normalizedSearch) ||
        booking.court?.toLowerCase().includes(normalizedSearch);
      return (
        matchesVisibility &&
        matchesUser &&
        matchesCoach &&
        matchesType &&
        matchesCourt &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesSearch
      );
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'start_time':
          aValue = new Date(a.start_time).getTime();
          bValue = new Date(b.start_time).getTime();
          break;
        case 'court':
          aValue = a.court;
          bValue = b.court;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'coach':
          aValue = a.coach?.full_name || '';
          bValue = b.coach?.full_name || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Merge bookings + course next lessons (maestro only)
  type MergedItem = { kind: 'booking'; data: Booking } | { kind: 'corso'; data: CourseLesson };
  const filteredCourseNextLessons: CourseLesson[] =
    isMaestroDashboard && !isHistoryMode
      ? courseNextLessons.filter((lesson) => {
          const q = search.toLowerCase();
          const matchesSearch = !search || lesson.courseName.toLowerCase().includes(q);
          const matchesType = filterType === 'all';
          const isToday = lesson.dateStr === localDateStr(new Date());
          const matchesDateFrom = !filterDateFrom || lesson.dateStr >= filterDateFrom;
          const matchesDateTo = !filterDateTo || lesson.dateStr <= filterDateTo;
          if (filterVisibility === 'today')
            return matchesSearch && matchesType && isToday && matchesDateFrom && matchesDateTo;
          const matchesVisibility = filterVisibility === 'active' || filterVisibility === 'all';
          return (
            matchesSearch && matchesType && matchesVisibility && matchesDateFrom && matchesDateTo
          );
        })
      : [];
  const mergedItems: MergedItem[] = [
    ...filteredBookings.map((b) => ({ kind: 'booking' as const, data: b })),
    ...filteredCourseNextLessons.map((c) => ({ kind: 'corso' as const, data: c })),
  ].sort((a, b) => {
    const aTime =
      a.kind === 'booking'
        ? new Date(a.data.start_time).getTime()
        : new Date(a.data.dateStr + 'T12:00:00').getTime();
    const bTime =
      b.kind === 'booking'
        ? new Date(b.data.start_time).getTime()
        : new Date(b.data.dateStr + 'T12:00:00').getTime();
    return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-3">
      {/* Header actions */}
      {!isHistoryMode && (
        <div className="w-full">
          <Link
            href={`${dashboardBase}/bookings/new`}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuova Prenotazione</span>
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome atleta, maestro, email o campo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              isAdvancedFiltersOpen || hasActiveFilters
                ? 'border-secondary bg-secondary text-white hover:opacity-90'
                : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
            }`}
            aria-label="Mostra o nascondi chips filtri"
            title="Filtri"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {isAdvancedFiltersOpen && (
          <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:w-full">
              <button
                type="button"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                  sortDirection === 'desc'
                    ? 'border-secondary bg-secondary text-white hover:opacity-90'
                    : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
                }`}
                aria-label="Inverti ordinamento"
                title="Inverti ordinamento"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
                {[
                  { value: 'active', label: 'Attive' },
                  { value: 'today', label: 'Oggi' },
                  { value: 'all', label: 'Tutte' },
                  { value: 'archived', label: 'Archiviate' },
                ].map((option) => {
                  const isSelected = filterVisibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFilterVisibility(
                          option.value as
                            | 'active'
                            | 'today'
                            | 'archived'
                            | 'cancelled'
                            | 'past'
                            | 'all',
                        )
                      }
                      className={`h-11 shrink-0 rounded-lg border px-4 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
                        isSelected
                          ? 'border-secondary bg-secondary text-white'
                          : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterVisibility('active');
                  setFilterUser('all');
                  setFilterCoach('all');
                  setFilterType('all');
                  setFilterCourt('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSortField('start_time');
                  setSortDirection('asc');
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
                aria-label="Reset filtri"
                title="Reset filtri"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento prenotazioni...</p>
        </div>
      ) : mergedItems.length === 0 ? (
        search || hasActiveFilters ? (
          <div
            className={`${secondaryCardClassName} flex flex-col items-center justify-center py-8 text-secondary/40`}
          >
            <Calendar className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">Nessuna prenotazione corrisponde ai filtri</p>
          </div>
        ) : null
      ) : (
        <div className="space-y-2">
          {mergedItems.map((item) => {
            if (item.kind === 'corso') {
              const lesson = item.data;
              const start = new Date(lesson.dateStr + 'T12:00:00');
              return (
                <Link
                  key={`corso-${lesson.courseId}`}
                  href={`/dashboard/maestro/bookings/${lesson.courseId}?date=${lesson.dateStr}`}
                  className="block"
                >
                  <div
                    className="rounded-lg overflow-visible hover:opacity-95 transition-opacity"
                    style={{ background: 'var(--color-frozen-lake-900)' }}
                  >
                    <div className="flex items-center gap-4 py-3 px-3">
                      <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                          {start.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                          {start.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {lesson.courseName}
                        </p>
                        {(lesson.time || lesson.court) && (
                          <p className="text-xs text-white/70 mt-0.5">
                            {[lesson.time, lesson.court].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                        Corso
                      </span>
                    </div>
                  </div>
                </Link>
              );
            }
            const booking = item.data;
            const isPast = new Date(booking.start_time) < new Date();
            const isPastBooking = new Date(booking.end_time) < new Date();
            const isCancelled = booking.status === 'cancelled';
            const isCancellationRequested = booking.status === 'cancellation_requested';
            const canCancel = !isPast && !isCancelled && !isCancellationRequested;
            const start = new Date(booking.start_time);

            const isArenaBooking =
              booking.type === 'arena' || booking.notes?.toLowerCase().includes('sfida arena');

            let typeBg = '';
            if (isCancelled || isCancellationRequested || isPastBooking) {
              typeBg = '#9ca3af';
            } else if (booking.type === 'lezione_privata' || booking.type === 'lezione_gruppo') {
              typeBg = '#023047';
            } else if (booking.type === TOURNAMENT_BOOKING_TYPE) {
              typeBg = TOURNAMENT_BOOKING_BACKGROUND;
            } else if (isArenaBooking) {
              typeBg = '#023b52';
            } else {
              typeBg = 'var(--secondary)';
            }

            const typeLabel =
              booking.type === 'lezione_privata'
                ? 'Lezione Priv.'
                : booking.type === 'lezione_gruppo'
                ? 'Lezione Gruppo'
                : booking.type === 'torneo'
                ? 'Torneo'
                : isArenaBooking
                ? 'Arena'
                : 'Campo';

            return (
              <div
                key={booking.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: typeBg }}
              >
                <div
                  className="flex items-center gap-4 py-3 px-3"
                  onClick={() => router.push(`${dashboardBase}/bookings/${booking.id}`)}
                >
                  <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                    <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                      {start.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}
                    </span>
                    <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                      {start.getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {getAthleteDisplayName(booking)}
                    </p>
                    <p className="text-xs text-white/70 mt-0.5">
                      {formatTime(booking.start_time)}–{formatTime(booking.end_time)} ·{' '}
                      {booking.court}
                      {!isMaestroDashboard &&
                        (booking.type === 'lezione_privata' || booking.type === 'lezione_gruppo') &&
                        booking.coach?.full_name && <span> · {booking.coach.full_name}</span>}
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                    {typeLabel}
                  </span>

                  {!isMaestroDashboard && (
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      {!isMaestroDashboard && false && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (openMenuId === booking.id) {
                              closeActionMenu();
                              return;
                            }

                            openActionMenu(booking.id, e.currentTarget.getBoundingClientRect());
                          }}
                          className="inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none touch-manipulation min-w-[40px] min-h-[40px]"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      )}
                      {!isMaestroDashboard && openMenuId === booking.id && menuPosition && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeActionMenu();
                            }}
                          />
                          <div
                            className="fixed z-50 w-44 bg-white rounded-lg border border-black/10 py-1"
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                closeActionMenu();
                                router.push(`${dashboardBase}/bookings/${booking.id}`);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizza
                            </button>

                            {canCancel && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  closeActionMenu();
                                  cancelBooking(booking.id);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-[#056c94] hover:bg-[#056c94]/10 transition-colors w-full"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Annulla
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
