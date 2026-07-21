import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, unauthorized, forbidden, isAdmin } from "@/lib/auth/routeAuth";

function extractCertificatePath(url: string | null): string | null {
  if (!url) return null;

  const marker = "/certificates/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;

  const rawPath = url.slice(markerIndex + marker.length).split("?")[0].split("#")[0];
  return rawPath || null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const deleteOnly = formData.get("deleteOnly") === "true";
    const oldCertificateUrl = formData.get("oldCertificateUrl") as string | null;
    const targetUserId = formData.get("targetUserId") as string | null;

    const isAdminUser = isAdmin(auth.role);
    const effectiveTargetUserId = targetUserId || auth.user.id;

    if (!isAdminUser && effectiveTargetUserId !== auth.user.id) {
      return forbidden();
    }

    let removableCertificateUrl: string | null = oldCertificateUrl;

    if (!isAdminUser) {
      const { data: profile, error: profileError } = await supabaseServer
        .from("profiles")
        .select("metadata")
        .eq("id", auth.user.id)
        .single();

      if (profileError) {
        return NextResponse.json(
          { error: "Impossibile verificare il certificato corrente" },
          { status: 500 }
        );
      }

      const metadata = profile?.metadata as { certificato_medico_url?: string } | null;
      removableCertificateUrl = metadata?.certificato_medico_url || null;
    }

    if (deleteOnly) {
      const oldPath = extractCertificatePath(removableCertificateUrl);
      if (oldPath) {
        await supabaseServer.storage.from("certificates").remove([oldPath]);
      }

      return NextResponse.json({ ok: true });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const oldPath = extractCertificatePath(removableCertificateUrl);
    if (oldPath) {
      await supabaseServer.storage.from("certificates").remove([oldPath]);
    }

    const fileName = `${effectiveTargetUserId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}_certificato_medico.pdf`;

    const { error: uploadError } = await supabaseServer.storage
      .from("certificates")
      .upload(fileName, file, {
        contentType: "application/pdf",
        // Nome file immutabile (timestamp+random, upsert:false) → cache 1 anno
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message || "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabaseServer.storage.from("certificates").getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
