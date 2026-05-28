import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

async function fetchExternalImage(imageUrl: string): Promise<{ buffer: ArrayBuffer; contentType: string; ext: string }> {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error("URL non valido");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Solo URL HTTP/HTTPS sono ammessi");
  }
  // Block private/local IP ranges (SSRF protection)
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    throw new Error("URL non consentito");
  }

  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GST-Academy-Bot/1.0)" },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Impossibile scaricare l'immagine (HTTP ${res.status})`);

  const contentType = res.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error("Il link non punta a un'immagine valida");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > 5 * 1024 * 1024) throw new Error("Immagine troppo grande (max 5MB)");

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extMap[contentType] || "jpg";
  return { buffer, contentType, ext };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const externalUrl = formData.get("externalUrl") as string | null;
    const oldImageUrl = formData.get("oldImageUrl") as string | null;

    let fileBuffer: ArrayBuffer;
    let contentType: string;
    let fileExt: string;

    if (externalUrl) {
      // Download external URL server-side and re-upload to Supabase storage
      try {
        const result = await fetchExternalImage(externalUrl);
        fileBuffer = result.buffer;
        contentType = result.contentType;
        fileExt = result.ext;
      } catch (fetchError: unknown) {
        const msg = fetchError instanceof Error ? fetchError.message : "Errore download immagine";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
      }
      fileBuffer = await file.arrayBuffer();
      contentType = file.type || "image/jpeg";
      fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    } else {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    const fileName = `news/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("avatars")
      .upload(fileName, fileBuffer, {
        contentType: contentType,
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
