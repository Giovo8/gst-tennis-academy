import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";
import { createListinoPrezzoSchema } from "@/lib/validation/schemas";
import logger from "@/lib/logger/secure-logger";

export interface ListinoPrezzoRow {
  id: string;
  tipo_prenotazione: string;
  formato: string | null;
  fascia_oraria: string | null;
  durata_minuti: number;
  prezzo: number;
  valido_dal: string;
  valido_al: string | null;
  created_at: string;
}

// GET - Prezzi in vigore (default) o storico di una combinazione tipo+durata. Solo admin/gestore.
export async function GET(request: NextRequest) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    const params = request.nextUrl.searchParams;
    const storico = params.get("storico") === "1";
    const tipo = params.get("tipo");
    const durataParam = params.get("durata");
    const formatoParam = params.get("formato");
    const fasciaOrariaParam = params.get("fascia_oraria");

    if (storico) {
      if (!tipo || !durataParam) {
        return NextResponse.json(
          { error: "Parametri 'tipo' e 'durata' obbligatori per lo storico" },
          { status: 400 },
        );
      }
      const durata = Number(durataParam);
      let query = supabase
        .from("listino_prezzi")
        .select("id, tipo_prenotazione, formato, fascia_oraria, durata_minuti, prezzo, valido_dal, valido_al, created_at")
        .eq("tipo_prenotazione", tipo)
        .eq("durata_minuti", durata);
      query = formatoParam ? query.eq("formato", formatoParam) : query.is("formato", null);
      query = fasciaOrariaParam ? query.eq("fascia_oraria", fasciaOrariaParam) : query.is("fascia_oraria", null);
      const { data, error } = await query.order("valido_dal", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ storico: (data || []) as ListinoPrezzoRow[] });
    }

    // "Attuali" = in vigore ora: valido_dal nel passato e (nessuna scadenza oppure scadenza futura).
    const nowISO = new Date().toISOString();
    const { data, error } = await supabase
      .from("listino_prezzi")
      .select("id, tipo_prenotazione, formato, fascia_oraria, durata_minuti, prezzo, valido_dal, valido_al, created_at")
      .lte("valido_dal", nowISO)
      .or(`valido_al.is.null,valido_al.gt.${nowISO}`)
      .order("tipo_prenotazione", { ascending: true })
      .order("durata_minuti", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ attuali: (data || []) as ListinoPrezzoRow[] });
  } catch (err) {
    logger.error("Errore lettura listino prezzi:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

// POST - Imposta un nuovo prezzo per (tipo, durata): chiude la riga attiva precedente
// (valido_al) e inserisce una nuova riga. Mai un UPDATE del prezzo esistente (append-only).
export async function POST(request: NextRequest) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    const body = await request.json();
    const parsed = createListinoPrezzoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dati non validi",
          details: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
        },
        { status: 400 },
      );
    }

    const { tipo_prenotazione, durata_minuti, prezzo } = parsed.data;
    const formato = parsed.data.formato || null;
    const fasciaOraria = parsed.data.fascia_oraria || null;
    const validoDal = parsed.data.valido_dal ?? new Date().toISOString();
    // Se non specificato, il prezzo resta valido a tempo indeterminato.
    const validoAl = parsed.data.valido_al || null;

    // Chiude la riga attualmente in vigore per la stessa combinazione tipo+durata(+formato+fascia).
    let closeQuery = supabase
      .from("listino_prezzi")
      .update({ valido_al: validoDal })
      .eq("tipo_prenotazione", tipo_prenotazione)
      .eq("durata_minuti", durata_minuti)
      .is("valido_al", null);
    closeQuery = formato ? closeQuery.eq("formato", formato) : closeQuery.is("formato", null);
    closeQuery = fasciaOraria ? closeQuery.eq("fascia_oraria", fasciaOraria) : closeQuery.is("fascia_oraria", null);
    const { error: closeError } = await closeQuery;

    if (closeError) {
      logger.error("Errore chiusura prezzo precedente nel listino:", closeError);
      return NextResponse.json(
        { error: "La nuova data di decorrenza deve essere successiva all'ultimo prezzo impostato" },
        { status: 400 },
      );
    }

    const { data, error: insertError } = await supabase
      .from("listino_prezzi")
      .insert([
        {
          tipo_prenotazione,
          formato,
          fascia_oraria: fasciaOraria,
          durata_minuti,
          prezzo,
          valido_dal: validoDal,
          valido_al: validoAl,
          created_by: auth.user.id,
        },
      ])
      .select("id, tipo_prenotazione, formato, fascia_oraria, durata_minuti, prezzo, valido_dal, valido_al, created_at")
      .single();

    if (insertError) {
      logger.error("Errore inserimento nuovo prezzo nel listino:", insertError);
      return NextResponse.json({ error: "Errore durante il salvataggio del prezzo" }, { status: 500 });
    }

    return NextResponse.json({ prezzo: data as ListinoPrezzoRow }, { status: 201 });
  } catch (err) {
    logger.error("Errore impostazione prezzo listino:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

// DELETE - Elimina una riga del listino (es. correzione di un inserimento errato). Solo admin/gestore.
// Non impatta i prezzi già applicati alle prenotazioni esistenti: prezzo_applicato è uno
// snapshot numerico congelato alla creazione, non una FK verso listino_prezzi.
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
      .from("listino_prezzi")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      logger.error("Errore eliminazione prezzo listino:", error);
      return NextResponse.json({ error: "Errore durante l'eliminazione del prezzo" }, { status: 500 });
    }

    if (!count) {
      return NextResponse.json({ error: "Prezzo non trovato" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Errore eliminazione prezzo listino:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
