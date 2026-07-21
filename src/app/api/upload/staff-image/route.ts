import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, unauthorized, forbidden, isAdmin } from "@/lib/auth/routeAuth";
import { optimizeImage } from "@/lib/images/optimize";

export async function POST(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const oldImageUrl = formData.get("oldImageUrl") as string | null;
    const deleteOnly = formData.get("deleteOnly") === "true";
    const targetUserId = formData.get("targetUserId") as string | null;

    const isAdminUser = isAdmin(auth.role);
    const effectiveTargetUserId = targetUserId || auth.user.id;

    if (!isAdminUser && effectiveTargetUserId !== auth.user.id) {
      return forbidden();
    }

    let currentProfileAvatarUrl: string | null = null;
    if (!isAdminUser) {
      const { data: profile, error: profileError } = await supabaseServer
        .from("profiles")
        .select("avatar_url")
        .eq("id", auth.user.id)
        .single();

      if (profileError) {
        return NextResponse.json(
          { error: "Impossibile verificare l'avatar corrente" },
          { status: 500 }
        );
      }

      currentProfileAvatarUrl = profile?.avatar_url ?? null;
    }

    const removableOldImageUrl = isAdminUser ? oldImageUrl : currentProfileAvatarUrl;

    if (deleteOnly) {
      if (removableOldImageUrl) {
        try {
          const oldPath = removableOldImageUrl.split("/avatars/").pop();
          if (oldPath) {
            await supabaseServer.storage.from("avatars").remove([oldPath]);
          }
        } catch (deleteError) {
          console.warn("Warning: Could not delete old image:", deleteError);
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Remove old image if exists
    if (removableOldImageUrl) {
      try {
        const oldPath = removableOldImageUrl.split("/avatars/").pop();
        if (oldPath) {
          await supabaseServer.storage.from("avatars").remove([oldPath]);
        }
      } catch (deleteError) {
        // Log but don't fail if old image deletion fails
        console.warn("Warning: Could not delete old image:", deleteError);
      }
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";

    // Le foto profilo/staff sono mostrate al massimo a ~200px: 800px basta e avanza
    const optimized = await optimizeImage(
      await file.arrayBuffer(),
      file.type || "image/jpeg",
      fileExt,
      { maxWidth: 800 }
    );

    const fileName = `staff/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${optimized.ext}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("avatars")
      .upload(fileName, optimized.buffer, {
        contentType: optimized.contentType,
        // Nome file immutabile (timestamp+random, upsert:false) → cache 1 anno
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error details:", {
        message: uploadError.message,
        name: uploadError.name,
        fileName,
        fileSize: file.size,
        fileType: file.type,
      });
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseServer.storage
      .from("avatars")
      .getPublicUrl(fileName);

    console.log("File uploaded successfully:", { fileName, fileSize: file.size });
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading staff image:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? `Server error: ${error.message}` 
          : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
