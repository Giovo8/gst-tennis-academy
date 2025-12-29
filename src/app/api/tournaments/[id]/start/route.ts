import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

/**
 * API per avviare un torneo
 * 
 * Questo endpoint gestisce l'avvio del torneo in base al tipo:
 * - eliminazione_diretta: crea il bracket
 * - girone_eliminazione: assegna i partecipanti ai gironi
 * - campionato: inizializza la classifica
 */

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
    return { user: null, profile: null };
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { profile } = await getUserProfile(req);
    
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json(
        { error: "Non hai i permessi per avviare tornei" },
        { status: 403 }
      );
    }
    
    // Await params if it's a Promise (Next.js 15+)
    const params = context.params instanceof Promise ? await context.params : context.params;
    const tournamentId = params.id;
    
    // Carica il torneo
    const { data: tournament, error: tournamentError } = await supabaseServer
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();
    
    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: "Torneo non trovato" },
        { status: 404 }
      );
    }
    
    // Verifica che il torneo sia in fase iscrizioni
    if (tournament.current_phase !== 'iscrizioni') {
      return NextResponse.json(
        { error: `Il torneo è già in fase: ${tournament.current_phase}` },
        { status: 400 }
      );
    }
    
    // Conta i partecipanti
    const { count: participantsCount, error: countError } = await supabaseServer
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);
    
    if (countError) {
      return NextResponse.json(
        { error: "Errore nel conteggio partecipanti" },
        { status: 500 }
      );
    }
    
    // Verifica numero minimo partecipanti
    const minParticipants = tournament.tournament_type === 'eliminazione_diretta' ? 2 : 3;
    if (!participantsCount || participantsCount < minParticipants) {
      return NextResponse.json(
        { error: `Numero minimo di partecipanti non raggiunto (minimo: ${minParticipants}, attuali: ${participantsCount})` },
        { status: 400 }
      );
    }
    
    // Gestione in base al tipo di torneo
    if (tournament.tournament_type === 'eliminazione_diretta') {
      // Assegna seed ai partecipanti se non li hanno già
      const { data: participants } = await supabaseServer
        .from("tournament_participants")
        .select("id, seed")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true });
      
      if (participants) {
        // Assegna seed solo a chi non ce l'ha già
        let seedCounter = 1;
        for (const participant of participants) {
          if (!participant.seed) {
            await supabaseServer
              .from("tournament_participants")
              .update({ seed: seedCounter })
              .eq("id", participant.id);
            seedCounter++;
          }
        }
      }
      
      // Aggiorna fase a eliminazione
      const { error: updateError } = await supabaseServer
        .from("tournaments")
        .update({ 
          current_phase: 'eliminazione',
          status: 'In Corso'
        })
        .eq("id", tournamentId);
      
      if (updateError) {
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del torneo" },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: "Torneo avviato! Ora puoi generare il bracket.",
        tournament_type: 'eliminazione_diretta',
        next_step: 'generate_bracket'
      });
    }
    
    if (tournament.tournament_type === 'girone_eliminazione') {
      // Verifica che num_groups sia configurato
      const numGroups = tournament.num_groups || 2;
      
      // PASSO 1: Crea i gironi
      const { error: createGroupsError } = await supabaseServer.rpc(
        'create_tournament_groups',
        { 
          p_tournament_id: tournamentId,
          p_num_groups: numGroups
        }
      );
      
      if (createGroupsError) {
        console.error("Error creating groups:", createGroupsError);
        return NextResponse.json(
          { error: "Errore nella creazione dei gironi: " + createGroupsError.message },
          { status: 500 }
        );
      }
      
      // PASSO 2: Assegna partecipanti ai gironi
      const { error: assignError } = await supabaseServer.rpc(
        'assign_participants_to_groups',
        { p_tournament_id: tournamentId }
      );
      
      if (assignError) {
        console.error("Error assigning participants to groups:", assignError);
        return NextResponse.json(
          { error: "Errore nell'assegnazione ai gironi: " + assignError.message },
          { status: 500 }
        );
      }
      
      // PASSO 3: Aggiorna fase a gironi
      const { error: updateError } = await supabaseServer
        .from("tournaments")
        .update({ 
          current_phase: 'gironi',
          status: 'In Corso'
        })
        .eq("id", tournamentId);
      
      if (updateError) {
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del torneo" },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: "Fase a gironi avviata! I partecipanti sono stati assegnati ai gironi.",
        tournament_type: 'girone_eliminazione',
        next_step: 'schedule_group_matches'
      });
    }
    
    if (tournament.tournament_type === 'campionato') {
      // Aggiorna fase (per campionato non c'è una fase specifica, rimane 'iscrizioni' ma status diventa 'In Corso')
      const { error: updateError } = await supabaseServer
        .from("tournaments")
        .update({ 
          status: 'In Corso'
        })
        .eq("id", tournamentId);
      
      if (updateError) {
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del torneo" },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: "Campionato avviato! Ora puoi programmare le giornate.",
        tournament_type: 'campionato',
        next_step: 'schedule_round_robin_matches'
      });
    }
    
    return NextResponse.json(
      { error: "Tipo di torneo non supportato" },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error("Error in POST /api/tournaments/[id]/start:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}
