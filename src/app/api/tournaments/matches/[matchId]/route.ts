import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

/**
 * API per aggiornare il risultato di una partita
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

export async function PUT(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { profile } = await getUserProfile(req);
    
    // Permetti a gestore, admin e maestro di aggiornare
    if (!profile || !["gestore", "admin", "maestro"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json(
        { error: "Non hai i permessi" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { player1_score, player2_score, score_details, winner_id, status } = body;
    
    // Carica la partita corrente
    const { data: match, error: matchError } = await supabaseServer
      .from("tournament_matches")
      .select("*")
      .eq("id", params.matchId)
      .single();
    
    if (matchError || !match) {
      return NextResponse.json(
        { error: "Partita non trovata" },
        { status: 404 }
      );
    }
    
    // Prepara update
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (typeof player1_score !== 'undefined') updateData.player1_score = player1_score;
    if (typeof player2_score !== 'undefined') updateData.player2_score = player2_score;
    if (score_details) updateData.score_details = score_details;
    if (winner_id) updateData.winner_id = winner_id;
    if (status) {
      updateData.status = status;
      
      if (status === 'in_corso' && !match.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      
      if (status === 'completata' && !match.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
    }
    
    // Aggiorna la partita
    const { data: updatedMatch, error: updateError } = await supabaseServer
      .from("tournament_matches")
      .update(updateData)
      .eq("id", params.matchId)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating match:", updateError);
      return NextResponse.json(
        { error: "Errore nell'aggiornamento: " + updateError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: "Partita aggiornata con successo",
      match: updatedMatch
    });
    
  } catch (error: any) {
    console.error("Error in PUT match:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { data: match, error } = await supabaseServer
      .from("tournament_matches")
      .select(`
        *,
        player1:tournament_participants!tournament_matches_player1_id_fkey(
          id,
          user_id,
          seed,
          stats
        ),
        player2:tournament_participants!tournament_matches_player2_id_fkey(
          id,
          user_id,
          seed,
          stats
        ),
        winner:tournament_participants!tournament_matches_winner_id_fkey(
          id,
          user_id
        )
      `)
      .eq("id", params.matchId)
      .single();
    
    if (error || !match) {
      return NextResponse.json(
        { error: "Partita non trovata" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ match });
    
  } catch (error: any) {
    console.error("Error in GET match:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}
