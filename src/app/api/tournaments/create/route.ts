import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import {
  getTournamentStructureError,
  type TournamentType,
} from '@/lib/tournaments/tournamentStructure';

/**
 * API per la creazione dei tornei semplificata
 *
 * Supporta 3 tipi di torneo:
 * 1. eliminazione_diretta - Torneo ad eliminazione diretta
 * 2. girone_eliminazione - Fase a gironi + eliminazione
 * 3. campionato - Campionato round-robin (tutti contro tutti)
 */

interface CreateTournamentRequest {
  // Informazioni base
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  category?: string;

  // Tipo di torneo (obbligatorio)
  tournament_type: TournamentType;

  // Numero massimo partecipanti
  max_participants: number;

  // Configurazione gironi (solo per girone_eliminazione)
  num_groups?: number;
  teams_per_group?: number;
  teams_advancing?: number; // quanti avanzano per girone

  // Opzioni aggiuntive
  entry_fee?: number;
  surface_type?: string;
  match_format?: string; // best_of_3, best_of_5
  status?: string;
}

export async function POST(req: Request) {
  try {
    // Verifica autorizzazione
    const auth = await verifyAuth(req, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    const body: CreateTournamentRequest = await req.json();

    // Validazione campi obbligatori
    if (!body.title || !body.tournament_type || !body.max_participants) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti: title, tournament_type, max_participants' },
        { status: 400 },
      );
    }

    // Tipo, numero partecipanti e gironi: stesse regole della modifica (PATCH /api/tournaments/[id])
    const structureError = getTournamentStructureError(body);
    if (structureError) {
      return NextResponse.json({ error: structureError }, { status: 400 });
    }

    // Prepara i dati per l'inserimento
    const tournamentData = {
      title: body.title,
      description: body.description || '',
      start_date: body.start_date || new Date().toISOString(),
      end_date: body.end_date,
      category: body.category || 'Open',
      tournament_type: body.tournament_type,
      max_participants: body.max_participants,
      num_groups: body.num_groups || 0,
      teams_per_group: body.teams_per_group || 0,
      teams_advancing: body.teams_advancing || 0,
      current_phase: 'iscrizioni',
      status: body.status || 'Aperto',
      entry_fee: body.entry_fee,
      surface_type: body.surface_type || 'terra',
      match_format: body.match_format || 'best_of_3',
    };

    // Inserisci il torneo
    const { data: tournament, error: insertError } = await supabaseServer
      .from('tournaments')
      .insert([tournamentData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating tournament:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Se è un torneo con gironi, crea automaticamente i gironi
    if (body.tournament_type === 'girone_eliminazione' && body.num_groups) {
      const { error: groupError } = await supabaseServer.rpc('create_tournament_groups', {
        p_tournament_id: tournament.id,
        p_num_groups: body.num_groups,
      });

      if (groupError) {
        console.error('Error creating groups:', groupError);
        // Non fallire la creazione del torneo, ma logga l'errore
      }
    }

    return NextResponse.json(
      {
        tournament,
        message: 'Torneo creato con successo',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in POST /api/tournaments/create:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 },
    );
  }
}
