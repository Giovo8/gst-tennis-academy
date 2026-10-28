import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth, isAdminOrGestore } from '@/lib/auth/verifyAuth';
import { createBookingSchema } from '@/lib/validation/schemas';
import { sanitizeObject, sanitizePhone, sanitizeUuid } from '@/lib/security/sanitize-server';
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from '@/lib/security/rate-limiter';
import { shouldNotifyAdminsForUserBookingDeletion } from '@/lib/bookings/bookingDeletionNotifications';
import { BOOKING_DELETE_SNAPSHOT_FIELDS } from '@/lib/bookings/bookingDeletionEmail';
import logger from '@/lib/logger/secure-logger';
import { HTTP_STATUS, ERROR_MESSAGES, BOOKING_STATUS } from '@/lib/constants/app';
import { normalizeBookingMutation } from '@/lib/bookings/normalizeBookingMutation';
import {
  validateRestrictedBookingHours,
  isBookingEnded,
} from '@/lib/bookings/bookingTimeRestrictions';
import { findCourseConflict, COURSE_CONFLICT_SELECT } from '@/lib/bookings/courseConflicts';
import {
  resolveBookingUpdatePermission,
  pickBookingMoveFields,
} from '@/lib/bookings/bookingUpdateAuth';
import {
  handleBookingCreatedSideEffects,
  handleBookingPendingSideEffects,
  handleBookingUpdatedSideEffects,
  handleBookingDeletedSideEffects,
} from '@/lib/bookings/bookingService';
import { logActivityServer } from '@/lib/activity/logActivity';
import { TOURNAMENT_BOOKING_TYPE } from '@/lib/bookings/tournamentBookings';
import { resolveTournamentMatchForBooking } from '@/lib/bookings/tournamentBookingsServer';

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimit = await applyRateLimit(clientId, RATE_LIMITS.API_WRITE);

    if (!rateLimit.allowed) {
      logger.security('Booking creation rate limit exceeded', { clientId });
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.RATE_LIMIT,
          retryAfter: rateLimit.reset,
        },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        },
      );
    }

    // Authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Parse and sanitize input
    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);

    // Validate with Zod
    const validationResult = createBookingSchema.safeParse(sanitized);

    if (!validationResult.success) {
      logger.warn('Booking validation failed', {
        userId: user.id,
        errors: validationResult.error.issues,
      });
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: validationResult.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const bookingData = validationResult.data;
    const { court, type, start_time, end_time } = bookingData;
    let { user_id, coach_id, participants } = bookingData;

    const canBookForOthers = isAdminOrGestore(profile?.role);

    // Prenotazione torneo: titolare e partecipanti derivano dalla partita, non dal client.
    // Atleti/maestri possono prenotare solo le proprie partite, admin/gestore tutte.
    let tournamentMatchId: string | null = null;
    if (type === TOURNAMENT_BOOKING_TYPE) {
      const resolved = await resolveTournamentMatchForBooking(
        bookingData.tournament_match_id as string,
        {
          userId: user.id,
          isPrivileged: canBookForOthers,
        },
      );

      if (resolved.error) {
        logger.warn('Tournament booking rejected', {
          userId: user.id,
          tournamentMatchId: bookingData.tournament_match_id,
          reason: resolved.error,
        });
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      }

      const { player1, player2 } = resolved.match;
      tournamentMatchId = resolved.match.id;
      coach_id = null;
      participants = [player1, player2].map((player) => ({
        user_id: player.user_id,
        full_name: player.full_name,
        email: player.email,
        phone: null,
        is_registered: Boolean(player.user_id),
      }));
      user_id = canBookForOthers ? player1.user_id ?? player2.user_id ?? user.id : user.id;
    }

    // Authorization: users can only book for themselves, admin/gestore for anyone
    if (user_id !== user.id && !canBookForOthers) {
      logger.security('Unauthorized booking attempt for other user', {
        userId: user.id,
        targetUserId: user_id,
      });
      return NextResponse.json(
        { error: 'Operazione non consentita' },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    // Restrizione oraria per atleti e maestri (admin e gestore non hanno limiti)
    if (profile?.role === 'atleta' || profile?.role === 'maestro') {
      const timeError = validateRestrictedBookingHours(start_time, end_time);
      if (timeError) {
        logger.warn('Booking outside allowed hours', {
          userId: user.id,
          role: profile.role,
          start_time,
          end_time,
        });
        return NextResponse.json({ error: timeError }, { status: HTTP_STATUS.FORBIDDEN });
      }
    }

    // Determine if this should be a pending booking:
    // only when an athlete books a private lesson (coach approves later).
    const shouldBePending = type === 'lezione_privata' && profile?.role === 'atleta';

    // Check for overlapping CONFIRMED bookings on the same court.
    // Pending bookings do not occupy the slot and are intentionally excluded.
    const { data: conflicts, error: conflictError } = await supabaseServer
      .from('bookings')
      .select('id, user_id, status, start_time, end_time')
      .eq('court', court)
      .neq('status', BOOKING_STATUS.CANCELLED)
      .neq('status', BOOKING_STATUS.REJECTED)
      .neq('status', BOOKING_STATUS.PENDING)
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

    if (conflictError) {
      logger.error('Error checking booking conflicts', conflictError, {
        userId: user.id,
        court,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    if ((conflicts || []).length > 0) {
      logger.warn('Booking conflict detected', {
        userId: user.id,
        court,
        requestedTime: start_time,
      });
      return NextResponse.json(
        {
          error: 'Orario già prenotato',
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    // Check for court blocks overlapping the requested slot
    const { data: blockConflicts, error: blockConflictError } = await supabaseServer
      .from('court_blocks')
      .select('id')
      .eq('court_id', court)
      .eq('is_disabled', false)
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (blockConflictError) {
      logger.error('Error checking court blocks', blockConflictError, {
        userId: user.id,
        court,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    if ((blockConflicts || []).length > 0) {
      logger.warn('Booking blocked by court block', {
        userId: user.id,
        court,
        requestedTime: start_time,
      });
      return NextResponse.json(
        {
          error: 'Campo non disponibile',
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    // Check for course conflicts overlapping the requested slot
    const { data: courseData, error: courseError } = await supabaseServer
      .from('courses')
      .select(COURSE_CONFLICT_SELECT)
      .eq('is_active', true);

    if (courseError) {
      logger.error('Error checking course conflicts', courseError, { userId: user.id, court });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    if (findCourseConflict(courseData, court, start_time, end_time)) {
      logger.warn('Booking blocked by scheduled course', {
        userId: user.id,
        court,
        requestedTime: start_time,
      });
      return NextResponse.json(
        {
          error: 'Campo occupato da un corso',
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    // If the booking should be pending, inject the status before normalizing.
    // normalizeBookingMutation now passes `pending` through unchanged.
    const bookingDataWithStatus = shouldBePending
      ? { ...bookingData, status: BOOKING_STATUS.PENDING }
      : bookingData;

    const normalizedBooking = normalizeBookingMutation(bookingDataWithStatus);

    // Formato calcolato una sola volta dal numero di partecipanti al momento della creazione
    // e mai ricalcolato: campo -> singolo (<=2 giocatori) / doppio (>2); lezione_privata ->
    // singola (1 partecipante) / doppia (2+ partecipanti).
    const bookingType = type || 'campo';
    const bookingFormato =
      bookingType === 'campo'
        ? participants.length > 2
          ? 'doppio'
          : 'singolo'
        : bookingType === 'lezione_privata'
        ? participants.length > 1
          ? 'doppia'
          : 'singola'
        : null;

    const { data, error } = await supabaseServer
      .from('bookings')
      .insert([
        {
          user_id,
          coach_id: coach_id || null,
          created_by: user.id,
          court,
          type: type || 'campo',
          formato: bookingFormato,
          start_time,
          end_time,
          status: normalizedBooking.status,
          coach_confirmed: normalizedBooking.coach_confirmed,
          manager_confirmed: normalizedBooking.manager_confirmed,
          notes: bookingData.notes || null,
          // Colonna aggiunta dalla migrazione 084: inviata solo per le prenotazioni torneo.
          ...(tournamentMatchId ? { tournament_match_id: tournamentMatchId } : {}),
        },
      ])
      .select();

    if (error) {
      // Race condition: un'altra prenotazione attiva per la stessa partita è appena stata creata
      if (tournamentMatchId && error.code === '23505') {
        return NextResponse.json(
          { error: 'Partita già prenotata', conflict: true },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
      // Handle race condition: DB constraint violation means slot was taken concurrently
      const isOverlapConstraint =
        error.message?.includes('bookings_no_overlap') || error.code === '23P01';
      if (isOverlapConstraint) {
        logger.warn('Booking overlap constraint violation (race condition)', {
          userId: user.id,
          court,
          start_time,
        });
        return NextResponse.json(
          { error: 'Orario già prenotato', conflict: true },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
      logger.error('Failed to create booking', error, { userId: user.id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    // Insert booking participants if provided
    let participantsInserted = 0;
    if (data && data[0] && participants && participants.length > 0) {
      const bookingId = data[0].id;
      const participantsData = participants.map((p, index) => ({
        booking_id: bookingId,
        user_id: p.user_id || null,
        full_name: p.full_name,
        email: p.email || null,
        phone: p.phone ? sanitizePhone(p.phone) : null,
        is_registered: p.is_registered || false,
        participant_type: 'atleta',
        order_index: index,
      }));

      const { error: participantsError, data: insertedParticipants } = await supabaseServer
        .from('booking_participants')
        .insert(participantsData)
        .select();

      if (participantsError) {
        const missingPhoneColumn = participantsError.message?.toLowerCase().includes('phone');

        if (missingPhoneColumn) {
          const fallbackParticipantsData = participantsData.map((participant) => {
            const rest: Record<string, unknown> = { ...participant };
            delete rest.phone;
            return rest;
          });
          const { error: fallbackError, data: fallbackInsertedParticipants } = await supabaseServer
            .from('booking_participants')
            .insert(fallbackParticipantsData)
            .select();

          if (fallbackError) {
            logger.warn('Failed to insert booking participants after phone fallback', {
              bookingId,
              error: fallbackError,
            });
          } else {
            participantsInserted = fallbackInsertedParticipants?.length || 0;
          }
        } else {
          logger.warn('Failed to insert booking participants', {
            bookingId,
            error: participantsError,
          });
        }
      } else {
        participantsInserted = insertedParticipants?.length || 0;
      }
    }

    // Trigger notifications, emails, and activity log.
    // Pending bookings use a separate handler that notifies admins + coach for approval.
    if (data && data[0]) {
      if (data[0].status === BOOKING_STATUS.PENDING) {
        await handleBookingPendingSideEffects({
          booking: data[0],
          user,
          profile,
          userId: user_id,
          ipAddress: req.headers.get('x-forwarded-for'),
          userAgent: req.headers.get('user-agent'),
          participantsInserted,
        });
      } else {
        await handleBookingCreatedSideEffects({
          booking: data[0],
          user,
          profile,
          participants,
          userId: user_id,
          ipAddress: req.headers.get('x-forwarded-for'),
          userAgent: req.headers.get('user-agent'),
          participantsInserted,
          // Prenotazione già conclusa inserita da admin/gestore (registrazione a posteriori
          // per contabilità): niente email né notifiche, solo log attività.
          skipNotifications: canBookForOthers && isBookingEnded(end_time),
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Booking created successfully', {
      userId: user.id,
      bookingId: data[0].id,
      participantsCount: participantsInserted,
    });
    logger.apiResponse('POST', '/api/bookings', HTTP_STATUS.CREATED, duration);

    return NextResponse.json({ booking: data?.[0] ?? null }, { status: HTTP_STATUS.CREATED });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in bookings POST', err);
    logger.apiResponse('POST', '/api/bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function PUT(req: Request) {
  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check if booking exists
    const { data: booking } = await supabaseServer
      .from('bookings')
      .select('user_id, coach_id, court, type, start_time, end_time, notes, tournament_match_id')
      .eq('id', id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // Authorization check.
    // Admin/gestore: modifica completa. Maestro: può SOLO spostare/ridimensionare
    // (court/start_time/end_time) le proprie prenotazioni — quelle in cui è
    // l'atleta prenotante o il coach assegnato. Nessun altro ruolo può modificare.
    const permission = resolveBookingUpdatePermission(
      { role: profile?.role, userId: user.id },
      { user_id: booking.user_id, coach_id: booking.coach_id },
    );

    if (!permission.allowed) {
      logger.security('Unauthorized booking update attempt', {
        userId: user.id,
        bookingId: id,
        role: profile?.role,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    const updatedByManager = booking.user_id !== user.id;

    let shouldNotifyAthlete = false;
    if (updatedByManager) {
      const { data: ownerProfile, error: ownerProfileError } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', booking.user_id)
        .single();

      if (ownerProfileError) {
        logger.warn('Failed to resolve booking owner role before update', {
          bookingId: id,
          ownerId: booking.user_id,
          error: ownerProfileError.message,
        });
      }

      shouldNotifyAthlete = ownerProfile?.role === 'atleta';
    }

    const rawBody = await req.json();
    let sanitized = sanitizeObject(rawBody);

    // Un maestro può solo spostare/ridimensionare: scarta ogni campo che non
    // sia court/start_time/end_time, così non può modificare tipo, atleti,
    // coach, stato o note tramite questo endpoint.
    if (permission.moveOnly) {
      sanitized = pickBookingMoveFields(sanitized);
    }

    // Prenotazione torneo: la partita va validata come in creazione (esclusa la prenotazione
    // stessa dal controllo "già prenotata"); passando a un altro tipo il collegamento si azzera.
    const nextType = (sanitized.type as string | undefined) ?? booking.type;
    if (nextType === TOURNAMENT_BOOKING_TYPE) {
      const nextMatchId =
        (sanitized.tournament_match_id as string | null | undefined) ?? booking.tournament_match_id;
      if (!nextMatchId || !sanitizeUuid(nextMatchId)) {
        return NextResponse.json(
          { error: 'Seleziona la partita' },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      if (nextMatchId !== booking.tournament_match_id || booking.type !== TOURNAMENT_BOOKING_TYPE) {
        const resolved = await resolveTournamentMatchForBooking(
          nextMatchId,
          { userId: user.id, isPrivileged: isAdminOrGestore(profile?.role) },
          { excludeBookingId: id },
        );
        if (resolved.error) {
          logger.warn('Tournament booking update rejected', {
            userId: user.id,
            bookingId: id,
            reason: resolved.error,
          });
          return NextResponse.json({ error: resolved.error }, { status: resolved.status });
        }
      }

      sanitized = { ...sanitized, tournament_match_id: nextMatchId, coach_id: null };
    } else if (sanitized.type !== undefined && booking.tournament_match_id) {
      sanitized = { ...sanitized, tournament_match_id: null };
    }

    // Check for overlapping bookings if court/time is being changed
    const newCourt = (sanitized.court as string | undefined) || booking.court;
    const newStartTime = (sanitized.start_time as string | undefined) || booking.start_time;
    const newEndTime = (sanitized.end_time as string | undefined) || booking.end_time;

    const { data: conflicts, error: conflictError } = await supabaseServer
      .from('bookings')
      .select('id')
      .eq('court', newCourt)
      .neq('id', id)
      .neq('status', BOOKING_STATUS.CANCELLED)
      .neq('status', BOOKING_STATUS.REJECTED)
      .neq('status', BOOKING_STATUS.PENDING)
      .or(`and(start_time.lt.${newEndTime},end_time.gt.${newStartTime})`);

    if (conflictError) {
      logger.error('Error checking booking conflicts on update', conflictError, {
        userId: user.id,
        bookingId: id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    if ((conflicts || []).length > 0) {
      logger.warn('Booking conflict detected on update', {
        userId: user.id,
        bookingId: id,
        court: newCourt,
        requestedTime: newStartTime,
      });
      return NextResponse.json(
        {
          error: 'Orario già prenotato',
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    // Check for court blocks overlapping the (possibly new) slot
    const { data: blockConflicts, error: blockConflictError } = await supabaseServer
      .from('court_blocks')
      .select('id')
      .eq('court_id', newCourt)
      .eq('is_disabled', false)
      .lt('start_time', newEndTime)
      .gt('end_time', newStartTime);

    if (blockConflictError) {
      logger.error('Error checking court blocks on update', blockConflictError, {
        userId: user.id,
        bookingId: id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    if ((blockConflicts || []).length > 0) {
      logger.warn('Booking update blocked by court block', {
        userId: user.id,
        bookingId: id,
        court: newCourt,
      });
      return NextResponse.json(
        { error: 'Campo non disponibile', conflict: true },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    // Check for scheduled-course conflicts overlapping the (possibly new) slot
    const { data: courseData, error: courseError } = await supabaseServer
      .from('courses')
      .select(COURSE_CONFLICT_SELECT)
      .eq('is_active', true);

    if (courseError) {
      logger.error('Error checking course conflicts on update', courseError, {
        userId: user.id,
        bookingId: id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    if (findCourseConflict(courseData, newCourt, newStartTime, newEndTime)) {
      logger.warn('Booking update blocked by scheduled course', {
        userId: user.id,
        bookingId: id,
        court: newCourt,
      });
      return NextResponse.json(
        {
          error: 'Campo occupato da un corso',
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    const normalizedUpdate = normalizeBookingMutation(sanitized);

    const { data, error } = await supabaseServer
      .from('bookings')
      .update(normalizedUpdate)
      .eq('id', id)
      .select();

    if (error) {
      const isOverlapConstraint =
        error.message?.includes('bookings_no_overlap') || error.code === '23P01';
      if (isOverlapConstraint) {
        logger.warn('Booking overlap constraint violation on update (race condition)', {
          userId: user.id,
          bookingId: id,
          court: newCourt,
        });
        return NextResponse.json(
          { error: 'Orario già prenotato', conflict: true },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
      if (error.code === '23505' && sanitized.tournament_match_id) {
        return NextResponse.json(
          { error: 'Partita già prenotata', conflict: true },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
      logger.error('Failed to update booking', error, { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    // Email ai destinatari + notifica push all'atleta.
    // Il record aggiornato può non tornare (RLS/select vuota): in quel caso
    // ricostruiamo lo stato finale unendo i valori precedenti alla modifica.
    const updatedBooking = data?.[0] || { ...booking, ...normalizedUpdate };

    // Correzione da parte di admin/gestore di una prenotazione già conclusa (e che resta
    // nel passato): niente email né notifiche, solo log attività.
    const isPastCorrection =
      isAdminOrGestore(profile?.role) &&
      isBookingEnded(booking.end_time) &&
      isBookingEnded(updatedBooking.end_time);

    if (!isPastCorrection) {
      await handleBookingUpdatedSideEffects({
        booking: updatedBooking,
        previous: {
          court: booking.court,
          start_time: booking.start_time,
          end_time: booking.end_time,
        },
        bookingId: id,
        user,
        profile,
        shouldNotifyAthlete,
      });
    }

    await logActivityServer({
      userId: user.id,
      action: 'booking.update',
      entityType: 'booking',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        updatedByRole: profile?.role || null,
        updatedByManager,
        updatedFields: Object.keys(normalizedUpdate || {}),
        ownerUserId: booking.user_id,
      },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', '/api/bookings', HTTP_STATUS.OK, duration);
    return NextResponse.json({ booking: data?.[0] });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in bookings PUT', err);
    logger.apiResponse('PUT', '/api/bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function DELETE(req: Request) {
  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check if booking exists
    const { data: booking } = await supabaseServer
      .from('bookings')
      .select(BOOKING_DELETE_SNAPSHOT_FIELDS)
      .eq('id', id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // Authorization check
    const canDelete = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canDelete) {
      logger.security('Unauthorized booking deletion attempt', {
        userId: user.id,
        bookingId: id,
        role: profile?.role,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    const deletedByManager = isAdminOrGestore(profile?.role) && booking.user_id !== user.id;
    const deletedByOwner = booking.user_id === user.id;

    const { data: bookingParticipants, error: bookingParticipantsError } = await supabaseServer
      .from('booking_participants')
      .select('user_id, full_name, email, is_registered, order_index')
      .eq('booking_id', id)
      .order('order_index', { ascending: true });

    if (bookingParticipantsError) {
      logger.warn('Failed to fetch booking participants before deletion email', {
        bookingId: id,
        error: bookingParticipantsError.message,
      });
    }

    let shouldNotifyAthlete = false;
    let bookingOwnerRole: string | null = null;
    let bookingOwnerFullName: string | null = null;
    let bookingOwnerEmail: string | null = null;

    if (deletedByManager || deletedByOwner) {
      const { data: ownerProfile, error: ownerProfileError } = await supabaseServer
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', booking.user_id)
        .single();

      if (ownerProfileError) {
        logger.warn('Failed to resolve booking owner role before deletion', {
          bookingId: id,
          ownerId: booking.user_id,
          error: ownerProfileError.message,
        });
      } else {
        bookingOwnerRole = ownerProfile?.role || null;
        bookingOwnerFullName = ownerProfile?.full_name || null;
        bookingOwnerEmail = ownerProfile?.email || null;
      }

      shouldNotifyAthlete = deletedByManager && ownerProfile?.role === 'atleta';
    }

    const shouldNotifyAdmins = shouldNotifyAdminsForUserBookingDeletion({
      actorUserId: user.id,
      bookingOwnerId: booking.user_id,
      actorRole: profile?.role,
      ownerRole: bookingOwnerRole,
    });

    const { error } = await supabaseServer.from('bookings').delete().eq('id', id);

    if (error) {
      logger.error('Failed to delete booking', error, { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    // Trigger deletion email, athlete notification, and admin notification
    await handleBookingDeletedSideEffects({
      booking,
      bookingId: id,
      user,
      profile,
      bookingParticipants: bookingParticipants || [],
      bookingOwnerFullName,
      bookingOwnerEmail,
      bookingOwnerRole,
      shouldNotifyAthlete,
      shouldNotifyAdmins,
      deletedByOwner,
    });

    await logActivityServer({
      userId: user.id,
      action: 'booking.cancel',
      entityType: 'booking',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        deletedByRole: profile?.role || null,
        deletedByManager,
        deletedByOwner,
        ownerUserId: booking.user_id,
      },
    });

    logger.info('Booking deleted', { userId: user.id, bookingId: id });
    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', '/api/bookings', HTTP_STATUS.OK, duration);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in bookings DELETE', err);
    logger.apiResponse('DELETE', '/api/bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
