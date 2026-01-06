import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

/**
 * API per generare il bracket di un torneo ad eliminazione diretta
 * 
 * POST /api/tournaments/[id]/generate-bracket
 * Genera automaticamente tutti i match del torneo in base ai partecipanti
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
        { error: "Non hai i permessi per generare bracket" },
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
    
    // Verifica che sia un torneo ad eliminazione diretta
    if (tournament.tournament_type !== 'eliminazione_diretta') {
      return NextResponse.json(
        { error: "Questo endpoint è solo per tornei ad eliminazione diretta" },
        { status: 400 }
      );
    }
    
    // Verifica che il torneo sia in fase eliminazione
    if (tournament.current_phase !== 'eliminazione') {
      return NextResponse.json(
        { error: `Il torneo deve essere in fase eliminazione. Fase attuale: ${tournament.current_phase}` },
        { status: 400 }
      );
    }
    
    // Carica i partecipanti
    const { data: participants, error: participantsError } = await supabaseServer
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true });
    
    if (participantsError) {
      return NextResponse.json(
        { error: "Errore nel caricamento dei partecipanti" },
        { status: 500 }
      );
    }
    
    if (!participants || participants.length < 2) {
      return NextResponse.json(
        { error: "Numero insufficiente di partecipanti (minimo: 2)" },
        { status: 400 }
      );
    }
    
    // Verifica che non esistano già match
    const { count: existingMatches } = await supabaseServer
      .from("tournament_matches")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);
    
    if (existingMatches && existingMatches > 0) {
      return NextResponse.json(
        { 
          error: "Il bracket è già stato generato. Elimina i match esistenti prima di rigenerarlo.",
          existing_matches: existingMatches
        },
        { status: 400 }
      );
    }
    
    // Genera il bracket
    const matches = generateEliminationBracket(participants, tournamentId);
    
    // Inserisci i match nel database
    const { data: insertedMatches, error: insertError } = await supabaseServer
      .from("tournament_matches")
      .insert(matches)
      .select();
    
    if (insertError) {
      console.error("Error inserting matches:", insertError);
      return NextResponse.json(
        { error: "Errore nella creazione dei match: " + insertError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: "Bracket generato con successo!",
      matches_created: insertedMatches?.length || 0,
      rounds: Math.ceil(Math.log2(participants.length))
    });
    
  } catch (error: any) {
    console.error("Error in POST /api/tournaments/[id]/generate-bracket:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}

/**
 * Genera il bracket completo per un torneo ad eliminazione diretta
 * 
 * @param participants Array dei partecipanti ordinati per seed
 * @param tournamentId ID del torneo
 * @returns Array di match da inserire nel database
 */
function generateEliminationBracket(participants: any[], tournamentId: string) {
  const numParticipants = participants.length;
  
  // Calcola la potenza di 2 più vicina (arrotondata per eccesso)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numParticipants)));
  
  // Nomi dei turni in base al numero di partecipanti
  const getRoundName = (roundNum: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - roundNum + 1;
    
    if (roundsFromEnd === 1) return "Finale";
    if (roundsFromEnd === 2) return "Semifinali";
    if (roundsFromEnd === 3) return "Quarti di Finale";
    if (roundsFromEnd === 4) return "Ottavi di Finale";
    if (roundsFromEnd === 5) return "Sedicesimi di Finale";
    if (roundsFromEnd === 6) return "Trentaduesimi di Finale";
    
    return `Round ${roundNum}`;
  };
  
  const totalRounds = Math.log2(bracketSize);
  const matches: any[] = [];
  
  // Genera il primo turno con i partecipanti reali
  const firstRoundMatches = bracketSize / 2;
  let matchNumber = 1;
  
  // Seeding classico: 1 vs bracketSize, 2 vs bracketSize-1, etc.
  const seedPairs: Array<[number, number]> = [];
  for (let i = 1; i <= bracketSize / 2; i++) {
    seedPairs.push([i, bracketSize - i + 1]);
  }
  
  // Genera i match del primo turno
  for (let i = 0; i < firstRoundMatches; i++) {
    const [seed1, seed2] = seedPairs[i];
    
    // Trova i partecipanti corrispondenti (seed parte da 1)
    const player1 = participants.find(p => (p.seed || 0) === seed1);
    const player2 = participants.find(p => (p.seed || 0) === seed2);
    
    // Se non esiste un partecipante per quel seed, il match è BYE
    const match = {
      tournament_id: tournamentId,
      round_number: 1,
      round_name: getRoundName(1, totalRounds),
      match_number: matchNumber,
      player1_id: player1?.id || null,
      player2_id: player2?.id || null,
      match_status: 'scheduled',
      phase: 'eliminazione',
      stage: 'eliminazione',
      bracket_position: matchNumber,
      player1_score: 0,
      player2_score: 0,
      score_details: null,
      winner_id: null,
      scheduled_at: null,
      status: 'programmata',
      created_at: new Date().toISOString()
    };
    
    // Se uno dei due giocatori manca, è un BYE automatico
    if (!player1 && player2) {
      match.winner_id = player2.id;
      match.match_status = 'completed';
      match.status = 'completata';
      match.player2_score = 1;
    } else if (player1 && !player2) {
      match.winner_id = player1.id;
      match.match_status = 'completed';
      match.status = 'completata';
      match.player1_score = 1;
    }
    
    matches.push(match);
    matchNumber++;
  }
  
  // Genera i turni successivi (vuoti, verranno popolati man mano che i match vengono completati)
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        round_number: round,
        round_name: getRoundName(round, totalRounds),
        match_number: matchNumber,
        player1_id: null,
        player2_id: null,
        match_status: 'pending', // In attesa dei vincitori dei match precedenti
        phase: 'eliminazione',
        stage: 'eliminazione',
        bracket_position: matchNumber,
        player1_score: 0,
        player2_score: 0,
        score_details: null,
        winner_id: null,
        scheduled_at: null,
        status: 'programmata',
        created_at: new Date().toISOString()
      });
      matchNumber++;
    }
  }
  
  return matches;
}
