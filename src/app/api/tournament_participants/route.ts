import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { logActivityServer } from '@/lib/activity/logActivity';
import { sanitizeObject } from '@/lib/security/sanitize-server';
import { enrollGuestSchema } from '@/lib/validation/schemas';
import { isMatchPlayed, MATCH_PLAYED_COLUMNS } from '@/lib/tournaments/matchPlayed';

type Requester = { id: string; role: string; full_name: string | null };

/**
 * Chi può iscrivere o disiscrivere `targetUserId`: l'interessato stesso,
 * admin/gestore per chiunque, un maestro solo se il destinatario è un atleta.
 * Restituisce la risposta di errore, oppure null se l'operazione è consentita.
 */
async function checkCanManage(
  requester: Requester,
  targetUserId: string,
  forbiddenMessage: string,
): Promise<NextResponse | null> {
  if (requester.id === targetUserId) return null;

  const role = requester.role.toLowerCase();
  if (role === 'admin' || role === 'gestore') return null;

  if (role === 'maestro') {
    const { data: target, error } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single();
    if (error || !target) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }
    if (String(target.role).toLowerCase() === 'atleta') return null;
    return NextResponse.json({ error: forbiddenMessage }, { status: 403 });
  }

  return NextResponse.json({ error: 'Operazione non consentita' }, { status: 403 });
}

/** Competizione avviata: la fase non è più quella delle iscrizioni. */
function isTournamentStarted(currentPhase: string | null | undefined): boolean {
  return Boolean(currentPhase) && currentPhase !== 'iscrizioni';
}

/**
 * Rimozione a campionato avviato: consentita solo se l'iscritto non ha
 * giocato partite e nessuna sua partita è prenotata (le prenotazioni torneo copiano i
 * giocatori nei partecipanti, vanno annullate prima). Restituisce l'errore, o null.
 */
