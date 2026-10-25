'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Trophy, Target, Users as UsersIcon, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import TournamentManagerWrapper from '@/components/tournaments/TournamentManagerWrapper';
import TournamentTabBar, { type TournamentTabKey } from '@/components/tournaments/TournamentTabBar';
import ManualEnrollment from '@/components/tournaments/ManualEnrollment';
import TournamentScheduleSection, {
  useScheduledTournamentMatches,
} from '@/components/tournaments/TournamentScheduleSection';
import { toast } from 'sonner';
import { toastError } from '@/lib/toast';

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
  const [managerTab, setManagerTab] = useState<TournamentTabKey>('overview');
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
    if (!id || typeof id !== 'string') return;

    async function loadTournamentData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/tournaments?id=${id}`);
        const json = await res.json();
        if (res.ok && json.tournament) {
          setTournament(json.tournament);
        }
      } catch (error) {
        console.error('Error loading tournament:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTournamentData();
  }, [id, reloadKey]);

  // Iscritti con account, per la vista "come atleta" (sempre disponibile, anche a torneo in corso)
  const [athletes, setAthletes] = useState<{ user_id: string; name: string }[]>([]);
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    fetch(`/api/tournament_participants?tournament_id=${id}`)
      .then((r) => r.json())
      .then((json) => {
        const list = (json.participants || [])
          .filter((p: any) => p.user_id)
          .map((p: any) => ({
            user_id: p.user_id as string,
            name: (p.profiles?.full_name || 'Atleta') as string,
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setAthletes(list);
      })
      .catch(() => setAthletes([]));
  }, [id, reloadKey]);

  // Partite con prenotazione campo in arrivo: tab "In programma" (prima tab, selezionata all'apertura)
  const isStarted = Boolean(
    meta && meta.participantsCount > 0 && meta.currentPhase !== 'iscrizioni',
  );
  const scheduledMatches = useScheduledTournamentMatches(
    typeof id === 'string' ? id : null,
    true, // fetch subito, in parallelo al caricamento del torneo: la tab resta legata a isStarted
    reloadKey,
  );
  const hasScheduledMatches = isStarted && scheduledMatches.length > 0;
  const [scheduleAutoSelected, setScheduleAutoSelected] = useState(false);
  useEffect(() => {
    if (hasScheduledMatches && !scheduleAutoSelected) {
      setManagerTab('schedule');
      setScheduleAutoSelected(true);
    } else if (!hasScheduledMatches && managerTab === 'schedule') {
      setManagerTab('overview'); // il manager riporta poi alla prima tab valida della fase
    }
  }, [hasScheduledMatches, scheduleAutoSelected, managerTab]);

  const isCampionato = tournament?.tournament_type === 'campionato';

  const hasValidId = id && typeof id === 'string';

  const handleDeleteTournament = async () => {
    if (
      !confirm(
        '⚠️ ATTENZIONE: Sei sicuro di voler eliminare questo torneo?\n\nQuesta azione è irreversibile e cancellerà tutte le partite, i partecipanti e le statistiche.',
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
        method: 'DELETE',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      if (res.ok) {
        toast.success('Torneo eliminato');
        router.push('/dashboard/admin/tornei');
      } else {
        const data = await res.json().catch(() => null);
        toastError(data?.error, 'Eliminazione non riuscita');
      }
    } catch (error) {
      console.error('Error deleting tournament', error);
      toast.error('Eliminazione non riuscita');
    } finally {
      setDeleting(false);
    }
  };

  const handleStartTournament = async () => {
    if (!id || typeof id !== 'string') return;

    if (!meta || meta.participantsCount < 2) {
      toast.warning('Servono almeno 2 iscritti');
      return;
    }

    if (
      !confirm(
        'Sei sicuro di voler avviare il torneo?' +
          "\n\nDopo l'avvio non sarà più possibile modificare le iscrizioni.",
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
        method: 'POST',
        headers: token
          ? {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }
          : {
              'Content-Type': 'application/json',
            },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        toast.success('Torneo avviato');
        // Ricarica completamente il manager per riflettere la nuova fase
        setReloadKey((prev) => prev + 1);
      } else {
        toastError(data?.error, 'Avvio non riuscito');
      }
    } catch (error) {
      console.error('Error starting tournament', error);
      toast.error('Avvio non riuscito');
    } finally {
      setStarting(false);
    }
  };

  const handleAdvanceToKnockout = async () => {
    if (!id || typeof id !== 'string') return;

    if (
      !confirm(
        'Sei sicuro di voler far avanzare le prime squadre di ogni girone alla fase eliminatoria?',
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
        toast.error('Sessione scaduta, accedi di nuovo');
        return;
      }

      const res = await fetch(`/api/tournaments/${id}/advance-from-groups`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        toast.success('Fase eliminatoria avviata');
        setReloadKey((prev) => prev + 1);
      } else {
        toastError(data?.error, 'Avanzamento non riuscito');
      }
    } catch (error) {
      console.error('Error advancing to knockout', error);
      toast.error('Avanzamento non riuscito');
    } finally {
      setAdvancing(false);
    }
  };

  const handleCompleteTournament = async () => {
    if (!id || typeof id !== 'string') return;

    if (
      !confirm(
        'Sei sicuro di voler concludere il torneo?\n\nQuesta azione segnerà il torneo come completato.',
      )
    ) {
      return;
    }

    try {
      setCompleting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        toast.error('Sessione scaduta, accedi di nuovo');
        return;
      }

      const res = await fetch(`/api/tournaments/${id}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Torneo concluso');
        setReloadKey((prev) => prev + 1);
      } else {
        toastError(data.error, 'Chiusura non riuscita');
      }
    } catch (error) {
      console.error('Error completing tournament:', error);
      toast.error('Chiusura non riuscita');
    } finally {
      setCompleting(false);
    }
  };

  const handleRegenerateBracket = async () => {
    if (!id || typeof id !== 'string') return;

    if (
      !confirm(
        'Sei sicuro di voler rigenerare il bracket? Questa operazione eliminerà tutti i match e i risultati esistenti.',
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
        toast.error('Sessione scaduta, accedi di nuovo');
        return;
      }

      // Chiama direttamente generate-bracket che elimina e rigenera automaticamente
      const res = await fetch(`/api/tournaments/${id}/generate-bracket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        toast.success('Tabellone rigenerato');
        setReloadKey((prev) => prev + 1);
      } else {
        toastError(data?.error, 'Rigenerazione non riuscita');
      }
    } catch (error) {
      console.error('Error regenerating bracket', error);
      toast.error('Rigenerazione non riuscita');
    } finally {
      setRegeneratingBracket(false);
    }
  };

  const handleRegenerateCalendar = async () => {
    if (!id || typeof id !== 'string') return;

    if (
      !confirm(
        'Sei sicuro di voler rigenerare il calendario? Questa operazione eliminerà tutti i match e i risultati esistenti.',
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
        toast.error('Sessione scaduta, accedi di nuovo');
        return;
      }

      // Prima elimina i match esistenti
      const deleteRes = await fetch(`/api/tournaments/${id}/delete-matches`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!deleteRes.ok) {
        const deleteData = await deleteRes.json().catch(() => null);
        toastError(deleteData?.error, 'Rigenerazione non riuscita');
        return;
      }

      // Poi genera il nuovo calendario
      const res = await fetch(`/api/tournaments/${id}/generate-championship`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        toast.success('Calendario rigenerato');
        setReloadKey((prev) => prev + 1);
      } else {
        toastError(data?.error, 'Rigenerazione non riuscita');
      }
    } catch (error) {
      console.error('Error regenerating calendar', error);
      toast.error('Rigenerazione non riuscita');
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

  // Determina colore bordo in base allo stato (allineato alla palette di dashboard/admin/bookings)

  return (
    <div className="space-y-6 pt-3">
      {/* Breadcrumb + Titolo */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/admin/tornei"
            className="hover:text-secondary/80 transition-colors"
          >
            Gestione Competizioni
          </Link>
          {' › '}
          <span>Dettagli Torneo</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Torneo</h1>
      </div>

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

      {/* Header card torneo */}
      {hasValidId && !loading && tournament && (
        <div
          className="rounded-xl border-t border-r border-b p-6 border-l-4"
          style={{
            backgroundColor: (() => {
              if (
                tournament?.status === 'Chiuso' ||
                tournament?.status === 'Completato' ||
                tournament?.status === 'Concluso'
              )
                return '#9ca3af';
              if (tournament?.status === 'In Corso' || tournament?.status === 'In corso')
                return '#023b52';
              if (
                tournament?.status === 'Aperto' &&
                meta &&
                meta.participantsCount >= (tournament?.max_participants || 0)
              )
                return '#023047';
              if (tournament?.status === 'Aperto') return 'var(--secondary)';
              return 'var(--secondary)';
            })(),
            borderColor: (() => {
              if (
                tournament?.status === 'Chiuso' ||
                tournament?.status === 'Completato' ||
                tournament?.status === 'Concluso'
              )
                return '#9ca3af';
              if (tournament?.status === 'In Corso' || tournament?.status === 'In corso')
                return '#023b52';
              if (
                tournament?.status === 'Aperto' &&
                meta &&
                meta.participantsCount >= (tournament?.max_participants || 0)
              )
                return '#023047';
              if (tournament?.status === 'Aperto') return 'var(--secondary)';
              return 'var(--secondary)';
            })(),
            borderLeftColor: (() => {
              if (
                tournament?.status === 'Chiuso' ||
                tournament?.status === 'Completato' ||
                tournament?.status === 'Concluso'
              )
                return '#6b7280';
              if (tournament?.status === 'In Corso' || tournament?.status === 'In corso')
                return '#012b3b';
              if (
                tournament?.status === 'Aperto' &&
                meta &&
                meta.participantsCount >= (tournament?.max_participants || 0)
              )
                return '#011f33';
              if (tournament?.status === 'Aperto') return '#023047';
              return '#023047';
            })(),
          }}
        >
          <div className="flex items-start gap-6">
            <TournamentIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{tournament.title}</h2>
            </div>
          </div>
        </div>
      )}

      {/* Dettagli torneo */}
      {hasValidId && !loading && tournament && (
        <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gray-50">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">
              Dettagli competizione
            </h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              {/* Descrizione */}
              {tournament.description && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                    Descrizione
                  </label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{tournament.description}</p>
                  </div>
                </div>
              )}

              {/* Data Inizio */}
              {tournament.start_date && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                    Data inizio
                  </label>
                  <div className="flex-1">
                    <p className="text-secondary font-semibold">
                      {new Date(tournament.start_date).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Tipo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Tipo competizione
                </label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {isCampionato
                      ? 'Campionato'
                      : tournament.tournament_type === 'girone_eliminazione' ||
                        tournament.competition_type === 'girone_eliminazione'
                      ? 'Girone + Eliminazione'
                      : 'Eliminazione Diretta'}
                  </p>
                </div>
              </div>

              {/* Partecipanti */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Partecipanti
                </label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {meta?.participantsCount ?? 0} / {tournament.max_participants}
                  </p>
                </div>
              </div>

              {/* Categoria */}
              {tournament.category && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                    Categoria
                  </label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{tournament.category}</p>
                  </div>
                </div>
              )}

              {/* Formato Partita */}
              {tournament.match_format && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                    Formato partita
                  </label>
                  <div className="flex-1">
                    <p className="text-secondary/70">
                      {tournament.match_format === 'best_of_3'
                        ? 'Al meglio di 3 set'
                        : tournament.match_format === 'best_of_5'
                        ? 'Al meglio di 5 set'
                        : tournament.match_format === 'best_of_1'
                        ? '1 set unico'
                        : tournament.match_format}
                    </p>
                  </div>
                </div>
              )}

              {/* Stato */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Stato
                </label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {tournament.status || 'In preparazione'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vedi il torneo come un atleta iscritto */}
      {hasValidId && athletes.length > 0 && (
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-secondary flex-shrink-0" />
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                window.location.assign(`/dashboard/atleta/tornei/${id}?viewAs=${e.target.value}`);
            }}
            className="h-11 flex-1 min-w-0 rounded-lg border border-black/10 bg-white px-3 text-sm text-secondary"
            aria-label="Vedi il torneo come atleta"
          >
            <option value="" disabled>
              Vedi il torneo come atleta…
            </option>
            {athletes.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Partecipanti / Gironi / Tabellone / Calendario / Classifica */}
      {hasValidId && meta && (
        <TournamentTabBar
          meta={{
            tournamentType: meta.tournamentType,
            currentPhase: meta.currentPhase,
            participantsCount: meta.participantsCount,
            hasScheduledMatches,
          }}
          activeTab={managerTab}
          onChange={setManagerTab}
        />
      )}

      {hasValidId && hasScheduledMatches && managerTab === 'schedule' && (
        <TournamentScheduleSection
          matches={scheduledMatches}
          bookingBasePath="/dashboard/admin/bookings"
        />
      )}

      {/* Main content - TournamentManager con i tab - SEMPRE VISIBILE */}
      {hasValidId && (
        <TournamentManagerWrapper
          key={reloadKey}
          tournamentId={id}
          isAdmin={true}
          sectioned={true}
          activeTab={managerTab}
          onActiveTabChange={setManagerTab}
          onMetaChange={setMeta}
        />
      )}

      {/* Pulsanti azioni */}
      {hasValidId && !loading && (
        <div className="flex flex-col sm:flex-row gap-3">
          {meta && meta.currentPhase === 'iscrizioni' && (
            <>
              <ManualEnrollment
                tournamentId={id}
                currentParticipants={meta.participantsCount}
                maxParticipants={meta.maxParticipants}
                onEnrollmentSuccess={() => setReloadKey((prev) => prev + 1)}
              />
              <button
                onClick={handleStartTournament}
                disabled={starting || (meta?.participantsCount ?? 0) < 2}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Avvia Torneo
              </button>
            </>
          )}

          {meta &&
            meta.tournamentType === 'girone_eliminazione' &&
            meta.currentPhase === 'gironi' && (
              <button
                onClick={handleAdvanceToKnockout}
                disabled={advancing}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {advancing ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Avanza Fase Eliminatoria
              </button>
            )}

          {meta &&
            (meta.tournamentType === 'eliminazione_diretta' ||
              (meta.tournamentType === 'girone_eliminazione' &&
                meta.currentPhase === 'eliminazione')) && (
              <button
                onClick={handleRegenerateBracket}
                disabled={regeneratingBracket}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regeneratingBracket ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Rigenera Bracket
              </button>
            )}

          {meta &&
            meta.tournamentType === 'campionato' &&
            (meta.currentPhase === 'campionato' || meta.currentPhase === 'completato') &&
            meta.status !== 'Concluso' && (
              <button
                onClick={handleRegenerateCalendar}
                disabled={regeneratingCalendar}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regeneratingCalendar ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Rigenera Calendario
              </button>
            )}

          {meta &&
            (meta.tournamentType === 'eliminazione_diretta' ||
              (meta.tournamentType === 'girone_eliminazione' &&
                meta.currentPhase === 'eliminazione') ||
              (meta.tournamentType === 'campionato' &&
                (meta.currentPhase === 'campionato' || meta.currentPhase === 'completato') &&
                meta.status !== 'Concluso')) && (
              <button
                onClick={handleCompleteTournament}
                disabled={completing}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023047] rounded-lg hover:bg-[#023047]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Concludi
              </button>
            )}

          <button
            onClick={handleDeleteTournament}
            disabled={deleting}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Elimina
          </button>
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
