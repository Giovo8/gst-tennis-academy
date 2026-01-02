import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

// GET /api/announcements/[id] - Get single announcement
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer;

    const { data: announcement, error } = await supabase
      .from("announcements")
      .select(`
        *,
        profiles:author_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("id", id)
      .single();

    if (error || !announcement) {
      return NextResponse.json({ error: "Annuncio non trovato" }, { status: 404 });
    }

    // Track view
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Insert view record (upsert to avoid duplicates)
      await supabase
        .from("announcement_views")
        .upsert({
          announcement_id: id,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: "announcement_id,user_id",
        });
    }

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error("Error in GET /api/announcements/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// PUT /api/announcements/[id] - Update announcement (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is admin/gestore
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "gestore"].includes(profile.role)) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      content,
      announcement_type,
      priority,
      expiry_date,
      visibility,
      is_published,
      is_pinned,
      image_url,
      link_url,
      link_text,
    } = body;

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (announcement_type !== undefined) updateData.announcement_type = announcement_type;
    if (priority !== undefined) updateData.priority = priority;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date ? new Date(expiry_date).toISOString() : null;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (is_published !== undefined) updateData.is_published = is_published;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (link_url !== undefined) updateData.link_url = link_url;
    if (link_text !== undefined) updateData.link_text = link_text;

    // Update announcement
    const { data: announcement, error: updateError } = await supabase
      .from("announcements")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating announcement:", updateError);
      return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
    }

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error("Error in PUT /api/announcements/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// DELETE /api/announcements/[id] - Delete announcement (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is admin/gestore
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "gestore"].includes(profile.role)) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    // Delete announcement
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting announcement:", deleteError);
      return NextResponse.json({ error: "Errore nell'eliminazione" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/announcements/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// PATCH /api/announcements/[id] - Mark announcement as viewed or update (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();

    // If it's just marking as viewed (no body or empty body)
    if (!body || Object.keys(body).length === 0) {
      // Insert view record (upsert to avoid duplicates)
      const { error: viewError } = await supabase
        .from("announcement_views")
        .upsert({
          announcement_id: id,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: "announcement_id,user_id",
        });

      if (viewError) {
        console.error("Error marking as viewed:", viewError);
        return NextResponse.json({ error: "Errore nel tracking visualizzazione" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Annuncio marcato come letto" });
    }

    // Otherwise, it's an admin update - check permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "gestore"].includes(profile.role)) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    // Update announcement
    const { data: announcement, error: updateError } = await supabase
      .from("announcements")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating announcement:", updateError);
      return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
    }

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error("Error in PATCH /api/announcements/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
