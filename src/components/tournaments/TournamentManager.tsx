'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, Target, Loader2, Calendar, X, Eye } from 'lucide-react';
import EliminationBracketView from './EliminationBracketView';
import GroupStageView from './GroupStageView';
import ChampionshipStandingsView from './ChampionshipStandingsView';
import { useTournamentData } from './hooks/useTournamentData';
import { ParticipantCard } from './ParticipantCard';
import { getTournamentTabs } from './TournamentTabBar';
import { getBestOf } from '@/lib/tournaments/getBestOf';

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

interface Tournament {
  id: string;
  title: string;
  tournament_type: TournamentType;
  category?: string;
  description?: string;
  start_date?: string;
  max_participants: number;
  num_groups?: number;
  teams_per_group?: number;
  teams_advancing?: number;
  current_phase: 'iscrizioni' | 'gironi' | 'eliminazione' | 'campionato' | 'completato' | string;
  status: string;
  best_of?: number;
  match_format?: string;
}

interface TournamentManagerMeta {
  participantsCount: number;
  maxParticipants: number;
  currentPhase: string;
  status: string;
  tournamentType?: string;
}

type TournamentTabKey = 'schedule' | 'overview' | 'bracket' | 'groups' | 'calendar' | 'standings';

interface TournamentManagerProps {
  tournament: Tournament;
  isAdmin?: boolean;
  sectioned?: boolean;
  onMetaChange?: (meta: TournamentManagerMeta) => void;
  activeTab?: TournamentTabKey;
  onActiveTabChange?: (tab: TournamentTabKey) => void;
  hideTabBar?: boolean;
  highlightUserId?: string | null;
  canEditOwnMatches?: boolean;
}

