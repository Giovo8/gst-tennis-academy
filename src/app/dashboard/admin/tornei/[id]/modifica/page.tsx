'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { toastError } from '@/lib/toast';
import ParticipantsCard from '@/components/bookings/ParticipantsCard';
import type { Athlete, SelectedAthlete } from '@/components/bookings/AthletesSelector';
import { getBestOf } from '@/lib/tournaments/getBestOf';
import {
  getParticipantsWithPlayedMatches,
  isMatchPlayed,
  MATCH_PLAYED_COLUMNS,
} from '@/lib/tournaments/matchPlayed';
import type { TournamentType } from '@/lib/tournaments/tournamentStructure';

interface FormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  category: string;
  match_format: string;
  tournament_type: TournamentType;
  max_participants: number;
  num_groups: number;
  teams_per_group: number;
  teams_advancing: number;
}

interface Participant {
  id: string;
  user_id: string | null;
  name: string;
  /** Ha già giocato almeno una partita: non rimovibile. */
  hasPlayed: boolean;
}

/** Riga di GET /api/tournament_participants. */
interface ParticipantRow {
  id: string;
  user_id: string | null;
  player_name?: string | null;
  profiles?: { full_name?: string | null } | null;
}

const TOURNAMENT_TYPES: { id: TournamentType; name: string }[] = [
  { id: 'eliminazione_diretta', name: 'Eliminazione Diretta' },
  { id: 'girone_eliminazione', name: 'Girone + Eliminazione' },
  { id: 'campionato', name: 'Campionato' },
];
const ELIMINATION_SIZES = [4, 8, 16, 32, 64];
const CATEGORIES = ['Open', 'Under 18', 'Under 16', 'Under 14', 'Veterani'];

const rowClassName =
  'flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200';
const labelClassName = 'sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0';
const inputClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10 disabled:bg-gray-50 disabled:text-secondary/60';

/** Data del DB (date o timestamp) nel formato dell'input: YYYY-MM-DD. */
const toInputDate = (value?: string | null) => (value ? String(value).slice(0, 10) : '');

/**
 * Modifica di una competizione: dati del torneo e, nel campionato in corso, partecipanti
 * (aggiungi dalla barra di ricerca, rimuovi con la X). I campi che toccherebbero partite giocate o calendario
 * sono bloccati qui e rifiutati anche dall'API (PATCH /api/tournaments/[id]).
 */
