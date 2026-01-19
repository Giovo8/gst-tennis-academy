"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2, PlayCircle, Trophy, Target, Users as UsersIcon, RotateCw } from "lucide-react";
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
  const [regeneratingCalendar, setRegeneratingCalendar] = useState(false);
  const [completing, setCompleting] = useState(false);
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

  const hasValidId = id && typeof id === "string";

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

  const handleCompleteTournament = async () => {
    if (!id || typeof id !== "string") return;

    if (!confirm('Sei sicuro di voler concludere il torneo?\n\nQuesta azione segnerà il torneo come completato.')) {
      return;
    }

    try {
      setCompleting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournaments/${id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Torneo concluso con successo!');
        setReloadKey((prev) => prev + 1);
      } else {
        alert(data.error || 'Errore nella conclusione del torneo');
      }
    } catch (error) {
      console.error('Error completing tournament:', error);
      alert('Errore nella conclusione del torneo');
    } finally {
      setCompleting(false);
    }
  };

  const handleRegenerateBracket = async () => {
    if (!id || typeof id !== "string") return;

    if (
      !confirm(
        "Sei sicuro di voler rigenerare il bracket? Questa operazione eliminerà tutti i match e i risultati esistenti."
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

      // Chiama direttamente generate-bracket che elimina e rigenera automaticamente
      const res = await fetch(`/api/tournaments/${id}/generate-bracket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        alert(data?.message || "Bracket rigenerato con successo!");
        setReloadKey((prev) => prev + 1);
      } else {
        alert(data?.error || "Errore nella rigenerazione del bracket");
      }
    } catch (error) {
      console.error("Error regenerating bracket", error);
      alert("Errore nella rigenerazione del bracket");
    } finally {
      setRegeneratingBracket(false);
    }
  };

  const handleRegenerateCalendar = async () => {
    if (!id || typeof id !== "string") return;

    if (
      !confirm(
        "Sei sicuro di voler rigenerare il calendario? Questa operazione eliminerà tutti i match e i risultati esistenti."
      )
    ) {
      return;
    }

    try {
      setRegeneratingCalendar(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        alert("Sessione non valida");
        return;
      }

      // Prima elimina i match esistenti
      const deleteRes = await fetch(`/api/tournaments/${id}/delete-matches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!deleteRes.ok) {
        const deleteData = await deleteRes.json().catch(() => null);
        alert(deleteData?.error || "Errore nell'eliminazione dei match");
        return;
      }

      // Poi genera il nuovo calendario
      const res = await fetch(`/api/tournaments/${id}/generate-championship`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        alert(data?.message || "Calendario rigenerato con successo!");
        setReloadKey((prev) => prev + 1);
      } else {
        alert(data?.error || "Errore nella rigenerazione del calendario");
      }
    } catch (error) {
      console.error("Error regenerating calendar", error);
      alert("Errore nella rigenerazione del calendario");
    } finally {
      setRegeneratingCalendar(false);
    }
  };

  // Determina icona in base al tipo
  function getTournamentIcon() {
    const tournamentType = tournament?.tournament_type || tournament?.competition_type;
    if (tournamentType === 'eliminazione_diretta') {
      return Trophy;
    } else if (tournamentType === 'girone_eliminazione') {
      return Target;
    } else if (tournamentType === 'campionato') {
      return UsersIcon;
    }
    return Trophy;
  }

  const TournamentIcon = getTournamentIcon();

  // Determina colore bordo in base allo stato
  function getStatusBorderColor() {
    if (tournament?.status === "Chiuso" || tournament?.status === "Completato" || tournament?.status === "Concluso") {
      return "border-gray-500";
    } else if (tournament?.status === "In Corso" || tournament?.status === "In corso") {
      return "border-secondary";
    } else if (tournament?.status === "Aperto") {
      // Rosso se posti esauriti, verde altrimenti
      if (meta && meta.participantsCount >= (tournament?.max_participants || 0)) {
        return "border-red-500";
      }
      return "border-emerald-500";
    } else {
      return "border-secondary";
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link href="/dashboard/admin/tornei" className="hover:text-secondary/80 transition-colors">Gestione Competizioni</Link>
        {" › "}
        <span>Dettagli Torneo</span>
      </p>

      {!hasValidId && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-sm text-red-600">ID torneo non valido.</p>
        </div>
      )}

      {hasValidId && loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento...</p>
        </div>
      )}

      {/* Header con titolo e descrizione */}
      {hasValidId && !loading && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-2">
              Dettagli Competizione
            </h1>
            <p className="text-secondary/70 font-medium">
              Visualizza e gestisci i dettagli della competizione
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDeleteTournament}
              disabled={deleting}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Elimina Torneo"
          >
            {deleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>

          {meta && meta.currentPhase === "iscrizioni" && (
            <>
              <ManualEnrollment
                tournamentId={id}
                currentParticipants={meta.participantsCount}
                maxParticipants={meta.maxParticipants}
                onEnrollmentSuccess={() => {
                  setReloadKey((prev) => prev + 1);
                }}
              />

              <button
                onClick={handleStartTournament}
                disabled={starting || meta.participantsCount < 2}
                className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Avvia torneo"
              >
                {starting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <PlayCircle className="h-5 w-5" />
                )}
              </button>
            </>
          )}

          {meta && meta.tournamentType === "girone_eliminazione" && meta.currentPhase === "gironi" && (
            <button
              onClick={handleAdvanceToKnockout}
              disabled={advancing}
              className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Avanza Fase Eliminatoria"
            >
              {advancing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trophy className="h-5 w-5" />
              )}
            </button>
          )}

          {meta && (meta.tournamentType === "eliminazione_diretta" || 
                    (meta.tournamentType === "girone_eliminazione" && meta.currentPhase === "eliminazione")) && (
            <>
              <button
                onClick={handleRegenerateBracket}
                disabled={regeneratingBracket}
                className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rigenera Bracket"
              >
                {regeneratingBracket ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RotateCw className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={handleCompleteTournament}
                disabled={completing}
                className="p-2.5 text-white bg-green-600 rounded-md hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Concludi Torneo"
              >
                {completing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trophy className="h-5 w-5" />
                )}
              </button>
            </>
          )}

          {meta && meta.tournamentType === "campionato" && (meta.currentPhase === "campionato" || meta.currentPhase === "completato") && meta.status !== "Concluso" && (
            <>
              <button
                onClick={handleRegenerateCalendar}
                disabled={regeneratingCalendar}
                className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rigenera Calendario"
              >
                {regeneratingCalendar ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RotateCw className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={handleCompleteTournament}
                disabled={completing}
                className="p-2.5 text-white bg-green-600 rounded-md hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Concludi Campionato"
              >
                {completing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trophy className="h-5 w-5" />
                )}
              </button>
            </>
          )}
          </div>
        </div>
      )}

      {/* Header con info torneo */}
      {hasValidId && !loading && tournament && (
        <div
          className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
          style={{ borderLeftColor: (() => {
            if (tournament?.status === "Chiuso" || tournament?.status === "Completato" || tournament?.status === "Concluso") return "#6b7280"; // gray-500
            if (tournament?.status === "In Corso" || tournament?.status === "In corso") return "#0ea5e9"; // secondary
            if (tournament?.status === "Aperto" && meta && meta.participantsCount >= (tournament?.max_participants || 0)) return "#ef4444"; // rosso
            if (tournament?.status === "Aperto") return "#10b981"; // emerald
            return "#0ea5e9"; // secondary
          })() }}
        >
          <div className="flex items-start gap-6">
            <TournamentIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{tournament.title}</h1>
            </div>
          </div>
        </div>
      )}

      {/* Dettagli torneo */}
      {hasValidId && !loading && tournament && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli competizione</h2>
          
          <div className="space-y-6">
            {/* Descrizione */}
            {tournament.description && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
                <div className="flex-1">
                  <p className="text-secondary/70">{tournament.description}</p>
                </div>
              </div>
            )}

            {/* Data Inizio */}
            {tournament.start_date && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {new Date(tournament.start_date).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Tipo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo competizione</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {isCampionato ? 'Campionato' :
                   (tournament.tournament_type === 'girone_eliminazione' || tournament.competition_type === 'girone_eliminazione') ? 'Girone + Eliminazione' :
                   'Eliminazione Diretta'}
                </p>
              </div>
            </div>

            {/* Stato */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{tournament.status || "In preparazione"}</p>
              </div>
            </div>

            {/* Fase Corrente */}
            {meta && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Fase corrente</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold capitalize">{meta.currentPhase}</p>
                </div>
              </div>
            )}

            {/* Partecipanti */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Partecipanti</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {meta?.participantsCount ?? 0} / {tournament.max_participants}
                </p>
                {spotsLeft > 0 && (
                  <p className="text-sm text-secondary/70 mt-1">
                    {spotsLeft} {spotsLeft === 1 ? 'posto disponibile' : 'posti disponibili'}
                  </p>
                )}
              </div>
            </div>

            {/* Categoria */}
            {tournament.category && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Categoria</label>
                <div className="flex-1">
                  <p className="text-secondary/70">{tournament.category}</p>
                </div>
              </div>
            )}

            {/* Formato Partita */}
            {tournament.match_format && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Formato partita</label>
                <div className="flex-1">
                  <p className="text-secondary/70">
                    {tournament.match_format === 'best_of_3' ? 'Al meglio di 3 set' :
                     tournament.match_format === 'best_of_5' ? 'Al meglio di 5 set' :
                     tournament.match_format === 'best_of_1' ? '1 set unico' :
                     tournament.match_format}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content - TournamentManager con i tab - SEMPRE VISIBILE */}
      {hasValidId && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <TournamentManagerWrapper
            key={reloadKey}
            tournamentId={id}
            isAdmin={true}
            onMetaChange={setMeta}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminTournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento...</p>
        </div>
      }
    >
      <AdminTournamentDetailInner />
    </Suspense>
  );
}
