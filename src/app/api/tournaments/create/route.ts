import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

/**
 * API per la creazione dei tornei semplificata
 * 
 * Supporta 3 tipi di torneo:
 * 1. eliminazione_diretta - Torneo ad eliminazione diretta
 * 2. girone_eliminazione - Fase a gironi + eliminazione
 * 3. campionato - Campionato round-robin (tutti contro tutti)
 */

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

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

async function getUserProfile(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return { user: null, profile: null };
    }
    
    const { data: userData, error } = await supabaseServer.auth.getUser(token);
    
    if (error || !userData?.user) {
      return { user: null, profile: null };
    }
    
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userData.user.id)
      .single();
    
    return { user: userData.user, profile };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return { user: null, profile: null };
  }
}

export async function POST(req: Request) {
  try {
    // Verifica autorizzazione
    const { profile } = await getUserProfile(req);
    
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json(
        { error: "Non hai i permessi per creare tornei" },
        { status: 403 }
      );
    }
    
    const body: CreateTournamentRequest = await req.json();
    
    // Validazione campi obbligatori
    if (!body.title || !body.tournament_type || !body.max_participants) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti: title, tournament_type, max_participants" },
        { status: 400 }
      );
    }
    
    // Validazione tournament_type
    const validTypes: TournamentType[] = ['eliminazione_diretta', 'girone_eliminazione', 'campionato'];
    if (!validTypes.includes(body.tournament_type)) {
      return NextResponse.json(
        { error: `tournament_type deve essere uno di: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validazione specifica per ogni tipo
    if (body.tournament_type === 'eliminazione_diretta') {
      const validSizes = [2, 4, 8, 16, 32, 64, 128];
      if (!validSizes.includes(body.max_participants)) {
        return NextResponse.json(
          { error: `Per eliminazione diretta, max_participants deve essere: ${validSizes.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    if (body.tournament_type === 'girone_eliminazione') {
      if (!body.num_groups || body.num_groups < 2) {
        return NextResponse.json(
          { error: "Per girone_eliminazione, num_groups deve essere almeno 2" },
          { status: 400 }
        );
      }
      
      if (!body.teams_per_group || body.teams_per_group < 3) {
        return NextResponse.json(
          { error: "Per girone_eliminazione, teams_per_group deve essere almeno 3" },
          { status: 400 }
        );
      }
      
      if (!body.teams_advancing || body.teams_advancing < 1 || body.teams_advancing >= body.teams_per_group) {
        return NextResponse.json(
          { error: "teams_advancing deve essere tra 1 e teams_per_group-1" },
          { status: 400 }
        );
      }
      
      // Verifica che max_participants sia coerente
      const expectedMax = body.num_groups * body.teams_per_group;
      if (body.max_participants !== expectedMax) {
        return NextResponse.json(
          { error: `Per ${body.num_groups} gironi con ${body.teams_per_group} squadre, max_participants deve essere ${expectedMax}` },
          { status: 400 }
        );
      }
    }
    
    if (body.tournament_type === 'campionato') {
      if (body.max_participants < 3) {
        return NextResponse.json(
          { error: "Per un campionato, max_participants deve essere almeno 3" },
          { status: 400 }
        );
      }
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
      .from("tournaments")
      .insert([tournamentData])
      .select()
      .single();
    
    if (insertError) {
      console.error("Error creating tournament:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }
    
    // Se è un torneo con gironi, crea automaticamente i gironi
    if (body.tournament_type === 'girone_eliminazione' && body.num_groups) {
      const { error: groupError } = await supabaseServer.rpc(
        'create_tournament_groups',
        {
          p_tournament_id: tournament.id,
          p_num_groups: body.num_groups
        }
      );
      
      if (groupError) {
        console.error("Error creating groups:", groupError);
        // Non fallire la creazione del torneo, ma logga l'errore
      }
    }
    
    return NextResponse.json(
      { 
        tournament,
        message: "Torneo creato con successo" 
      },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error("Error in POST /api/tournaments/create:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}