export default function ModificaTorneoPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingParticipants, setUpdatingParticipants] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [originalTitle, setOriginalTitle] = useState('');
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [hasPlayedMatches, setHasPlayedMatches] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [formData, setFormData] = useState<FormData | null>(null);

  const detailHref = `/dashboard/admin/tornei/${id}`;
  const started = Boolean(currentPhase) && currentPhase !== 'iscrizioni';
  const isConcluded = status.toLowerCase() === 'concluso';
  const isChampionship = formData?.tournament_type === 'campionato';
  const canManageParticipants = isChampionship && started && !isConcluded;

  // Ricaricamento dopo salvataggio o rimozione, senza spinner
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function load() {
      try {
        const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
          fetch(`/api/tournaments?id=${id}`).then((r) => r.json()),
          fetch(`/api/tournament_participants?tournament_id=${id}`).then((r) => r.json()),
          supabase
            .from('tournament_matches')
            .select(`player1_id, player2_id, ${MATCH_PLAYED_COLUMNS}`)
            .eq('tournament_id', id),
        ]);

        const t = tournamentRes?.tournament;
        if (!t) {
          setNotFound(true);
          return;
        }
        setOriginalTitle(t.title || '');
        setCurrentPhase(t.current_phase ?? null);
        setStatus(String(t.status || ''));
        setFormData({
          title: t.title || '',
          description: t.description || '',
          start_date: toInputDate(t.start_date),
          end_date: toInputDate(t.end_date),
          category: t.category || 'Open',
          match_format: `best_of_${getBestOf(t)}`,
          tournament_type: t.tournament_type,
          max_participants: t.max_participants ?? 0,
          num_groups: t.num_groups || 4,
          teams_per_group: t.teams_per_group || 4,
          teams_advancing: t.teams_advancing || 2,
        });

        const matches = matchesRes.data || [];
        const played = getParticipantsWithPlayedMatches(matches);
        setHasPlayedMatches(matches.some((m) => isMatchPlayed(m)));
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
      } catch (error) {
        console.error('Error loading tournament edit page:', error);
        toast.error('Caricamento non riuscito');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, reloadKey]);

  // Atleti iscrivibili (barra di ricerca dei partecipanti): solo se si gestiscono i partecipanti
  useEffect(() => {
    if (!canManageParticipants) return;
    async function loadAthletes() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setAthletes((json?.users || []).filter((u: Athlete) => u.role === 'atleta'));
    }
    loadAthletes();
  }, [canManageParticipants]);

  const setField = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));

  // Stessi valori iniziali della creazione al cambio tipo
  const handleTypeSelect = (type: TournamentType) =>
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, tournament_type: type };
      if (type === 'eliminazione_diretta') updated.max_participants = 16;
      else if (type === 'girone_eliminazione') {
        updated.num_groups = 4;
        updated.teams_per_group = 4;
        updated.teams_advancing = 2;
        updated.max_participants = 16;
      } else updated.max_participants = 12;
      return updated;
    });

  const handleGroupConfigChange = (
    field: 'num_groups' | 'teams_per_group' | 'teams_advancing',
    value: number,
  ) =>
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      updated.max_participants = updated.num_groups * updated.teams_per_group;
      return updated;
    });

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) toast.error('Sessione scaduta, accedi di nuovo');
    return session?.access_token ?? null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;

      const isGroups = formData.tournament_type === 'girone_eliminazione';
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          start_date: formData.start_date || new Date().toISOString().split('T')[0],
          end_date: formData.end_date || null,
          category: formData.category,
          match_format: formData.match_format,
          tournament_type: formData.tournament_type,
          max_participants: formData.max_participants,
          num_groups: isGroups ? formData.num_groups : null,
          teams_per_group: isGroups ? formData.teams_per_group : null,
          teams_advancing: isGroups ? formData.teams_advancing : null,
        }),
      });

      if (res.ok) {
        toast.success('Torneo aggiornato');
        reload();
      } else {
        const data = await res.json().catch(() => null);
        toastError(data?.error, 'Modifica non riuscita');
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      toast.error('Modifica non riuscita');
    } finally {
      setSaving(false);
    }
  };

  const handleAddParticipant = async (athlete: SelectedAthlete) => {
    const matchesCount = participants.length;
    if (
      !confirm(
        `Aggiungere ${athlete.fullName} al campionato? Verranno create ${matchesCount} partite, una contro ogni partecipante. Le partite già in calendario non cambiano.`,
      )
    )
      return;

    setUpdatingParticipants(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/tournaments/${id}/add-participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // Ospite senza account: solo il nome
        body: JSON.stringify(
          athlete.userId ? { user_id: athlete.userId } : { player_name: athlete.fullName },
        ),
      });
      if (res.ok) {
        toast.success(athlete.userId ? 'Atleta aggiunto' : 'Ospite aggiunto');
        reload();
      } else {
        const data = await res.json().catch(() => null);
        toastError(data?.error, 'Aggiunta non riuscita');
      }
    } catch (error) {
      console.error('Error adding participant:', error);
      toast.error('Aggiunta non riuscita');
    } finally {
      setUpdatingParticipants(false);
    }
  };

  // L'indice è quello di selectedAthletes, costruito nello stesso ordine di participants
  const handleRemoveParticipant = async (index: number) => {
    const participant = participants[index];
    if (!participant) return;
    if (
      !confirm(`Rimuovere ${participant.name} dal campionato? Le sue partite verranno eliminate.`)
    )
      return;

    setUpdatingParticipants(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/tournament_participants?id=${participant.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Atleta rimosso');
        reload();
      } else {
        const data = await res.json().catch(() => null);
        toastError(data?.error, 'Rimozione non riuscita');
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Rimozione non riuscita');
    } finally {
      setUpdatingParticipants(false);
    }
  };

  const enrolledUserIds = new Set(participants.map((p) => p.user_id).filter(Boolean));
  const availableAthletes = athletes.filter((a) => !enrolledUserIds.has(a.id));
  const selectedAthletes: SelectedAthlete[] = participants.map((p) => ({
    userId: p.user_id ?? undefined,
    fullName: p.name,
    isRegistered: Boolean(p.user_id),
  }));
  const playedIndexes = participants.flatMap((p, index) => (p.hasPlayed ? [index] : []));

  const typeName = TOURNAMENT_TYPES.find((t) => t.id === formData?.tournament_type)?.name ?? '';
  const categories =
    formData && !CATEGORIES.includes(formData.category)
      ? [formData.category, ...CATEGORIES]
      : CATEGORIES;

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
            {originalTitle || 'Dettagli Torneo'}
          </Link>
          {' › '}
          <span>Modifica</span>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Modifica competizione</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento...</p>
        </div>
      ) : notFound || !formData ? (
        <div className="page-card">
          <div className="p-6">
            <p className="text-sm text-secondary/70">Torneo non trovato.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Dettagli */}
          <form id="modifica-form" onSubmit={handleSave}>
            <div className="page-card">
              <div className="page-card-header">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">
                  Dettagli torneo
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Tipo competizione */}
                <div className={rowClassName}>
                  <label className={labelClassName}>Tipo competizione</label>
                  <div className="flex-1">
                    {started ? (
                      <p className="sm:pt-2.5 text-sm text-secondary">{typeName}</p>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
                        {TOURNAMENT_TYPES.map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => handleTypeSelect(type.id)}
                            className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                              formData.tournament_type === type.id
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {type.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Partecipanti */}
                {started ? (
                  <div className={rowClassName}>
                    <label className={labelClassName}>Numero partecipanti</label>
                    <div className="flex-1">
                      <p className="sm:pt-2.5 text-sm text-secondary">
                        {formData.tournament_type === 'girone_eliminazione'
                          ? `${formData.num_groups} gironi da ${formData.teams_per_group}, ${formData.teams_advancing} qualificati per girone`
                          : formData.max_participants}
                      </p>
                    </div>
                  </div>
                ) : formData.tournament_type === 'eliminazione_diretta' ? (
                  <div className={rowClassName}>
                    <label className={labelClassName}>Numero partecipanti *</label>
                    <div className="flex-1 flex flex-row gap-2 sm:gap-3 flex-wrap">
                      {ELIMINATION_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setField('max_participants', size)}
                          className={`px-5 py-2 text-sm rounded-lg border transition-all min-w-[60px] ${
                            formData.max_participants === size
                              ? 'bg-secondary text-white border-secondary'
                              : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : formData.tournament_type === 'girone_eliminazione' ? (
                  <>
                    {(
                      [
                        ['num_groups', 'Numero gironi *', 1, 8],
                        ['teams_per_group', 'Squadre per girone *', 3, 8],
                        [
                          'teams_advancing',
                          'Qualificati per girone *',
                          1,
                          formData.teams_per_group - 1,
                        ],
                      ] as const
                    ).map(([field, label, min, max]) => (
                      <div key={field} className={rowClassName}>
                        <label className={labelClassName}>{label}</label>
                        <div className="flex-1">
                          <input
                            type="number"
                            min={min}
                            max={max}
                            value={formData[field]}
                            onChange={(e) => handleGroupConfigChange(field, Number(e.target.value))}
                            className={`${inputClassName} sm:max-w-xs`}
                          />
                        </div>
                      </div>
                    ))}
                    <div className={rowClassName}>
                      <label className={labelClassName}>Partecipanti totali</label>
                      <div className="flex-1">
                        <input
                          type="number"
                          value={formData.max_participants}
                          readOnly
                          className="w-full sm:max-w-xs rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={rowClassName}>
                    <label className={labelClassName}>Numero partecipanti *</label>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="3"
                        max="30"
                        value={formData.max_participants}
                        onChange={(e) => setField('max_participants', Number(e.target.value))}
                        className={`${inputClassName} sm:max-w-xs`}
                      />
                    </div>
                  </div>
                )}

                {/* Nome */}
                <div className={rowClassName}>
                  <label className={labelClassName}>Nome torneo *</label>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setField('title', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>

                {/* Descrizione */}
                <div className={rowClassName}>
                  <label className={labelClassName}>Descrizione</label>
                  <div className="flex-1">
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Descrivi il torneo..."
                      className={inputClassName}
                    />
                  </div>
                </div>

                {/* Date */}
                <div className={rowClassName}>
                  <label className={labelClassName}>Data inizio</label>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setField('start_date', e.target.value)}
                      className={`${inputClassName} sm:max-w-xs`}
                    />
                  </div>
                </div>

                <div className={rowClassName}>
                  <label className={labelClassName}>Data fine</label>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setField('end_date', e.target.value)}
                      className={`${inputClassName} sm:max-w-xs`}
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div className={rowClassName}>
                  <label className={labelClassName}>Categoria</label>
                  <div className="flex-1">
                    <select
                      value={formData.category}
                      onChange={(e) => setField('category', e.target.value)}
                      className={`${inputClassName} sm:max-w-xs`}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Formato partita */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                  <label className={labelClassName}>Formato partita</label>
                  <div className="flex-1">
                    <select
                      value={formData.match_format}
                      onChange={(e) => setField('match_format', e.target.value)}
                      disabled={hasPlayedMatches}
                      className={`${inputClassName} sm:max-w-xs`}
                    >
                      <option value="best_of_3">Al meglio di 3 set</option>
                      <option value="best_of_5">Al meglio di 5 set</option>
                      <option value="best_of_1">1 set unico</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Partecipanti: solo campionato in corso. Chi ha già giocato non ha la X. */}
          {canManageParticipants && (
            <div className={updatingParticipants ? 'pointer-events-none opacity-60' : ''}>
              <ParticipantsCard
                athletes={availableAthletes}
                selectedAthletes={selectedAthletes}
                onAthleteAdd={handleAddParticipant}
                onAthleteRemove={handleRemoveParticipant}
                nonRemovableIndexes={playedIndexes}
                guestNameOnly
                participantToneByIndex={(index) =>
                  participants[index]?.hasPlayed ? 'dark' : 'secondary'
                }
                maxAthletes={null}
              />
            </div>
          )}

          <button
            type="submit"
            form="modifica-form"
            disabled={saving}
            className="w-full px-6 py-3 text-white bg-secondary hover:opacity-90 disabled:opacity-50 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Salva modifiche
          </button>
        </>
      )}
    </div>
  );
}
