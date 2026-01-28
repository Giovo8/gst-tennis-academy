import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const oldImageUrl = formData.get("oldImageUrl") as string | null;

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
    if (oldImageUrl) {
      try {
        const oldPath = oldImageUrl.split("/avatars/").pop();
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
    const fileName = `staff/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Upload file directly (Supabase handles the conversion)
    // For mobile compatibility, upload File object directly instead of converting to Buffer
    const { error: uploadError, data: uploadData } = await supabaseServer.storage
      .from("avatars")
      .upload(fileName, file, {
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error details:", {
        message: uploadError.message,
        status: uploadError.statusCode,
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