export default function TournamentManager({
  tournament,
  isAdmin = false,
  sectioned = false,
  onMetaChange,
  activeTab: controlledActiveTab,
  onActiveTabChange,
  hideTabBar = false,
  highlightUserId = null,
  canEditOwnMatches = false,
}: TournamentManagerProps) {
  const { participants, groups, loading, loadData, handleRemoveParticipant } = useTournamentData({
    tournamentId: tournament.id,
    tournamentType: tournament.tournament_type,
    maxParticipants: tournament.max_participants,
    currentPhase: tournament.current_phase,
    status: tournament.status,
    onMetaChange,
  });
  const [internalActiveTab, setInternalActiveTab] = useState<TournamentTabKey>('overview');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onActiveTabChange ?? setInternalActiveTab;
  const showTabBar = !hideTabBar;
  const sectionClassName = 'page-card';
  const sectionHeaderClassName = 'px-6 py-4 border-b border-black/10 bg-gray-50';
  const [openParticipantMenuId, setOpenParticipantMenuId] = useState<string | null>(null);
  const bestOf = getBestOf(tournament);

  // Se la tab attiva non è più disponibile (es. torneo avviato, "Partecipanti" sostituita da Gironi/Tabellone/Classifica), passa alla prima tab valida
  useEffect(() => {
    // "In programma" dipende dalle prenotazioni ed è gestita dal contenitore
    if (activeTab === 'schedule') return;
    const availableTabs = getTournamentTabs({
      tournamentType: tournament.tournament_type,
      currentPhase: tournament.current_phase as string,
      participantsCount: participants.length,
    });
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [
    tournament.tournament_type,
    tournament.current_phase,
    participants.length,
    activeTab,
    setActiveTab,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Helper: render participants list as a section card (bookings/[id] style)
  const renderParticipantsSection = (opts?: {
    showGroupInfo?: boolean;
    showGroupPosition?: boolean;
    teamsAdvancing?: number;
  }) => {
    if (participants.length === 0) return null;
    const {
      showGroupInfo = false,
      showGroupPosition = false,
      teamsAdvancing = tournament.teams_advancing || 2,
    } = opts || {};
    return (
      <div className={sectionClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Iscritti</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <ul className="flex flex-col gap-2">
            {participants.map((participant: any, index: number) => {
              const fullName =
                participant.profiles?.full_name || participant.player_name || 'Giocatore';
              const isGuest = !participant.user_id;
              const initials = fullName
                .trim()
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const isMine = !!highlightUserId && participant.user_id === highlightUserId;
              const bg = isMine ? '#023047' : isGuest ? '#023b52' : 'var(--secondary)';
              const groupLabel =
                showGroupInfo && participant.group_id
                  ? `${groups.find((g) => g.id === participant.group_id)?.group_name || 'Girone'}${
                      showGroupPosition && participant.group_position != null
                        ? ` - ${
                            participant.group_position <= teamsAdvancing
                              ? `Posizione ${participant.group_position}`
                              : 'Non Qualificato'
                          }`
                        : ''
                    }`
                  : null;
              const rowContent = (
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg"
                  style={{ background: bg }}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-white leading-none">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{fullName}</p>
                    {groupLabel && (
                      <p className="text-xs text-white/70 truncate mt-0.5">{groupLabel}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isGuest && (
                      <span className="text-xs font-bold text-white/50 uppercase tracking-wide">
                        OSPITE
                      </span>
                    )}
                    {isAdmin && participant.user_id && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.assign(
                            `/dashboard/atleta/tornei/${tournament.id}?viewAs=${participant.user_id}`,
                          );
                        }}
                        className="inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors touch-manipulation min-w-[40px] min-h-[40px]"
                        title={`Vedi il torneo come ${fullName}`}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    {isAdmin && (tournament.current_phase as string) === 'iscrizioni' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveParticipant(participant.id, fullName);
                        }}
                        className="inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors touch-manipulation min-w-[40px] min-h-[40px]"
                        title="Rimuovi partecipante"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
              return (
                <li key={`${participant.id}-${index}`}>
                  {participant.user_id && isAdmin ? (
                    <Link
                      href={`/dashboard/admin/users/${participant.user_id}`}
                      className="block hover:opacity-90 transition-opacity"
                    >
                      {rowContent}
                    </Link>
                  ) : (
                    rowContent
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  if (sectioned) {
    const phase = tournament.current_phase as string;
    const type = tournament.tournament_type;
    return (
      <div className="space-y-6">
        {activeTab === 'overview' && renderParticipantsSection()}

        {/* Tabellone - eliminazione_diretta */}
        {activeTab === 'bracket' &&
          type === 'eliminazione_diretta' &&
          (phase === 'eliminazione' || phase === 'completato') && (
            <div className="page-card">
              <div className="px-6 py-4 border-b border-black/10 bg-gray-50">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Tabellone</h2>
              </div>
              <div className="px-6 py-4">
                <EliminationBracketView
                  isAdmin={isAdmin}
                  highlightUserId={highlightUserId}
                  canEditOwnMatches={canEditOwnMatches}
                  tournamentId={tournament.id}
                  maxParticipants={tournament.max_participants}
                  participants={participants}
                  bestOf={bestOf}
                  onMatchUpdate={loadData}
                  onBracketGenerated={() => {}}
                />
              </div>
            </div>
          )}

        {/* Gironi - girone_eliminazione */}
        {activeTab === 'groups' &&
          type === 'girone_eliminazione' &&
          (phase === 'gironi' || phase === 'eliminazione' || phase === 'completato') && (
            <div className="page-card">
              <div className="px-6 py-4 border-b border-black/10 bg-gray-50">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Gironi</h2>
              </div>
              <div className="px-6 py-4">
                <GroupStageView
                  highlightUserId={highlightUserId}
                  canEditOwnMatches={canEditOwnMatches}
                  tournamentId={tournament.id}
                  groups={groups}
                  participants={participants}
                  bestOf={bestOf}
                  teamsAdvancing={tournament.teams_advancing || 2}
                  onMatchUpdate={loadData}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          )}

        {/* Tabellone - girone_eliminazione fase eliminazione */}
        {activeTab === 'bracket' &&
          type === 'girone_eliminazione' &&
          (phase === 'eliminazione' || phase === 'completato') && (
            <div className="page-card">
              <div className="px-6 py-4 border-b border-black/10 bg-gray-50">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">
                  Tabellone Eliminazione
                </h2>
              </div>
              <div className="px-6 py-4">
                <EliminationBracketView
                  isAdmin={isAdmin}
                  highlightUserId={highlightUserId}
                  canEditOwnMatches={canEditOwnMatches}
                  tournamentId={tournament.id}
                  maxParticipants={(tournament.num_groups || 0) * (tournament.teams_advancing || 0)}
                  participants={participants.filter(
                    (p) =>
                      p.group_position && p.group_position <= (tournament.teams_advancing || 0),
                  )}
                  bestOf={bestOf}
                  onMatchUpdate={loadData}
                />
              </div>
            </div>
          )}

        {/* Calendario - campionato */}
        {activeTab === 'calendar' &&
          type === 'campionato' &&
          (phase === 'campionato' || phase === 'completato') && (
            <ChampionshipStandingsView
              highlightUserId={highlightUserId}
              canEditOwnMatches={canEditOwnMatches}
              tournamentId={tournament.id}
              participants={participants}
              bestOf={bestOf}
              onMatchUpdate={loadData}
              isAdmin={isAdmin}
              defaultView="calendar"
              hideInternalTabs={true}
            />
          )}

        {/* Classifica - campionato */}
        {activeTab === 'standings' &&
          type === 'campionato' &&
          (phase === 'campionato' || phase === 'completato') && (
            <ChampionshipStandingsView
              highlightUserId={highlightUserId}
              canEditOwnMatches={canEditOwnMatches}
              tournamentId={tournament.id}
              participants={participants}
              bestOf={bestOf}
              onMatchUpdate={loadData}
              isAdmin={isAdmin}
              defaultView="standings"
              hideInternalTabs={true}
            />
          )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contenuto in base al tipo e fase */}
      {(tournament.current_phase as string) === 'iscrizioni' && <div className="hidden"></div>}

      {/* Eliminazione Diretta */}
      {tournament.tournament_type === 'eliminazione_diretta' &&
        (tournament.current_phase === 'eliminazione' ||
          tournament.current_phase === 'completato') && (
          <>
            {activeTab === 'bracket' &&
              (showTabBar ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-secondary">Tabellone</h2>
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Partecipanti
                        </span>
                      </button>
                      <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                        <Trophy className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Tabellone
                        </span>
                      </button>
                    </div>
                  </div>
                  <EliminationBracketView
                    isAdmin={isAdmin}
                    highlightUserId={highlightUserId}
                    canEditOwnMatches={canEditOwnMatches}
                    tournamentId={tournament.id}
                    maxParticipants={tournament.max_participants}
                    participants={participants}
                    bestOf={bestOf}
                    onMatchUpdate={loadData}
                    onBracketGenerated={() => setActiveTab('bracket')}
                  />
                </>
              ) : (
                <div className={sectionClassName}>
                  <div className={sectionHeaderClassName}>
                    <h2 className="text-base sm:text-lg font-semibold text-secondary">Tabellone</h2>
                  </div>
                  <div className="p-6">
                    <EliminationBracketView
                      isAdmin={isAdmin}
                      highlightUserId={highlightUserId}
                      canEditOwnMatches={canEditOwnMatches}
                      tournamentId={tournament.id}
                      maxParticipants={tournament.max_participants}
                      participants={participants}
                      bestOf={bestOf}
                      onMatchUpdate={loadData}
                      onBracketGenerated={() => setActiveTab('bracket')}
                    />
                  </div>
                </div>
              ))}

            {activeTab === 'overview' && (
              <>
                {/* Lista Partecipanti */}
                {participants.length > 0 &&
                  (showTabBar ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
                        {tournament.current_phase &&
                          (tournament.current_phase as string) !== 'iscrizioni' && (
                            <div className="flex gap-1 sm:gap-2">
                              <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                                <Users className="h-4 w-4" />
                                <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                                  Partecipanti
                                </span>
                              </button>
                              <button
                                onClick={() => setActiveTab('bracket')}
                                className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                              >
                                <Trophy className="h-4 w-4" />
                                <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                                  Tabellone
                                </span>
                              </button>
                            </div>
                          )}
                      </div>
                      {/* Header Row */}
                      <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                        <div className="flex items-center gap-4">
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="text-xs font-bold text-white/80 uppercase">#</div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-white/80 uppercase">Atleta</div>
                          </div>
                          {isAdmin && (
                            <div className="w-10 flex-shrink-0 flex items-center justify-center">
                              <div className="text-xs font-bold text-white/80 uppercase">
                                Azioni
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Data Rows */}
                      {participants.map((participant: any) => (
                        <ParticipantCard
                          key={participant.id}
                          participant={participant}
                          isAdmin={isAdmin}
                          currentPhase={tournament.current_phase as string}
                          openMenuId={openParticipantMenuId}
                          onMenuToggle={setOpenParticipantMenuId}
                          onRemove={handleRemoveParticipant}
                        />
                      ))}
                    </div>
                  ) : (
                    renderParticipantsSection()
                  ))}
              </>
            )}
          </>
        )}

      {/* Girone + Eliminazione */}
      {tournament.tournament_type === 'girone_eliminazione' && (
        <>
          {tournament.current_phase === 'gironi' && activeTab === 'overview' && (
            <>
              {/* Lista Partecipanti fase gironi */}
              {participants.length > 0 &&
                (showTabBar ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
                      <div className="flex gap-1 sm:gap-2">
                        <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                          <Users className="h-4 w-4" />
                          <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                            Partecipanti
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveTab('groups')}
                          className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                        >
                          <Target className="h-4 w-4" />
                          <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                            Gironi
                          </span>
                        </button>
                      </div>
                    </div>
                    {/* Header Row */}
                    <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                      <div className="flex items-center gap-4">
                        <div className="w-10 flex-shrink-0 flex items-center justify-center">
                          <div className="text-xs font-bold text-white/80 uppercase">#</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-white/80 uppercase">Atleta</div>
                        </div>
                        {isAdmin && (
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="text-xs font-bold text-white/80 uppercase">Azioni</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data Rows */}
                    {participants.map((participant: any) => (
                      <ParticipantCard
                        key={participant.id}
                        participant={participant}
                        isAdmin={isAdmin}
                        currentPhase={tournament.current_phase as string}
                        groups={groups}
                        showGroupInfo={true}
                        openMenuId={openParticipantMenuId}
                        onMenuToggle={setOpenParticipantMenuId}
                        onRemove={handleRemoveParticipant}
                      />
                    ))}
                  </div>
                ) : (
                  renderParticipantsSection({ showGroupInfo: true })
                ))}
            </>
          )}

          {(tournament.current_phase === 'gironi' ||
            tournament.current_phase === 'eliminazione' ||
            tournament.current_phase === 'completato') &&
            activeTab === 'groups' &&
            (showTabBar ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-secondary">Gironi</h2>
                  {participants.length > 0 && (
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Partecipanti
                        </span>
                      </button>
                      <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                        <Target className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Gironi
                        </span>
                      </button>
                      {(tournament.current_phase === 'eliminazione' ||
                        tournament.current_phase === 'completato') && (
                        <button
                          onClick={() => setActiveTab('bracket')}
                          className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                        >
                          <Trophy className="h-4 w-4" />
                          <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                            Tabellone
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <GroupStageView
                  highlightUserId={highlightUserId}
                  canEditOwnMatches={canEditOwnMatches}
                  tournamentId={tournament.id}
                  groups={groups}
                  participants={participants}
                  bestOf={bestOf}
                  teamsAdvancing={tournament.teams_advancing || 2}
                  onMatchUpdate={loadData}
                  isAdmin={isAdmin}
                />
              </>
            ) : (
              <div className={sectionClassName}>
                <div className={sectionHeaderClassName}>
                  <h2 className="text-base sm:text-lg font-semibold text-secondary">Gironi</h2>
                </div>
                <div className="p-6">
                  <GroupStageView
                    highlightUserId={highlightUserId}
                    canEditOwnMatches={canEditOwnMatches}
                    tournamentId={tournament.id}
                    groups={groups}
                    participants={participants}
                    bestOf={bestOf}
                    teamsAdvancing={tournament.teams_advancing || 2}
                    onMatchUpdate={loadData}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            ))}

          {(tournament.current_phase === 'eliminazione' ||
            tournament.current_phase === 'completato') &&
            activeTab === 'overview' && (
              <>
                {/* Lista Partecipanti fase eliminazione */}
                {participants.length > 0 &&
                  (showTabBar ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-secondary">Partecipanti</h2>
                        <div className="flex gap-1 sm:gap-2">
                          <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                            <Users className="h-4 w-4" />
                            <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                              Partecipanti
                            </span>
                          </button>
                          <button
                            onClick={() => setActiveTab('groups')}
                            className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                          >
                            <Target className="h-4 w-4" />
                            <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                              Gironi
                            </span>
                          </button>
                          <button
                            onClick={() => setActiveTab('bracket')}
                            className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                          >
                            <Trophy className="h-4 w-4" />
                            <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                              Tabellone
                            </span>
                          </button>
                        </div>
                      </div>
                      {/* Header Row */}
                      <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                        <div className="flex items-center gap-4">
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="text-xs font-bold text-white/80 uppercase">#</div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-white/80 uppercase">Atleta</div>
                          </div>
                          {isAdmin && (
                            <div className="w-10 flex-shrink-0 flex items-center justify-center">
                              <div className="text-xs font-bold text-white/80 uppercase">
                                Azioni
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Data Rows - Tutti i partecipanti */}
                      {participants.map((participant: any) => (
                        <ParticipantCard
                          key={participant.id}
                          participant={participant}
                          isAdmin={isAdmin}
                          currentPhase={tournament.current_phase as string}
                          groups={groups}
                          teamsAdvancing={tournament.teams_advancing || 2}
                          showGroupInfo={true}
                          showGroupPosition={true}
                          openMenuId={openParticipantMenuId}
                          onMenuToggle={setOpenParticipantMenuId}
                          onRemove={handleRemoveParticipant}
                        />
                      ))}
                    </div>
                  ) : (
                    renderParticipantsSection({
                      showGroupInfo: true,
                      showGroupPosition: true,
                      teamsAdvancing: tournament.teams_advancing || 2,
                    })
                  ))}
              </>
            )}

          {(tournament.current_phase === 'eliminazione' ||
            tournament.current_phase === 'completato') &&
            activeTab === 'bracket' &&
            (showTabBar ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-secondary">Tabellone</h2>
                  {participants.length > 0 && (
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Partecipanti
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('groups')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Target className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Gironi
                        </span>
                      </button>
                      <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                        <Trophy className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Tabellone
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <EliminationBracketView
                  isAdmin={isAdmin}
                  highlightUserId={highlightUserId}
                  canEditOwnMatches={canEditOwnMatches}
                  tournamentId={tournament.id}
                  maxParticipants={(tournament.num_groups || 0) * (tournament.teams_advancing || 0)}
                  participants={participants.filter(
                    (p) =>
                      p.group_position && p.group_position <= (tournament.teams_advancing || 0),
                  )}
                  bestOf={bestOf}
                  onMatchUpdate={loadData}
                />
              </div>
            ) : (
              <div className={sectionClassName}>
                <div className={sectionHeaderClassName}>
                  <h2 className="text-base sm:text-lg font-semibold text-secondary">
                    Tabellone Eliminazione
                  </h2>
                </div>
                <div className="p-6">
                  <EliminationBracketView
                    isAdmin={isAdmin}
                    highlightUserId={highlightUserId}
                    canEditOwnMatches={canEditOwnMatches}
                    tournamentId={tournament.id}
                    maxParticipants={
                      (tournament.num_groups || 0) * (tournament.teams_advancing || 0)
                    }
                    participants={participants.filter(
                      (p) =>
                        p.group_position && p.group_position <= (tournament.teams_advancing || 0),
                    )}
                    bestOf={bestOf}
                    onMatchUpdate={loadData}
                  />
                </div>
              </div>
            ))}
        </>
      )}

      {/* Campionato */}
      {tournament.tournament_type === 'campionato' && (
        <>
          {activeTab === 'overview' && (
            <>
              {/* Lista Partecipanti */}
              {participants.length > 0 &&
                (showTabBar ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
                      {tournament.current_phase &&
                        (tournament.current_phase as string) !== 'iscrizioni' && (
                          <div className="flex gap-1 sm:gap-2">
                            <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                              <Users className="h-4 w-4" />
                              <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                                Partecipanti
                              </span>
                            </button>
                            <button
                              onClick={() => setActiveTab('calendar')}
                              className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                                Calendario
                              </span>
                            </button>
                            <button
                              onClick={() => setActiveTab('standings')}
                              className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                            >
                              <Trophy className="h-4 w-4" />
                              <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                                Classifica
                              </span>
                            </button>
                          </div>
                        )}
                    </div>
                    {/* Header Row */}
                    <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                      <div className="flex items-center gap-4">
                        <div className="w-10 flex-shrink-0 flex items-center justify-center">
                          <div className="text-xs font-bold text-white/80 uppercase">#</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-white/80 uppercase">Atleta</div>
                        </div>
                        {isAdmin && (
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="text-xs font-bold text-white/80 uppercase">Azioni</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data Rows */}
                    {participants.map((participant: any) => (
                      <ParticipantCard
                        key={participant.id}
                        participant={participant}
                        isAdmin={isAdmin}
                        currentPhase={tournament.current_phase as string}
                        openMenuId={openParticipantMenuId}
                        onMenuToggle={setOpenParticipantMenuId}
                        onRemove={handleRemoveParticipant}
                      />
                    ))}
                  </div>
                ) : (
                  renderParticipantsSection()
                ))}
            </>
          )}

          {activeTab === 'standings' &&
            (showTabBar ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-secondary">Classifica Campionato</h2>
                  {participants.length > 0 && (
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Partecipanti
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('calendar')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Calendario
                        </span>
                      </button>
                      <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                        <Trophy className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Classifica
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <ChampionshipStandingsView
                  highlightUserId={highlightUserId}
                  canEditOwnMatches={canEditOwnMatches}
                  tournamentId={tournament.id}
                  participants={participants}
                  bestOf={bestOf}
                  onMatchUpdate={loadData}
                  isAdmin={isAdmin}
                  defaultView="standings"
                  hideInternalTabs={true}
                />
              </>
            ) : (
              <ChampionshipStandingsView
                highlightUserId={highlightUserId}
                canEditOwnMatches={canEditOwnMatches}
                tournamentId={tournament.id}
                participants={participants}
                bestOf={bestOf}
                onMatchUpdate={loadData}
                isAdmin={isAdmin}
                defaultView="standings"
                hideInternalTabs={true}
              />
            ))}

          {activeTab === 'calendar' &&
            (showTabBar ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-secondary">Calendario Partite</h2>
                  {participants.length > 0 && (
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Partecipanti
                        </span>
                      </button>
                      <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Calendario
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('standings')}
                        className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Trophy className="h-4 w-4" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                          Classifica
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <ChampionshipStandingsView
                  highlightUserId={highlightUserId}
                  canEditOwnMatches={canEditOwnMatches}
                  tournamentId={tournament.id}
                  participants={participants}
                  bestOf={bestOf}
                  onMatchUpdate={loadData}
                  isAdmin={isAdmin}
                  defaultView="calendar"
                  hideInternalTabs={true}
                />
              </>
            ) : (
              <ChampionshipStandingsView
                highlightUserId={highlightUserId}
                canEditOwnMatches={canEditOwnMatches}
                tournamentId={tournament.id}
                participants={participants}
                bestOf={bestOf}
                onMatchUpdate={loadData}
                isAdmin={isAdmin}
                defaultView="calendar"
                hideInternalTabs={true}
              />
            ))}
        </>
      )}

      {/* Lista Partecipanti - Solo per fase iscrizioni di tornei eliminazione_diretta e girone_eliminazione */}
      {participants.length > 0 &&
        (tournament.current_phase as string) === 'iscrizioni' &&
        tournament.tournament_type !== 'campionato' &&
        (showTabBar ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
              <div className="flex gap-1 sm:gap-2">
                {/* Tab Partecipanti - sempre per primo */}
                <button className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-secondary bg-secondary text-white">
                  <Users className="h-4 w-4" />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                    Partecipanti
                  </span>
                </button>

                {/* Tab specifici per tipo torneo */}
                {tournament.tournament_type === 'eliminazione_diretta' &&
                  tournament.current_phase !== 'iscrizioni' && (
                    <button
                      onClick={() => setActiveTab('bracket')}
                      className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Trophy className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                        Tabellone
                      </span>
                    </button>
                  )}
                {tournament.tournament_type === 'girone_eliminazione' &&
                  tournament.current_phase === 'gironi' && (
                    <button
                      onClick={() => setActiveTab('groups')}
                      className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Target className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                        Gironi
                      </span>
                    </button>
                  )}
                {tournament.tournament_type === 'girone_eliminazione' &&
                  tournament.current_phase === 'eliminazione' && (
                    <button
                      onClick={() => setActiveTab('bracket')}
                      className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 border border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Trophy className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                        Tabellone
                      </span>
                    </button>
                  )}
              </div>
            </div>
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="flex items-center gap-4">
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-white/80 uppercase">#</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white/80 uppercase">Atleta</div>
                </div>
                {isAdmin && (
                  <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    <div className="text-xs font-bold text-white/80 uppercase">Azioni</div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Rows */}
            {participants.map((participant: any) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                isAdmin={isAdmin}
                currentPhase={tournament.current_phase as string}
                openMenuId={openParticipantMenuId}
                onMenuToggle={setOpenParticipantMenuId}
                onRemove={handleRemoveParticipant}
              />
            ))}
          </div>
        ) : (
          renderParticipantsSection()
        ))}
    </div>
  );
}