async function checkParticipantMatchesUntouched(
  tournamentId: string,
  participantId: string,
): Promise<NextResponse | null> {
  const { data: matches, error } = await supabaseServer
    .from('tournament_matches')
    .select(`id, ${MATCH_PLAYED_COLUMNS}`)
    .eq('tournament_id', tournamentId)
    .or(`player1_id.eq.${participantId},player2_id.eq.${participantId}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if ((matches || []).some((m) => isMatchPlayed(m))) {
    return NextResponse.json({ error: 'Ha già giocato delle partite' }, { status: 409 });
  }

  const matchIds = (matches || []).map((m) => m.id);
  if (matchIds.length === 0) return null;
  const { count: activeBookings } = await supabaseServer
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .in('tournament_match_id', matchIds)
    .not('status', 'in', '(cancelled,rejected)');
  if ((activeBookings ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Ha partite prenotate: annulla prima le prenotazioni' },
      { status: 409 },
    );
  }
  return null;
}

async function getRequester(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.success) return { response: auth.response };
  return {
    requester: {
      id: auth.data.user.id,
      role: auth.data.profile?.role ?? '',
      full_name: auth.data.profile?.full_name ?? null,
    } as Requester,
  };
}

/** GET — pubblico: iscritti filtrati per user_id e/o tournament_id, con nome e avatar. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get('user_id');
    const tournament_id = url.searchParams.get('tournament_id');

    let query = supabaseServer
      .from('tournament_participants')
      .select(`*`)
      .order('created_at', { ascending: false });

    if (user_id) query = query.eq('user_id', user_id);
    if (tournament_id) query = query.eq('tournament_id', tournament_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = (data || []).map((r) => r.user_id).filter(Boolean);
    const profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      (profiles || []).forEach((p) => profilesMap.set(p.id, p));
    }

    // player_name resta nella riga per i giocatori esterni senza account
    const enriched = (data || []).map((r) => ({
      ...r,
      profiles: profilesMap.get(r.user_id) || null,
    }));
    return NextResponse.json({ participants: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST — iscrive `user_id` al torneo, se c'è posto. Body: { user_id, tournament_id }.
 * Un ospite senza account si iscrive con { player_name, tournament_id } (solo admin/gestore).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const isGuest = !body?.user_id && body?.player_name !== undefined;
    const guest = isGuest ? enrollGuestSchema.safeParse(sanitizeObject(body)) : null;
    if (guest && !guest.success) {
      return NextResponse.json(
        { error: guest.error.issues[0]?.message || 'Dati non validi' },
        { status: 400 },
      );
    }
    const user_id: string | undefined = isGuest ? undefined : body?.user_id;
    const tournament_id: string | undefined = guest?.success
      ? guest.data.tournament_id
      : body?.tournament_id;
    const playerName = guest?.success ? guest.data.player_name : undefined;
    if (!isGuest && (!user_id || !tournament_id)) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    const { requester, response } = await getRequester(req);
    if (response) return response;

    if (isGuest) {
      const role = requester.role.toLowerCase();
      if (role !== 'admin' && role !== 'gestore') {
        return NextResponse.json({ error: 'Operazione non consentita' }, { status: 403 });
      }
    } else {
      const denied = await checkCanManage(requester, String(user_id), 'Puoi iscrivere solo atleti');
      if (denied) return denied;
    }

    // Check tournament and capacity
    const { data: tournament, error: tErr } = await supabaseServer
      .from('tournaments')
      .select('max_participants, current_phase')
      .eq('id', tournament_id)
      .single();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 404 });
    if (!tournament) return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });

    // A competizione avviata un iscritto si aggiunge solo con POST /api/tournaments/[id]/add-participant
    if (isTournamentStarted(tournament.current_phase)) {
      return NextResponse.json({ error: 'Iscrizioni chiuse' }, { status: 409 });
    }

    const { count, error: countErr } = await supabaseServer
      .from('tournament_participants')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament_id);
    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

    if ((count ?? 0) >= (tournament.max_participants ?? 0)) {
      return NextResponse.json({ error: 'Torneo al completo' }, { status: 409 });
    }

    if (playerName) {
      const { data: guests } = await supabaseServer
        .from('tournament_participants')
        .select('player_name')
        .eq('tournament_id', tournament_id)
        .not('player_name', 'is', null);
      if (
        (guests || []).some((g) => g.player_name?.trim().toLowerCase() === playerName.toLowerCase())
      ) {
        return NextResponse.json({ error: 'Ospite già iscritto' }, { status: 409 });
      }
    }

    // Solo i campi dell'iscrizione: il resto della riga (girone, seed,
    // statistiche) è gestito dalle route del torneo, non dal client.
    const { data, error } = await supabaseServer
      .from('tournament_participants')
      .insert([
        playerName ? { player_name: playerName, tournament_id } : { user_id, tournament_id },
      ])
      .select();

    if (error) {
      // unique violation or other
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data && data[0]) {
      await logActivityServer({
        userId: requester.id,
        action: 'tournament.join',
        entityType: 'tournament',
        entityId: tournament_id,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        metadata: {
          participantId: data[0].id,
          registeredBy: requester.id,
          registeredByName: requester.full_name,
          targetUserId: user_id ?? null,
          ...(playerName ? { targetPlayerName: playerName } : {}),
        },
      });
    }

    return NextResponse.json({ participant: data?.[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — rimuove un iscritto: ?id=<participantId> oppure ?user_id=&tournament_id=. */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const user_id = url.searchParams.get('user_id');
    const tournament_id = url.searchParams.get('tournament_id');

    if (!id && !(user_id && tournament_id)) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    const lookup = supabaseServer
      .from('tournament_participants')
      .select('id, user_id, tournament_id');
    const { data: target, error: pErr } = await (id
      ? lookup.eq('id', id)
      : lookup.eq('user_id', user_id).eq('tournament_id', tournament_id)
    ).maybeSingle();
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    if (!target) return NextResponse.json({ error: 'Iscritto non trovato' }, { status: 404 });

    const { requester, response } = await getRequester(req);
    if (response) return response;

    if (target.user_id) {
      const denied = await checkCanManage(
        requester,
        String(target.user_id),
        'Operazione non consentita',
      );
      if (denied) return denied;
    } else {
      // Ospite senza account: nessun interessato, solo admin/gestore
      const role = requester.role.toLowerCase();
      if (role !== 'admin' && role !== 'gestore') {
        return NextResponse.json({ error: 'Operazione non consentita' }, { status: 403 });
      }
    }

    // Competizione avviata: solo admin/gestore, solo nel campionato (un tabellone non può
    // perdere un giocatore) e solo se l'iscritto non ha giocato: le sue partite vengono
    // eliminate a cascata e i risultati sparirebbero dalla classifica degli avversari.
    const { data: tournament } = await supabaseServer
      .from('tournaments')
      .select('tournament_type, current_phase')
      .eq('id', target.tournament_id)
      .single();
    if (tournament && isTournamentStarted(tournament.current_phase)) {
      const role = requester.role.toLowerCase();
      if (role !== 'admin' && role !== 'gestore') {
        return NextResponse.json({ error: 'Competizione già iniziata' }, { status: 403 });
      }
      if (tournament.tournament_type !== 'campionato') {
        return NextResponse.json({ error: 'Competizione già iniziata' }, { status: 409 });
      }

      const blocked = await checkParticipantMatchesUntouched(target.tournament_id, target.id);
      if (blocked) return blocked;
    }

    const { error } = await supabaseServer
      .from('tournament_participants')
      .delete()
      .eq('id', target.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logActivityServer({
      userId: requester.id,
      action: 'tournament.leave',
      entityType: 'tournament',
      entityId: target.tournament_id || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        participantId: target.id,
        removedUserId: target.user_id,
        removedBy: requester.id,
        removedByName: requester.full_name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
