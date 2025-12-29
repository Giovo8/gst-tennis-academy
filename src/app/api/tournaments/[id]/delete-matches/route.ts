import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

/**
 * API per eliminare tutti i match di un torneo
 * DELETE /api/tournaments/[id]/delete-matches
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

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { profile } = await getUserProfile(req);
    
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json(
        { error: "Non hai i permessi per eliminare i match" },
        { status: 403 }
      );
    }
    
    // Await params if it's a Promise (Next.js 15+)
    const params = context.params instanceof Promise ? await context.params : context.params;
    const tournamentId = params.id;
    
    // Conta i match da eliminare
    const { count } = await supabaseServer
      .from("tournament_matches")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);
    
    if (!count || count === 0) {
      return NextResponse.json(
        { message: "Nessun match da eliminare", deleted: 0 },
        { status: 200 }
      );
    }
    
    // Elimina tutti i match del torneo
    const { error: deleteError } = await supabaseServer
      .from("tournament_matches")
      .delete()
      .eq("tournament_id", tournamentId);
    
    if (deleteError) {
      console.error("Error deleting matches:", deleteError);
      return NextResponse.json(
        { error: "Errore nell'eliminazione dei match: " + deleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: `${count} match eliminati con successo`,
      deleted: count
    });
    
  } catch (error: any) {
    console.error("Error in DELETE /api/tournaments/[id]/delete-matches:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}
