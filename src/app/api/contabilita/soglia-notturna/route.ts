import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";
import { createSogliaOrarioNotturnoSchema } from "@/lib/validation/schemas";
import logger from "@/lib/logger/secure-logger";

export interface SogliaOrarioNotturnoRow {
  id: string;
  ora_notte: string;
  valido_dal: string;
  valido_al: string | null;
  created_at: string;
}

// GET - Soglia in vigore ora (default) o storico completo. Solo admin/gestore.
export async function GET(request: NextRequest) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    const storico = request.nextUrl.searchParams.get("storico") === "1";

    if (storico) {
      const { data, error } = await supabase
        .from("soglie_orario_notturno")
        .select("id, ora_notte, valido_dal, valido_al, created_at")
        .order("valido_dal", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ storico: (data || []) as SogliaOrarioNotturnoRow[] });
    }

    const nowISO = new Date().toISOString();
    const { data, error } = await supabase
      .from("soglie_orario_notturno")
      .select("id, ora_notte, valido_dal, valido_al, created_at")
      .lte("valido_dal", nowISO)
      .or(`valido_al.is.null,valido_al.gt.${nowISO}`)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ attuale: (data ?? null) as SogliaOrarioNotturnoRow | null });
  } catch (err) {
    logger.error("Errore lettura soglia orario notturno:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

// POST - Imposta una nuova soglia: chiude quella attualmente in vigore (valido_al) e ne
// inserisce una nuova. Mai un UPDATE del valore esistente (append-only, storico completo).
export async function POST(request: NextRequest) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    const body = await request.json();
    const parsed = createSogliaOrarioNotturnoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dati non validi",
          details: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
        },
        { status: 400 },
      );
    }

    const { ora_notte } = parsed.data;
    const validoDal = parsed.data.valido_dal ?? new Date().toISOString();
    const validoAl = parsed.data.valido_al || null;

    const { error: closeError } = await supabase
      .from("soglie_orario_notturno")
      .update({ valido_al: validoDal })
      .is("valido_al", null);

    if (closeError) {
      logger.error("Errore chiusura soglia orario notturno precedente:", closeError);
      return NextResponse.json(
        { error: "La nuova data di decorrenza deve essere successiva all'ultima soglia impostata" },
        { status: 400 },
      );
    }

    const { data, error: insertError } = await supabase
      .from("soglie_orario_notturno")
      .insert([
        {
          ora_notte,
          valido_dal: validoDal,
          valido_al: validoAl,
          created_by: auth.user.id,
        },
      ])
      .select("id, ora_notte, valido_dal, valido_al, created_at")
      .single();

    if (insertError) {
      logger.error("Errore inserimento nuova soglia orario notturno:", insertError);
      return NextResponse.json({ error: "Errore durante il salvataggio della soglia" }, { status: 500 });
    }

    return NextResponse.json({ soglia: data as SogliaOrarioNotturnoRow }, { status: 201 });
  } catch (err) {
    logger.error("Errore impostazione soglia orario notturno:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

// DELETE - Elimina una soglia storica (es. correzione di un inserimento errato). Solo admin/gestore.
export async function DELETE(request: NextRequest) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio" }, { status: 400 });
    }

    const { error, count } = await supabase
      .from("soglie_orario_notturno")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      logger.error("Errore eliminazione soglia orario notturno:", error);
      return NextResponse.json({ error: "Errore durante l'eliminazione della soglia" }, { status: 500 });
    }

    if (!count) {
      return NextResponse.json({ error: "Soglia non trovata" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Errore eliminazione soglia orario notturno:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
