import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

/**
 * GET /api/tournaments/[id]/group-matches — pubblico: partite del torneo con i
 * giocatori (nome e avatar). Filtri: ?group_id= (partite di un girone),
 * ?phase=gironi|eliminazione. I gironi si generano con generate-groups.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const params = context.params instanceof Promise ? await context.params : context.params;
    const tournamentId = params.id;

    const url = new URL(req.url);
    const groupId = url.searchParams.get('group_id');
    const phase = url.searchParams.get('phase'); // 'gironi' o 'eliminazione'

    let query = supabaseServer
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (groupId) {
      // Trova il nome del girone dall'ID
      const { data: group } = await supabaseServer
        .from('tournament_groups')
        .select('group_name')
        .eq('id', groupId)
        .single();

      if (group) {
        // Filtra per round_name che corrisponde al group_name
        query = query.eq('round_name', group.group_name);
      }
    }

    if (phase) {
      // Per la fase gironi, verifica che il round_number sia 0 (fase gironi)
      if (phase === 'gironi') {
        query = query.eq('round_number', 0);
      } else {
        query = query.neq('round_number', 0);
      }
    }

    query = query
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });

    const { data: matches, error } = await query;

    if (error) {
      console.error('Error fetching matches:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    // Carica i partecipanti del torneo
    const { data: participants } = await supabaseServer
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', tournamentId);

    // Carica i profili degli utenti
    const userIds = new Set<string>();
    (participants || []).forEach((p) => {
      if (p.user_id) userIds.add(p.user_id);
    });

    let profilesMap = new Map();
    if (userIds.size > 0) {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
    }

    // Crea mappa partecipanti per ID
    const participantsMap = new Map();
    (participants || []).forEach((p) => {
      const enrichedParticipant = {
        ...p,
        profiles: profilesMap.get(p.user_id),
      };
      participantsMap.set(p.id, enrichedParticipant);
    });

    // Arricchisci i match con i dati dei partecipanti
    const enrichedMatches = (matches || []).map((match) => ({
      ...match,
      player1: participantsMap.get(match.player1_id),
      player2: participantsMap.get(match.player2_id),
    }));

    return NextResponse.json({ matches: enrichedMatches });
  } catch (error) {
    console.error('Error in GET matches:', error);
    return NextResponse.json({ error: error.message || 'Errore interno' }, { status: 500 });
  }
}
