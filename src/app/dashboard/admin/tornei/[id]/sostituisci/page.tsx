'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { toastError } from '@/lib/toast';
import { getAvatarUrl } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import {
  getParticipantsWithPlayedMatches,
  MATCH_PLAYED_COLUMNS,
} from '@/lib/tournaments/matchPlayed';

interface Participant {
  id: string;
  user_id: string | null;
  name: string;
  /** Ha già giocato almeno una partita: non sostituibile. */
  hasPlayed: boolean;
}

/** Riga di GET /api/tournament_participants. */
interface ParticipantRow {
  id: string;
  user_id: string | null;
  player_name?: string | null;
  profiles?: { full_name?: string | null } | null;
}

interface Athlete {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

/**
 * Campionato in corso: sostituisce un iscritto che non ha ancora giocato con un altro atleta.
 * Il nuovo atleta eredita le partite del calendario (stessa riga partecipante).
 */
export default function SostituisciAtletaPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tournamentTitle, setTournamentTitle] = useState('');
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const detailHref = `/dashboard/admin/tornei/${id}`;

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const [tournamentRes, participantsRes, matchesRes, usersRes] = await Promise.all([
          fetch(`/api/tournaments?id=${id}`).then((r) => r.json()),
          fetch(`/api/tournament_participants?tournament_id=${id}`).then((r) => r.json()),
          supabase
            .from('tournament_matches')
            .select(`player1_id, player2_id, ${MATCH_PLAYED_COLUMNS}`)
            .eq('tournament_id', id),
          token
            ? fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
                r.ok ? r.json() : { users: [] },
              )
            : Promise.resolve({ users: [] }),
        ]);

        const tournament = tournamentRes?.tournament;
        setTournamentTitle(tournament?.title || '');
        if (!tournament || tournament.tournament_type !== 'campionato') {
          setBlockedReason('La sostituzione è disponibile solo nei campionati.');
        } else if (String(tournament.status).toLowerCase() === 'concluso') {
          setBlockedReason('Il campionato è concluso.');
        }

        const played = getParticipantsWithPlayedMatches(matchesRes.data || []);
        setParticipants(
          (participantsRes?.participants || [])
            .map((p: ParticipantRow) => ({
              id: p.id,
              user_id: p.user_id ?? null,
              name: p.profiles?.full_name || p.player_name || 'Atleta',
              hasPlayed: played.has(p.id),
            }))
            .sort((a: Participant, b: Participant) => a.name.localeCompare(b.name)),
        );
        setAthletes((usersRes?.users || []).filter((u: Athlete) => u.role === 'atleta'));
      } catch (error) {
        console.error('Error loading replace page:', error);
        toast.error('Caricamento non riuscito');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const replaceableParticipants = participants.filter((p) => !p.hasPlayed);
  const selectedParticipant = participants.find((p) => p.id === selectedParticipantId) || null;
  const enrolledUserIds = new Set(participants.map((p) => p.user_id).filter(Boolean));
  const query = searchQuery.trim().toLowerCase();
  const availableAthletes = athletes.filter(
    (a) =>
      !enrolledUserIds.has(a.id) &&
      (query === '' ||
        a.full_name?.toLowerCase().includes(query) ||
        a.email?.toLowerCase().includes(query)),
  );

  const handleReplace = async () => {
    if (!selectedParticipantId || !selectedUserId) return;

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessione scaduta, accedi di nuovo');
        return;
      }

      const res = await fetch('/api/tournament_participants', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: selectedParticipantId, user_id: selectedUserId }),
      });

      if (res.ok) {
        toast.success('Atleta sostituito');
        router.push(detailHref);
      } else {
        const data = await res.json().catch(() => null);
        toastError(data?.error, 'Sostituzione non riuscita');
      }
    } catch (error) {
      console.error('Error replacing participant:', error);
      toast.error('Sostituzione non riuscita');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/admin/tornei"
            className="hover:text-secondary/80 transition-colors"
          >
            Gestione Competizioni
          </Link>
          {' › '}
          <Link href={detailHref} className="hover:text-secondary/80 transition-colors">
            {tournamentTitle || 'Dettagli Torneo'}
          </Link>
          {' › '}
          <span>Sostituisci Atleta</span>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Sostituisci atleta</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento...</p>
        </div>
      ) : blockedReason ? (
        <div className="page-card">
          <div className="p-6">
            <p className="text-sm text-secondary/70">{blockedReason}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Iscritto da sostituire */}
          <div className="page-card">
            <div className="page-card-header">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">
                Atleta da sostituire
              </h2>
            </div>
            <div className="p-6">
              {replaceableParticipants.length === 0 ? (
                <p className="text-center py-8 text-secondary/60">Nessun atleta sostituibile</p>
              ) : (
                <div className="space-y-2">
                  {replaceableParticipants.map((p) => {
                    const isSelected = selectedParticipantId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedParticipantId(p.id)}
                        className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-[#023047] bg-[#023047]'
                            : 'border-secondary bg-secondary hover:opacity-90'
                        }`}
                      >
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white/10 text-white flex items-center justify-center text-sm font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="flex-1 min-w-0 font-semibold text-white text-sm truncate">
                          {p.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Nuovo atleta */}
          {selectedParticipant && (
            <div className="page-card">
              <div className="page-card-header">
                <h2 className="text-base sm:text-lg font-semibold text-secondary truncate">
                  Al posto di {selectedParticipant.name}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                  <input
                    type="text"
                    placeholder="Cerca il nuovo atleta per nome o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-black/10 bg-white pl-10 pr-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                  />
                </div>

                {availableAthletes.length === 0 ? (
                  <p className="text-center py-8 text-secondary/60">Nessun atleta disponibile</p>
                ) : (
                  <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                    {availableAthletes.map((athlete) => {
                      const isSelected = selectedUserId === athlete.id;
                      const fullName = athlete.full_name || 'Senza nome';
                      const avatarUrl = athlete.avatar_url
                        ? getAvatarUrl(athlete.avatar_url)
                        : null;

                      return (
                        <button
                          key={athlete.id}
                          type="button"
                          onClick={() => setSelectedUserId(athlete.id)}
                          className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                            isSelected
                              ? 'border-[#023047] bg-[#023047]'
                              : 'border-secondary bg-secondary hover:opacity-90'
                          }`}
                        >
                          <div className="w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-lg bg-white/10 text-white flex items-center justify-center text-sm font-bold overflow-hidden relative">
                            {avatarUrl ? (
                              <Avatar src={avatarUrl} name={fullName} fill />
                            ) : (
                              <span>{fullName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <p className="flex-1 min-w-0 font-semibold text-white text-sm truncate">
                            {fullName}
                          </p>
                          <p className="flex-shrink-0 hidden sm:block max-w-[200px] text-xs text-white/70 truncate">
                            {athlete.email}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedParticipantId && selectedUserId && (
            <button
              onClick={handleReplace}
              disabled={saving}
              className="w-full px-6 py-3 text-white bg-secondary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              Sostituisci
            </button>
          )}
        </>
      )}
    </div>
  );
}
