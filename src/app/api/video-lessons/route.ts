import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth } from "@/lib/auth/verifyAuth";

export interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  created_by: string | null;
  assigned_to: string | null;
  category: string;
  level: string;
  is_active: boolean;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  updated_at: string;
}

// GET - Recupera video lezioni
export async function GET(req: Request) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;
    const url = new URL(req.url);
    const assigned_to = url.searchParams.get("assigned_to");
    const category = url.searchParams.get("category");

    let query = supabaseServer
      .from("video_lessons")
      .select(`
        *,
        creator:created_by(full_name, email),
        assignee:assigned_to(full_name, email)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Se non è admin/gestore/maestro, mostra solo i propri video
    const isStaff = ["admin", "gestore", "maestro"].includes(profile?.role || "");
    
    if (!isStaff) {
      query = query.eq("assigned_to", user.id);
    } else if (assigned_to) {
      query = query.eq("assigned_to", assigned_to);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Crea nuovo video
export async function POST(req: Request) {
  try {
    const authResult = await verifyAuth(req, ["admin", "gestore", "maestro"]);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult.data;
    const body = await req.json();

    const { title, description, video_url, thumbnail_url, duration_minutes, assigned_to, category, level } = body;

    if (!title || !video_url || !assigned_to) {
      return NextResponse.json(
        { error: "Titolo, URL video e utente assegnato sono obbligatori" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("video_lessons")
      .insert([
        {
          title,
          description: description || null,
          video_url,
          thumbnail_url: thumbnail_url || null,
          duration_minutes: duration_minutes || null,
          created_by: user.id,
          assigned_to,
          category: category || "generale",
          level: level || "tutti",
          is_active: true,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ video: data?.[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Aggiorna video
export async function PUT(req: Request) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 });
    }

    const body = await req.json();

    // Verifica permessi
    const { data: video } = await supabaseServer
      .from("video_lessons")
      .select("created_by, assigned_to")
      .eq("id", id)
      .single();

    if (!video) {
      return NextResponse.json({ error: "Video non trovato" }, { status: 404 });
    }

    const isStaff = ["admin", "gestore"].includes(profile?.role || "");
    const isCreator = video.created_by === user.id;
    const isAssignee = video.assigned_to === user.id;

    // Se è l'utente assegnato, può solo aggiornare watched_at e watch_count
    if (isAssignee && !isStaff && !isCreator) {
      const { data, error } = await supabaseServer
        .from("video_lessons")
        .update({
          watched_at: body.watched_at || new Date().toISOString(),
          watch_count: body.watch_count,
        })
        .eq("id", id)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ video: data?.[0] });
    }

    // Staff può aggiornare tutto
    if (!isStaff && !isCreator) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from("video_lessons")
      .update(body)
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ video: data?.[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Elimina video
export async function DELETE(req: Request) {
  try {
    const authResult = await verifyAuth(req, ["admin", "gestore"]);
    if (!authResult.success) {
      return authResult.response;
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("video_lessons")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
