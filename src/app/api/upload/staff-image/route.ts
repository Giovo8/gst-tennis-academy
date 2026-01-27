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
    if (oldImageUrl && oldImageUrl.includes("/avatars/staff/")) {
      const oldPath = oldImageUrl.split("/avatars/").pop();
      if (oldPath) {
        await supabaseServer.storage.from("avatars").remove([oldPath]);
      }
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `staff/${Date.now()}.${fileExt}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file using admin client (bypasses RLS)
    const { error: uploadError } = await supabaseServer.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseServer.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading staff image:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
