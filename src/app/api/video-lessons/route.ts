import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';

type AssignmentRow = {
  video_id: string;
  watched_at: string | null;
  watch_count: number;
};

/** Riga di video_lessons: qui servono solo id e data di creazione (per l'ordinamento). */
type VideoRow = { id: string; created_at: string; [column: string]: unknown };

async function loadAssignmentsForUser(userId: string) {
  const withWatch = await supabaseServer
    .from('video_assignments')
    .select('video_id, watched_at, watch_count')
    .eq('user_id', userId);

  const missingWatchColumns =
    withWatch.error?.message?.toLowerCase().includes('watched_at') ||
    withWatch.error?.message?.toLowerCase().includes('watch_count');

  if (missingWatchColumns) {
    const fallback = await supabaseServer
      .from('video_assignments')
      .select('video_id')
      .eq('user_id', userId);

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

  const normalized = (withWatch.data || []).map((row) => ({
    video_id: row.video_id,
    watched_at: row.watched_at || null,
    watch_count: typeof row.watch_count === 'number' ? row.watch_count : 0,
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
    const id = url.searchParams.get('id');
    const assigned_to = url.searchParams.get('assigned_to');
    const category = url.searchParams.get('category');
    const role = profile?.role || '';
    const isAdminOrGestore = ['admin', 'gestore'].includes(role);
    const isMaestro = role === 'maestro';

    if (id) {
      const { data: video, error: videoError } = await supabaseServer
        .from('video_lessons')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (videoError || !video) {
        return NextResponse.json({ error: 'Video non trovato' }, { status: 404 });
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
            return NextResponse.json({ error: 'Non hai accesso a questo video' }, { status: 403 });
          }
        } else {
          if (!assignment) {
            return NextResponse.json({ error: 'Non hai accesso a questo video' }, { status: 403 });
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
        .from('video_lessons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      return query;
    };

    // Admin/Gestore: all active videos
    if (isAdminOrGestore) {
      let query = buildBaseVideosQuery();

      if (assigned_to) {
        const { data: assignmentRows, error: assignmentError } = await supabaseServer
          .from('video_assignments')
          .select('video_id')
          .eq('user_id', assigned_to);

        if (assignmentError) {
          return NextResponse.json({ error: assignmentError.message }, { status: 500 });
        }

        const filteredIds = (assignmentRows || []).map((a) => a.video_id).filter(Boolean);
        if (filteredIds.length === 0) {
          return NextResponse.json({ videos: [] });
        }
        query = query.in('id', filteredIds);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ videos: data || [] });
    }

    // Maestro: own created videos + assigned videos
    if (isMaestro) {
      const [
        { data: ownVideos, error: ownVideosError },
        { data: assignmentRows, error: assignmentError },
      ] = await Promise.all([
        buildBaseVideosQuery().eq('created_by', user.id),
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

      let assignedVideos: VideoRow[] = [];
      if (assignedIds.length > 0) {
        const { data: assignedData, error: assignedError } = await buildBaseVideosQuery().in(
          'id',
          assignedIds,
        );
        if (assignedError) {
          return NextResponse.json({ error: assignedError.message }, { status: 500 });
        }
        assignedVideos = assignedData || [];
      }

      const mergedById = new Map<string, VideoRow>();
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

    const { data: assignedVideos, error: assignedError } = await buildBaseVideosQuery().in(
      'id',
      assignedIds,
    );
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
    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
