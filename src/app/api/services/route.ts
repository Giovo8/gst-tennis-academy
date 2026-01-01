import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth } from "@/lib/auth/verifyAuth";

// GET è pubblico per vedere i servizi disponibili
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ services: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST richiede auth admin/gestore
export async function POST(req: Request) {
  try {
    const authResult = await verifyAuth(req, ["admin", "gestore"]);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await req.json();
    const { data, error } = await supabaseServer.from("services").insert([body]).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ service: data?.[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT richiede auth admin/gestore
export async function PUT(req: Request) {
  try {
    const authResult = await verifyAuth(req, ["admin", "gestore"]);
    if (!authResult.success) {
      return authResult.response;
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const body = await req.json();
    const { data, error } = await supabaseServer.from("services").update(body).eq("id", id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ service: data?.[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE richiede auth admin/gestore
export async function DELETE(req: Request) {
  try {
    const authResult = await verifyAuth(req, ["admin", "gestore"]);
    if (!authResult.success) {
      return authResult.response;
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await supabaseServer.from("services").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
