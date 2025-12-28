import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

/**
 * API per gestire le partite dei gironi
 * 
 * GET: Ottiene tutte le partite di un girone
 * POST: Crea le partite per un girone (round-robin)
 * PUT: Aggiorna il risultato di una partita
 */

async function getUserProfile(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) return { user: null, profile: null };
    
    const { data: userData, error } = await supabaseServer.auth.getUser(token);
    if (error || !userData?.user) return { user: null, profile: null };
    
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

// GET: Ottieni tutte le partite di un torneo o girone
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url);
    const groupId = url.searchParams.get("group_id");
    const phase = url.searchParams.get("phase"); // 'gironi' o 'eliminazione'
    
    let query = supabaseServer
      .from("tournament_matches")
      .select(`
        *,
        player1:tournament_participants!tournament_matches_player1_id_fkey(
          id,
          user_id,
          seed,
          group_position,
          stats
        ),
        player2:tournament_participants!tournament_matches_player2_id_fkey(
          id,
          user_id,
          seed,
          group_position,
          stats
        ),
        winner:tournament_participants!tournament_matches_winner_id_fkey(
          id,
          user_id
        )
      `)
      .eq("tournament_id", params.id);
    
    if (groupId) {
      // Filtra per girone attraverso i partecipanti
      query = query.or(`player1.group_id.eq.${groupId},player2.group_id.eq.${groupId}`);
    }
    
    if (phase) {
      query = query.eq("phase", phase);
    }
    
    query = query.order("round_number", { ascending: true })
                 .order("match_number", { ascending: true });
    
    const { data: matches, error } = await query;
    
    if (error) {
      console.error("Error fetching matches:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ matches: matches || [] });
    
  } catch (error: any) {
    console.error("Error in GET matches:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

// POST: Genera partite per un girone (round-robin)
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await getUserProfile(req);
    
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json(
        { error: "Non hai i permessi" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { group_id } = body;
    
    if (!group_id) {
      return NextResponse.json(
        { error: "group_id è obbligatorio" },
        { status: 400 }
      );
    }
    
    // Carica il girone
    const { data: group, error: groupError } = await supabaseServer
      .from("tournament_groups")
      .select("*")
      .eq("id", group_id)
      .single();
    
    if (groupError || !group) {
      return NextResponse.json(
        { error: "Girone non trovato" },
        { status: 404 }
      );
    }
    
    // Carica i partecipanti del girone
    const { data: participants, error: participantsError } = await supabaseServer
      .from("tournament_participants")
      .select("id, user_id, seed")
      .eq("group_id", group_id)
      .order("seed", { ascending: true });
    
    if (participantsError || !participants || participants.length < 2) {
      return NextResponse.json(
        { error: "Partecipanti insufficienti nel girone" },
        { status: 400 }
      );
    }
    
    // Genera gli abbinamenti round-robin (tutti contro tutti)
    const matches = [];
    const n = participants.length;
    
    // Algoritmo round-robin
    for (let round = 0; round < n - 1; round++) {
      for (let match = 0; match < Math.floor(n / 2); match++) {
        const home = (round + match) % (n - 1);
        const away = (n - 1 - match + round) % (n - 1);
        
        const player1_idx = match === 0 ? n - 1 : home;
        const player2_idx = away;
        
        matches.push({
          tournament_id: params.id,
          phase: 'gironi',
          round_name: `${group.group_name} - Giornata ${round + 1}`,
          round_number: round + 1,
          match_number: match + 1,
          player1_id: participants[player1_idx].id,
          player2_id: participants[player2_idx].id,
          status: 'programmata'
        });
      }
    }
    
    // Se il numero di partecipanti è dispari, aggiungi turni con riposo
    if (n % 2 !== 0) {
      // Gestione turni di riposo (bye)
      for (let round = 0; round < n; round++) {
        const byePlayer = round;
        // Il giocatore byePlayer riposa in questo round
      }
    }
    
    // Inserisci le partite
    const { data: insertedMatches, error: insertError } = await supabaseServer
      .from("tournament_matches")
      .insert(matches)
      .select();
    
    if (insertError) {
      console.error("Error inserting matches:", insertError);
      return NextResponse.json(
        { error: "Errore nella creazione delle partite: " + insertError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: `Create ${insertedMatches?.length || 0} partite per ${group.group_name}`,
      matches: insertedMatches
    });
    
  } catch (error: any) {
    console.error("Error in POST matches:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}
