import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(req: Request) {
  const authResult = await verifyAuth(req, ["admin", "gestore"]);
  if (!authResult.success) {
    return authResult.response;
  }

  const { data: videos, error: videosError } = await supabaseServer
    .from("video_lessons")
    .select("*")
    .order("created_at", { ascending: false });

  if (videosError) {
    return NextResponse.json({ error: videosError.message }, { status: 500 });
  }

  if (!videos || videos.length === 0) {
    return NextResponse.json({ videos: [] });
  }

  const videoIds = videos.map((video) => video.id);
  const { data: assignments, error: assignmentsError } = await supabaseServer
    .from("video_assignments")
    .select("video_id, user_id")
    .in("video_id", videoIds);

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  }

  const assignedUserIds = [
    ...new Set((assignments || []).map((assignment) => assignment.user_id).filter(Boolean)),
  ];
  const creatorIds = [...new Set(videos.map((video) => video.created_by).filter(Boolean))];
  const allUserIds = [...new Set([...assignedUserIds, ...creatorIds])];

  const { data: profiles, error: profilesError } = allUserIds.length
    ? await supabaseServer
        .from("profiles")
        .select("id, full_name, email")
        .in("id", allUserIds)
    : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  const enrichedVideos = videos.map((video) => ({
    ...video,
    assigned_users: (assignments || [])
      .filter((assignment) => assignment.video_id === video.id)
      .map((assignment) => profileById.get(assignment.user_id))
      .filter(Boolean),
    creator: video.created_by ? profileById.get(video.created_by) || null : null,
  }));

  return NextResponse.json({ videos: enrichedVideos });
}
