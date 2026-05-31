import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

/** Tipi MIME consentiti per gli allegati chat */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

/** Rileva il tipo reale del file tramite magic bytes */
function detectMimeFromBytes(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  return null;
}

// POST /api/messages/upload - Upload attachment
export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const conversationId = formData.get("conversation_id") as string;

    if (!file) {
      return NextResponse.json({ error: "File richiesto" }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id richiesto" }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File troppo grande (max 10MB)" }, { status: 400 });
    }

    // Verifica MIME type dichiarato contro la whitelist
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo file non supportato" }, { status: 400 });
    }

    // Check if user is participant
    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: "Non sei un partecipante di questa conversazione" }, { status: 403 });
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${conversationId}/${user.id}/${Date.now()}.${fileExt}`;
    const filePath = `chat-attachments/${fileName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verifica magic bytes: il contenuto reale deve corrispondere al MIME dichiarato
    const detectedMime = detectMimeFromBytes(buffer);
    if (!detectedMime || detectedMime !== file.type) {
      return NextResponse.json({ error: "Contenuto del file non valido" }, { status: 400 });
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json({ error: "Errore durante l'upload del file" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    const metadata = {
      name: file.name,
      size: file.size,
      type: file.type,
    };

    return NextResponse.json({
      url: publicUrl,
      metadata,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error in POST /api/messages/upload:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
