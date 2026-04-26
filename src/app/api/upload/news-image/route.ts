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

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (oldImageUrl) {
      try {
        const oldPath = oldImageUrl.split("/avatars/").pop();
        if (oldPath) {
          await supabaseServer.storage.from("avatars").remove([oldPath]);
        }
      } catch (deleteError) {
        console.warn("Warning: Could not delete old image:", deleteError);
      }
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `news/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("avatars")
      .upload(fileName, file, {
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseServer.storage.from("avatars").getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? `Server error: ${error.message}` : "Internal server error",
      },
      { status: 500 }
    );
  }
}
