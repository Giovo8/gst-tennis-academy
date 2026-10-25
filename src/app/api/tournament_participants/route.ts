import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { logActivityServer } from '@/lib/activity/logActivity';
import { sanitizeObject } from '@/lib/security/sanitize-server';
import { replaceTournamentParticipantSchema } from '@/lib/validation/schemas';
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

/** POST — iscrive `user_id` al torneo, se c'è posto. Body: { user_id, tournament_id }. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, tournament_id } = body ?? {};
    if (!user_id || !tournament_id) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    const { requester, response } = await getRequester(req);
    if (response) return response;

    const denied = await checkCanManage(requester, String(user_id), 'Puoi iscrivere solo atleti');
    if (denied) return denied;

    // Check tournament and capacity
    const { data: tournament, error: tErr } = await supabaseServer
      .from('tournaments')
      .select('max_participants')
      .eq('id', tournament_id)
      .single();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 404 });
    if (!tournament) return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });

    const { count, error: countErr } = await supabaseServer
      .from('tournament_participants')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament_id);
    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

    if ((count ?? 0) >= (tournament.max_participants ?? 0)) {
      return NextResponse.json({ error: 'Torneo al completo' }, { status: 409 });
    }

    // Solo i campi dell'iscrizione: il resto della riga (girone, seed,
    // statistiche) è gestito dalle route del torneo, non dal client.
    const { data, error } = await supabaseServer
      .from('tournament_participants')
      .insert([{ user_id, tournament_id }])
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
          targetUserId: user_id,
        },
      });
    }

    return NextResponse.json({ participant: data?.[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH — admin/gestore: sostituisce l'atleta di un iscritto a un campionato, anche in corso.
 * Body: { id: participantId, user_id: nuovo atleta }. La riga resta la stessa, quindi le
 * partite del calendario passano al nuovo atleta. Consentito solo se l'iscritto non ha
 * ancora giocato partite e nessuna sua partita ha una prenotazione attiva.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await verifyAuth(req, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    const body = await req.json().catch(() => null);
    const parsed = replaceTournamentParticipantSchema.safeParse(sanitizeObject(body ?? {}));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dati non validi' },
        { status: 400 },
      );
    }
    const { id, user_id } = parsed.data;

    const { data: participant, error: pErr } = await supabaseServer
      .from('tournament_participants')
      .select('id, user_id, player_name, tournament_id')
      .eq('id', id)
      .single();
    if (pErr || !participant) {
      return NextResponse.json({ error: 'Iscritto non trovato' }, { status: 404 });
    }

    const { data: tournament } = await supabaseServer
      .from('tournaments')
      .select('tournament_type, status')
      .eq('id', participant.tournament_id)
      .single();
    if (!tournament || tournament.tournament_type !== 'campionato') {
      return NextResponse.json(
        { error: 'Sostituzione possibile solo nei campionati' },
        { status: 400 },
      );
    }
    if (String(tournament.status).toLowerCase() === 'concluso') {
      return NextResponse.json({ error: 'Il campionato è concluso' }, { status: 400 });
    }

    if (participant.user_id === user_id) {
      return NextResponse.json({ error: 'Seleziona un atleta diverso' }, { status: 400 });
    }

    const { data: newProfile } = await supabaseServer
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user_id)
      .single();
    if (!newProfile || String(newProfile.role).toLowerCase() !== 'atleta') {
      return NextResponse.json({ error: 'Atleta non trovato' }, { status: 404 });
    }

    const { count: alreadyEnrolled } = await supabaseServer
      .from('tournament_participants')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', participant.tournament_id)
      .eq('user_id', user_id);
    if ((alreadyEnrolled ?? 0) > 0) {
      return NextResponse.json({ error: 'Atleta già iscritto' }, { status: 409 });
    }

    const { data: matches, error: mErr } = await supabaseServer
      .from('tournament_matches')
      .select(`id, ${MATCH_PLAYED_COLUMNS}`)
      .eq('tournament_id', participant.tournament_id)
      .or(`player1_id.eq.${id},player2_id.eq.${id}`);
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

    if ((matches || []).some((m) => isMatchPlayed(m))) {
      return NextResponse.json({ error: 'Ha già giocato delle partite' }, { status: 409 });
    }

    // Le prenotazioni torneo copiano i giocatori nei partecipanti: vanno annullate prima
    const matchIds = (matches || []).map((m) => m.id);
    if (matchIds.length > 0) {
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
    }

    const { data: updated, error: uErr } = await supabaseServer
      .from('tournament_participants')
      .update({ user_id, player_name: null })
      .eq('id', id)
      .select()
      .single();
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    await logActivityServer({
      userId: auth.data.user.id,
      action: 'tournament.replace_participant',
      entityType: 'tournament',
      entityId: participant.tournament_id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        participantId: id,
        previousUserId: participant.user_id,
        previousPlayerName: participant.player_name,
        newUserId: user_id,
        replacedBy: auth.data.user.id,
        replacedByName: auth.data.profile?.full_name ?? null,
      },
    });

    return NextResponse.json({ participant: updated });
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

    let target: { id?: string; user_id: string | null; tournament_id: string };
    if (id) {
      const { data: part, error: pErr } = await supabaseServer
        .from('tournament_participants')
        .select('id, user_id, tournament_id')
        .eq('id', id)
        .single();
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 404 });
      target = part;
    } else {
      target = { user_id, tournament_id };
    }

    const { requester, response } = await getRequester(req);
    if (response) return response;

    const denied = await checkCanManage(
      requester,
      String(target.user_id),
      'Operazione non consentita',
    );
    if (denied) return denied;

    const deletion = id
      ? supabaseServer.from('tournament_participants').delete().eq('id', id)
      : supabaseServer
          .from('tournament_participants')
          .delete()
          .eq('user_id', user_id)
          .eq('tournament_id', tournament_id);
    const { error } = await deletion;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logActivityServer({
      userId: requester.id,
      action: 'tournament.leave',
      entityType: 'tournament',
      entityId: target.tournament_id || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        ...(target.id ? { participantId: target.id } : {}),
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
