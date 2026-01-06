"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2, PlayCircle, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import TournamentManagerWrapper from "@/components/tournaments/TournamentManagerWrapper";
import ManualEnrollment from "@/components/tournaments/ManualEnrollment";

function AdminTournamentDetailInner() {
  const params = useParams();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [regeneratingBracket, setRegeneratingBracket] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{
    participantsCount: number;
    maxParticipants: number;
    currentPhase: string;
    status: string;
    tournamentType?: string;
  } | null>(null);
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Load tournament data
  useEffect(() => {
    if (!id || typeof id !== "string") return;
    
    async function loadTournamentData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/tournaments?id=${id}`);
        const json = await res.json();
        if (res.ok && json.tournament) {
          setTournament(json.tournament);
        }
      } catch (error) {
        console.error("Error loading tournament:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTournamentData();
  }, [id, reloadKey]);

  const isCampionato = tournament?.tournament_type === 'campionato';

  const spotsLeft = tournament && meta 
    ? (tournament.max_participants ?? 0) - meta.participantsCount 
    : 0;

  if (!id || typeof id !== "string") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">ID torneo non valido.</p>
        <Link
          href="/dashboard/admin/tornei"
          className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
        >
          Torna ai tornei
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto" />
          <p className="mt-4 text-sm text-secondary/70">Caricamento torneo...</p>
        </div>
      </div>
    );
  }

  const handleDeleteTournament = async () => {
    if (
      !confirm(
        "⚠️ ATTENZIONE: Sei sicuro di voler eliminare questo torneo?\n\nQuesta azione è irreversibile e cancellerà tutte le partite, i partecipanti e le statistiche."
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const res = await fetch(`/api/tournaments?id=${id}`, {
        method: "DELETE",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      if (res.ok) {
        router.push("/dashboard/admin/tornei");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Errore nell'eliminazione del torneo");
      }
    } catch (error) {
      console.error("Error deleting tournament", error);
      alert("Errore nell'eliminazione del torneo");
    } finally {
      setDeleting(false);
    }
  };

  const handleStartTournament = async () => {
    if (!id || typeof id !== "string") return;

    if (!meta || meta.participantsCount < 2) {
      alert("Per avviare il torneo servono almeno 2 partecipanti.");
      return;
    }

    if (
      !confirm(
        "Sei sicuro di voler avviare il torneo?" +
          "\n\nDopo l'avvio non sarà più possibile modificare le iscrizioni."
      )
    ) {
      return;
    }

    try {
      setStarting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const res = await fetch(`/api/tournaments/${id}/start`, {
        method: "POST",
        headers: token
          ? {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            }
          : {
              "Content-Type": "application/json",
            },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        alert(data?.message || "Torneo avviato con successo");
        // Ricarica completamente il manager per riflettere la nuova fase
        setReloadKey((prev) => prev + 1);
      } else {
        alert(data?.error || "Errore nell'avvio del torneo");
      }
    } catch (error) {
      console.error("Error starting tournament", error);
      alert("Errore nell'avvio del torneo");
    } finally {
      setStarting(false);
    }
  };

  const handleAdvanceToKnockout = async () => {
    if (!id || typeof id !== "string") return;

    if (
      !confirm(
        "Sei sicuro di voler far avanzare le prime squadre di ogni girone alla fase eliminatoria?"
      )
    ) {
      return;
    }

    try {
      setAdvancing(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        alert("Sessione non valida");
        return;
      }

      const res = await fetch(`/api/tournaments/${id}/advance-from-groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        alert(data?.message || "Partecipanti avanzati alla fase eliminatoria!");
        setReloadKey((prev) => prev + 1);
      } else {
        alert(data?.error || "Errore nell'avanzamento alla fase eliminatoria");
      }
    } catch (error) {
      console.error("Error advancing to knockout", error);
      alert("Errore nell'avanzamento alla fase eliminatoria");
    } finally {
      setAdvancing(false);
    }
  };

  const handleRegenerateBracket = async () => {
    if (!id || typeof id !== "string") return;

    if (
      !confirm(
        "⚠️ ATTENZIONE: Sei sicuro di voler eliminare tutti i match del bracket?\n\nQuesta azione eliminerà tutti i risultati e dovrai rigenerare il bracket."
      )
    ) {
      return;
    }

    try {
      setRegeneratingBracket(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        alert("Sessione non valida");
        return;
      }

      const res = await fetch(`/api/tournaments/${id}/delete-matches`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        alert(data?.message || "Match eliminati con successo!");
        setReloadKey((prev) => prev + 1);
      } else {
        alert(data?.error || "Errore nell'eliminazione dei match");
      }
    } catch (error) {
      console.error("Error deleting matches", error);
      alert("Errore nell'eliminazione dei match");
    } finally {
      setRegeneratingBracket(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/admin/tornei"
            className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
          >
            Gestione competizioni
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">Gestione torneo</h1>
          <p className="text-secondary/70 font-medium">
            Visualizza calendario, partecipanti e risultati del torneo selezionato.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-end">
          {/* Azioni disponibili solo in fase iscrizioni */}
          {meta && meta.currentPhase === "iscrizioni" && (
            <>
              <ManualEnrollment
                tournamentId={id}
                currentParticipants={meta.participantsCount}
                maxParticipants={meta.maxParticipants}
                onEnrollmentSuccess={() => {
                  // Forza il ricaricamento del manager per aggiornare iscritti, fase e stato
                  setReloadKey((prev) => prev + 1);
                }}
              />

              <button
                onClick={handleStartTournament}
                disabled={starting || meta.participantsCount < 2}
                className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Avvio...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    <span>Avvia torneo</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Bottone Avanza Fase Eliminatoria per tornei girone+eliminazione */}
          {meta && meta.tournamentType === "girone_eliminazione" && meta.currentPhase === "gironi" && (
            <button
              onClick={handleAdvanceToKnockout}
              disabled={advancing}
              className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {advancing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Avanzamento...</span>
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  <span>Avanza Fase Eliminatoria</span>
                </>
              )}
            </button>
          )}
          {/* Bottone Rigenera Bracket per tornei in fase eliminazione */}
          {meta && (meta.tournamentType === "eliminazione_diretta" || 
                    (meta.tournamentType === "girone_eliminazione" && meta.currentPhase === "eliminazione")) && (
            <button
              onClick={handleRegenerateBracket}
              disabled={regeneratingBracket}
              className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {regeneratingBracket ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Eliminazione...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Rigenera Bracket</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDeleteTournament}
            disabled={deleting}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Eliminazione...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Elimina torneo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tournament Info Header - Similar to public page */}
      {tournament && (
        <div className="bg-white rounded-md p-6 hover:shadow-md transition-all">
          {/* Hero Header */}
          <div className="mb-8">
            {/* Tournament Type Badge */}
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-secondary/60 mb-3">
              {isCampionato ? 'Campionato' : 'Torneo'}
            </p>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-4 leading-tight">
              {tournament.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-secondary/60 mb-6">
              {tournament.category && (
                <span>{tournament.category}</span>
              )}
              {tournament.status && (
                <>
                  <span>•</span>
                  <span>{tournament.status}</span>
                </>
              )}
              {tournament.level && (
                <>
                  <span>•</span>
                  <span>{tournament.level}</span>
                </>
              )}
            </div>

            {/* ID */}
            <p className="text-sm text-secondary/70 mb-4">
              {tournament.id}
            </p>

            {/* Description */}
            {tournament.description && (
              <p className="text-base sm:text-lg text-secondary/80 leading-relaxed max-w-3xl">
                {tournament.description}
              </p>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date Card */}
            {tournament.start_date && (
              <div className="border-l-4 border-secondary pl-4">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary/60 mb-2">Data Inizio</p>
                <p className="text-xl font-bold text-secondary">
                  {new Date(tournament.start_date).toLocaleDateString('it-IT', { 
                    day: 'numeric', 
                    month: 'long'
                  })}
                </p>
                <p className="text-sm text-secondary/70 mt-1">
                  {new Date(tournament.start_date).toLocaleDateString('it-IT', { 
                    year: 'numeric'
                  })} ore {new Date(tournament.start_date).toLocaleTimeString('it-IT', { 
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            {/* Participants Card */}
            <div className="border-l-4 border-secondary pl-4">
              <p className="text-xs font-bold uppercase tracking-wider text-secondary/60 mb-2">Partecipanti</p>
              <p className="text-xl font-bold text-secondary">
                {meta?.participantsCount ?? 0} / {tournament.max_participants}
              </p>
              <p className="text-sm text-secondary/70 mt-1">
                {spotsLeft > 0 ? `${spotsLeft} posti disponibili` : 'Tutto esaurito'}
              </p>
            </div>

            {/* Format Card */}
            {tournament.best_of && (
              <div className="border-l-4 border-secondary pl-4">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary/60 mb-2">Formato</p>
                <p className="text-xl font-bold text-secondary">
                  Best of {tournament.best_of}
                </p>
                <p className="text-sm text-secondary/70 mt-1">
                  {tournament.best_of === 3 ? 'Al meglio di 3 set' : tournament.best_of === 5 ? 'Al meglio di 5 set' : 'Set personalizzati'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="bg-white rounded-md p-6 hover:shadow-md transition-all">
        <TournamentManagerWrapper
          key={reloadKey}
          tournamentId={id}
          isAdmin={true}
          onMetaChange={setMeta}
        />
      </div>
    </div>
  );
}

export default function AdminTournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
      }
    >
      <AdminTournamentDetailInner />
    </Suspense>
  );
}
