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

type AssignmentRow = {
  video_id: string;
  watched_at: string | null;
  watch_count: number;
};

async function loadAssignmentsForUser(userId: string) {
  const withWatch = await supabaseServer
    .from("video_assignments")
    .select("video_id, watched_at, watch_count")
    .eq("user_id", userId);

  const missingWatchColumns =
    withWatch.error?.message?.toLowerCase().includes("watched_at") ||
    withWatch.error?.message?.toLowerCase().includes("watch_count");

  if (missingWatchColumns) {
    const fallback = await supabaseServer
      .from("video_assignments")
      .select("video_id")
      .eq("user_id", userId);

    if (fallback.error) {
      return { data: null as AssignmentRow[] | null, error: fallback.error };
    }

    const normalized = (fallback.data || []).map((row: { video_id: string }) => ({
      video_id: row.video_id,
      watched_at: null,
      watch_count: 0,
    }));

    return { data: normalized as AssignmentRow[], error: null };
  }

  if (withWatch.error) {
    return { data: null as AssignmentRow[] | null, error: withWatch.error };
  }

  const normalized = (withWatch.data || []).map((row: any) => ({
    video_id: row.video_id,
    watched_at: row.watched_at || null,
    watch_count: typeof row.watch_count === "number" ? row.watch_count : 0,
  }));

  return { data: normalized as AssignmentRow[], error: null };
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
    const id = url.searchParams.get("id");
    const assigned_to = url.searchParams.get("assigned_to");
    const category = url.searchParams.get("category");
    const role = profile?.role || "";
    const isAdminOrGestore = ["admin", "gestore"].includes(role);
    const isMaestro = role === "maestro";

    if (id) {
      const { data: video, error: videoError } = await supabaseServer
        .from("video_lessons")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (videoError || !video) {
        return NextResponse.json({ error: "Video non trovato" }, { status: 404 });
      }

      let assignmentRows: AssignmentRow[] = [];
      if (!isAdminOrGestore) {
        const { data, error } = await loadAssignmentsForUser(user.id);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        assignmentRows = data || [];
      }

      const assignment = assignmentRows.find((row) => row.video_id === id) || null;

      if (!isAdminOrGestore) {
        if (isMaestro) {
          const canAccess = video.created_by === user.id || Boolean(assignment);
          if (!canAccess) {
            return NextResponse.json({ error: "Non hai accesso a questo video" }, { status: 403 });
          }
        } else {
          if (!assignment) {
            return NextResponse.json({ error: "Non hai accesso a questo video" }, { status: 403 });
          }
        }
      }

      return NextResponse.json({
        video: {
          ...video,
          watched_at: assignment?.watched_at || null,
          watch_count: assignment?.watch_count || 0,
        },
      });
    }

    const buildBaseVideosQuery = () => {
      let query = supabaseServer
        .from("video_lessons")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      return query;
    };

    // Admin/Gestore: all active videos
    if (isAdminOrGestore) {
      let query = buildBaseVideosQuery();

      if (assigned_to) {
        const { data: assignmentRows, error: assignmentError } = await supabaseServer
          .from("video_assignments")
          .select("video_id")
          .eq("user_id", assigned_to);

        if (assignmentError) {
          return NextResponse.json({ error: assignmentError.message }, { status: 500 });
        }

        const filteredIds = (assignmentRows || []).map((a) => a.video_id).filter(Boolean);
        if (filteredIds.length === 0) {
          return NextResponse.json({ videos: [] });
        }
        query = query.in("id", filteredIds);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ videos: data || [] });
    }

    // Maestro: own created videos + assigned videos
    if (isMaestro) {
      const [{ data: ownVideos, error: ownVideosError }, { data: assignmentRows, error: assignmentError }] = await Promise.all([
        buildBaseVideosQuery().eq("created_by", user.id),
        loadAssignmentsForUser(user.id),
      ]);

      if (ownVideosError) {
        return NextResponse.json({ error: ownVideosError.message }, { status: 500 });
      }
      if (assignmentError) {
        return NextResponse.json({ error: assignmentError.message }, { status: 500 });
      }

      const assignedIds = (assignmentRows || []).map((a) => a.video_id).filter(Boolean);
      const assignmentByVideoId = new Map((assignmentRows || []).map((a) => [a.video_id, a]));

      let assignedVideos: any[] = [];
      if (assignedIds.length > 0) {
        const { data: assignedData, error: assignedError } = await buildBaseVideosQuery().in("id", assignedIds);
        if (assignedError) {
          return NextResponse.json({ error: assignedError.message }, { status: 500 });
        }
        assignedVideos = assignedData || [];
      }

      const mergedById = new Map<string, any>();
      (ownVideos || []).forEach((video) => mergedById.set(video.id, video));
      assignedVideos.forEach((video) => mergedById.set(video.id, video));

      const mergedVideos = Array.from(mergedById.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((video) => {
          const assignment = assignmentByVideoId.get(video.id);
          return {
            ...video,
            watched_at: assignment?.watched_at || null,
            watch_count: assignment?.watch_count || 0,
          };
        });

      return NextResponse.json({ videos: mergedVideos });
    }

    // Atleta: only assigned videos
    const { data: assignmentRows, error: assignmentError } = await loadAssignmentsForUser(user.id);

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    const assignedIds = (assignmentRows || []).map((a) => a.video_id).filter(Boolean);
    if (assignedIds.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    const { data: assignedVideos, error: assignedError } = await buildBaseVideosQuery().in("id", assignedIds);
    if (assignedError) {
      return NextResponse.json({ error: assignedError.message }, { status: 500 });
    }

    const assignmentByVideoId = new Map((assignmentRows || []).map((a) => [a.video_id, a]));
    const mergedVideos = (assignedVideos || []).map((video) => {
      const assignment = assignmentByVideoId.get(video.id);
      return {
        ...video,
        watched_at: assignment?.watched_at || null,
        watch_count: assignment?.watch_count || 0,
      };
    });

    return NextResponse.json({ videos: mergedVideos });
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
