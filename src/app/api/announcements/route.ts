import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

// GET /api/announcements - Get all announcements with filters
export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer;
    const { searchParams } = new URL(req.url);
    
    const type = searchParams.get("type");
    const visibility = searchParams.get("visibility");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "50");
    const includeExpired = searchParams.get("include_expired") === "true";

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Build query
    let query = supabase
      .from("announcements")
      .select(`
        id,
        title,
        content,
        announcement_type,
        priority,
        expiry_date,
        visibility,
        is_published,
        is_pinned,
        view_count,
        image_url,
        link_url,
        link_text,
        created_at,
        updated_at,
        profiles:author_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("is_published", true);

    // Apply filters
    if (type) {
      query = query.eq("announcement_type", type);
    }
    if (visibility) {
      query = query.eq("visibility", visibility);
    }
    if (priority) {
      query = query.eq("priority", priority);
    }
    
    // Filter expired unless explicitly included
    if (!includeExpired) {
      query = query.or("expiry_date.is.null,expiry_date.gt." + new Date().toISOString());
    }

    // Order by pinned, priority, date
    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: announcements, error } = await query;

    if (error) {
      console.error("Error fetching announcements:", error);
      return NextResponse.json({ error: "Errore nel recupero degli annunci" }, { status: 500 });
    }

    // Add view status for authenticated users
    const announcementsWithViews = await Promise.all(
      (announcements || []).map(async (announcement: any) => {
        if (user) {
          const { data: view } = await supabase
            .from("announcement_views")
            .select("id")
            .eq("announcement_id", announcement.id)
            .eq("user_id", user.id)
            .single();

          return {
            ...announcement,
            has_viewed: !!view,
            days_until_expiry: announcement.expiry_date
              ? Math.ceil((new Date(announcement.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null,
          };
        }
        return {
          ...announcement,
          has_viewed: false,
          days_until_expiry: announcement.expiry_date
            ? Math.ceil((new Date(announcement.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null,
        };
      })
    );

    return NextResponse.json({ announcements: announcementsWithViews });
  } catch (error: any) {
    console.error("Error in GET /api/announcements:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// POST /api/announcements - Create new announcement (admin only)
export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is admin/gestore
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "gestore"].includes(profile.user_role)) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      content,
      announcement_type = "announcement",
      priority = "medium",
      expiry_date,
      visibility = "all",
      is_published = true,
      is_pinned = false,
      image_url,
      link_url,
      link_text,
    } = body;

    // Validate
    if (!title || !content) {
      return NextResponse.json({ error: "title e content sono richiesti" }, { status: 400 });
    }

    // Insert announcement
    const { data: announcement, error: insertError } = await supabase
      .from("announcements")
      .insert({
        title,
        content,
        announcement_type,
        author_id: user.id,
        priority,
        expiry_date: expiry_date ? new Date(expiry_date).toISOString() : null,
        visibility,
        is_published,
        is_pinned,
        image_url,
        link_url,
        link_text,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating announcement:", insertError);
      return NextResponse.json({ error: "Errore nella creazione dell'annuncio" }, { status: 500 });
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/announcements:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
