'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';

import { getSessionUser } from '@/lib/auth/clientSession';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TournamentManagerWrapper from '@/components/tournaments/TournamentManagerWrapper';
import TournamentTabBar, { type TournamentTabKey } from '@/components/tournaments/TournamentTabBar';
import TournamentScheduleSection, {
  useScheduledTournamentMatches,
} from '@/components/tournaments/TournamentScheduleSection';
import { Trophy, Loader2, Target, Users as UsersIcon, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { toastError } from '@/lib/toast';

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  level?: string;
  max_participants?: number;
  status?: string;
  tournament_type?: TournamentType;
  competition_type?: TournamentType;
  best_of?: number;
  match_format?: string;
  rounds_data?: any[];
  groups_data?: any[];
  standings?: any[];
};

function AtletaTournamentDetailInner() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const pathname = usePathname();
  const dashboardBase = pathname.split('/tornei')[0];
  const sectionClassName = 'bg-white rounded-lg border border-black/10 overflow-hidden';
  const sectionHeaderClassName = 'px-6 py-4 border-b border-black/10 bg-gray-50';
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentParticipants, setCurrentParticipants] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // Incrementato dopo iscrizione/disiscrizione per ricaricare il manager senza reload della pagina
  const [managerKey, setManagerKey] = useState(0);
  const [joined, setJoined] = useState(false);
  const [managerTab, setManagerTab] = useState<TournamentTabKey>('overview');
  const [managerMeta, setManagerMeta] = useState<{
    tournamentType?: string;
    currentPhase?: string;
    participantsCount: number;
  } | null>(null);
  const router = useRouter();
  const viewAsId = useSearchParams().get('viewAs');
  const [viewAsName, setViewAsName] = useState<string | null>(null);
  // Vista admin "come atleta": attiva solo dopo la verifica del ruolo (vedi load)
  const [isViewAs, setIsViewAs] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      if (!id) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/tournaments?id=${id}`);
        let json: any = {};
        try {
          json = await res.json();
        } catch {
          json = {};
        }
        if (!res.ok) throw new Error(json.error || 'Errore caricamento torneo');
        if (mounted) {
          setTournament(json.tournament ?? null);
          setCurrentParticipants(json.current_participants ?? 0);
        }

        // get user and check participation
        const { data: userData } = await getSessionUser();
        const user = userData.user;
        let participantUserId = user?.id ?? null;
        if (user && viewAsId) {
          const { data: me } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (['admin', 'gestore'].includes(me?.role ?? '')) {
            participantUserId = viewAsId;
            const { data: target } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', viewAsId)
              .single();
            if (mounted) {
              setIsViewAs(true);
              setViewAsName(target?.full_name || 'Atleta');
            }
          }
        }
        if (participantUserId) {
          if (mounted) setTargetUserId(participantUserId);
          const pRes = await fetch(
            `/api/tournament_participants?user_id=${participantUserId}&tournament_id=${id}`,
          );
          let pJson: any = {};
          try {
            pJson = await pRes.json();
          } catch {
            pJson = {};
          }
          if (pRes.ok && pJson.participants && pJson.participants.length > 0) {
            if (mounted) setJoined(true);
          }
        }
      } catch (err) {
        if (mounted) toastError(err, 'Caricamento non riuscito');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    return () => {
      mounted = false;
    };
  }, [id, viewAsId]);

  // Partite prenotate in arrivo (pubbliche): tab "In programma" (prima tab, selezionata all'apertura)
  const isStarted = Boolean(
    managerMeta && managerMeta.participantsCount > 0 && managerMeta.currentPhase !== 'iscrizioni',
  );
  const scheduledMatches = useScheduledTournamentMatches(
    typeof id === 'string' ? id : null,
    true, // fetch subito, in parallelo al caricamento del torneo: la tab resta legata a isStarted
    0,
    'public',
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

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user ?? null;
      if (!user) {
        toast.error('Accedi per iscriverti');
        setActionLoading(false);
        return;
      }

      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch('/api/tournament_participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: user.id, tournament_id: id }),
      });
      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }
      if (!res.ok) {
        toastError(json.error, 'Iscrizione non riuscita');
      } else {
        setJoined(true);
        setCurrentParticipants((c) => c + 1);
        setManagerKey((k) => k + 1);
        toast.success('Iscrizione completata');
      }
    } catch (err) {
      toastError(err, 'Iscrizione non riuscita');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Sei sicuro di voler cancellare la tua iscrizione?')) {
      return;
    }

    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user ?? null;
      if (!user) {
        toast.error('Sessione scaduta, accedi di nuovo');
        setActionLoading(false);
        return;
      }

      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch(
        `/api/tournament_participants?user_id=${user.id}&tournament_id=${id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }
      if (!res.ok) {
        toastError(json.error, 'Annullamento non riuscito');
      } else {
        setJoined(false);
        setCurrentParticipants((c) => Math.max(0, c - 1));
        setManagerKey((k) => k + 1);
        toast.success('Iscrizione annullata');
      }
    } catch (err) {
      toastError(err, 'Annullamento non riuscito');
    } finally {
      setActionLoading(false);
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

  const spotsLeft = (tournament?.max_participants ?? 0) - currentParticipants;
  const isCampionato =
    tournament?.competition_type === 'campionato' || tournament?.tournament_type === 'campionato';
  const isFull = tournament?.status === 'Aperto' && spotsLeft <= 0;
  const getDisplayStatus = () => {
    if (isFull) {
      return 'Registrazioni Chiuse - Posti Esauriti';
    }
    return tournament?.status || 'In preparazione';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/70">Caricamento torneo...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <p className="breadcrumb text-secondary/60">
          <Link
            href={`${dashboardBase}/tornei`}
            className="hover:text-secondary/80 transition-colors"
          >
            Competizioni
          </Link>
          {' › '}
          <span>Dettaglio</span>
        </p>

        <div className="text-center py-20 bg-white rounded-xl">
          <Trophy className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary mb-2">Torneo non trovato</h2>
          <p className="text-secondary/70 mb-6">
            Il torneo che stai cercando non esiste o è stato rimosso.
          </p>
          <button
            onClick={() => router.push(`${dashboardBase}/tornei`)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all"
          >
            Torna ai Tornei
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-3">
      {/* Header con titolo e descrizione */}
      <div>
        <p className="breadcrumb text-secondary/60">Dettaglio Competizione</p>
        <h1 className="text-3xl font-bold text-secondary mb-2">Dettaglio Competizione</h1>
      </div>

      {/* Banner vista admin */}
      {isViewAs && (
        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 flex flex-wrap items-center gap-3">
          <Eye className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <p className="flex-1 text-sm text-orange-800">
            Stai vedendo il torneo come <strong>{viewAsName}</strong>. Puoi modificare solo i
            punteggi delle sue partite (il salvataggio avviene con il tuo account admin).
          </p>
          <Link
            href={`/dashboard/admin/tornei/${id}`}
            className="text-sm font-medium text-orange-700 underline hover:text-orange-900"
          >
            Esci dalla vista atleta
          </Link>
        </div>
      )}

      {/* Header con info torneo */}
      <div
        className="bg-secondary rounded-lg border border-black/10 p-6 border-l-4"
        style={{ borderLeftColor: 'var(--secondary)' }}
      >
        <div className="flex items-start gap-6">
          <TournamentIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{tournament.title}</h2>
          </div>
        </div>
      </div>

      {/* Dettagli torneo */}
      <div className={sectionClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">
            Dettagli competizione
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {/* Descrizione */}
            {tournament.description && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
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
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Data inizio
                </label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {(() => {
                      const dateStr = new Date(tournament.start_date).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      });
                      // Capitalizza il primo carattere (giorno della settimana) e il mese
                      return dateStr
                        .replace(/^(.)/, (match) => match.toUpperCase())
                        .replace(
                          /(\s)([a-z])/g,
                          (match, space, char) => space + char.toUpperCase(),
                        );
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Tipo */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
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

            {/* Stato */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Stato
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{getDisplayStatus()}</p>
              </div>
            </div>

            {/* Partecipanti */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Partecipanti
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {currentParticipants} / {tournament.max_participants}
                </p>
              </div>
            </div>

            {/* Categoria */}
            {tournament.category && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Categoria
                </label>
                <div className="flex-1">
                  <p className="text-secondary/70">{tournament.category}</p>
                </div>
              </div>
            )}

            {/* Livello */}
            {tournament.level && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Livello
                </label>
                <div className="flex-1">
                  <p className="text-secondary/70">{tournament.level}</p>
                </div>
              </div>
            )}

            {/* Formato Partita */}
            {(tournament.match_format || tournament.best_of) && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Formato partita
                </label>
                <div className="flex-1">
                  <p className="text-secondary/70">
                    {tournament.match_format === 'best_of_3' || tournament.best_of === 3
                      ? 'Al meglio di 3 set'
                      : tournament.match_format === 'best_of_5' || tournament.best_of === 5
                      ? 'Al meglio di 5 set'
                      : tournament.match_format === 'best_of_1' || tournament.best_of === 1
                      ? '1 set unico'
                      : tournament.match_format || `Best of ${tournament.best_of}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Partecipanti/Tabellone/Gironi/Calendario/Classifica */}
      {currentParticipants > 0 && managerMeta && (
        <TournamentTabBar
          meta={{ ...managerMeta, hasScheduledMatches }}
          activeTab={managerTab}
          onChange={setManagerTab}
        />
      )}

      {hasScheduledMatches && managerTab === 'schedule' && (
        <TournamentScheduleSection matches={scheduledMatches} />
      )}

      {/* Tournament Manager */}
      {currentParticipants > 0 && (
        <TournamentManagerWrapper
          key={managerKey}
          tournamentId={tournament.id}
          isAdmin={false}
          highlightUserId={targetUserId}
          canEditOwnMatches
          activeTab={managerTab}
          onActiveTabChange={setManagerTab}
          hideTabBar
          onMetaChange={setManagerMeta}
        />
      )}

      {/* Pulsanti azioni */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Bottone Iscriviti */}
        {!isViewAs && !joined && tournament.status === 'Aperto' && (
          <button
            onClick={handleJoin}
            disabled={actionLoading || spotsLeft <= 0}
            title={spotsLeft <= 0 ? 'Posti esauriti' : 'Iscriviti al torneo'}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Iscrizione in corso...
              </>
            ) : spotsLeft <= 0 ? (
              'Posti Esauriti'
            ) : (
              'Iscriviti al Torneo'
            )}
          </button>
        )}

        {/* Bottone Cancella Iscrizione */}
        {!isViewAs && joined && tournament.status === 'Aperto' && (
          <button
            onClick={handleLeave}
            disabled={actionLoading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Cancellazione in corso...
              </>
            ) : (
              'Cancella Iscrizione'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AtletaTournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/70">Caricamento...</p>
        </div>
      }
    >
      <AtletaTournamentDetailInner />
    </Suspense>
  );
}
