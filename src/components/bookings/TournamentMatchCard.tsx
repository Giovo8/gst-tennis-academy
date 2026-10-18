"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Target, Trophy, Users } from "lucide-react";
import SearchableSelect from "@/components/bookings/SearchableSelect";
import { useDragScroll } from "@/components/admin/hooks/useDragScroll";
import { useTournamentMatches } from "@/lib/hooks/useBookableTournaments";
import {
  getDefaultRoundKey,
  groupTournamentMatchesByRound,
  type BookableTournament,
  type BookableTournamentMatch,
  type TournamentRound,
} from "@/lib/bookings/tournamentBookings";

interface TournamentMatchCardProps {
  tournaments: BookableTournament[];
  selectedMatchId: string | null;
  onSelectMatch: (match: BookableTournamentMatch | null) => void;
  /** Modifica: torneo della partita già prenotata, da aprire al caricamento. */
  initialTournamentId?: string | null;
  /** Modifica: la partita prenotata da questa stessa prenotazione resta selezionabile. */
  currentBookingId?: string | null;
}

const rowClassName = "flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8";
const labelClassName = "sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0";

/** Stesse icone della lista tornei admin: eliminazione = coppa, girone = bersaglio, campionato = giocatori. */
function getTournamentTypeIcon(tournamentType: string | null | undefined) {
  if (tournamentType === "girone_eliminazione") return Target;
  if (tournamentType === "campionato") return Users;
  return Trophy;
}

/** Nel campionato la giornata si mostra col solo numero; gironi/turni mantengono il nome. */
function getRoundButtonLabel(round: TournamentRound, isChampionship: boolean): string {
  const roundNumber = round.matches[0]?.round_number;
  return isChampionship && roundNumber ? String(roundNumber) : round.label;
}

/**
 * Selezione della partita per le prenotazioni di tipo "torneo":
 * torneo (menu a tendina) → giornata/turno → partita. I partecipanti
 * della prenotazione sono i due giocatori della partita scelta.
 */
export default function TournamentMatchCard({
  tournaments,
  selectedMatchId,
  onSelectMatch,
  initialTournamentId,
  currentBookingId,
}: TournamentMatchCardProps) {
  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useDragScroll();
  // Torneo scelto dall'utente; finché non sceglie vale quello iniziale (modifica) o il primo.
  const [pickedTournamentId, setTournamentId] = useState<string | null>(null);
  const tournamentId = pickedTournamentId ?? initialTournamentId ?? tournaments[0]?.id ?? "";
  const tournament = tournaments.find((t) => t.id === tournamentId) ?? tournaments[0];
  const isChampionship = tournament?.tournament_type === "campionato";
  const TypeIcon = getTournamentTypeIcon(tournament?.tournament_type);

  // Le partite si caricano solo per il torneo selezionato (e restano in cache al cambio torneo).
  const { matches: loadedMatches, loading: matchesLoading, failed: matchesFailed } = useTournamentMatches(tournament?.id);
  const matches = useMemo(
    () =>
      currentBookingId
        ? loadedMatches.map((match) => (match.booking?.id === currentBookingId ? { ...match, booking: null } : match))
        : loadedMatches,
    [loadedMatches, currentBookingId]
  );
  const rounds = useMemo(() => groupTournamentMatchesByRound(matches), [matches]);
  const selectedMatch = selectedMatchId ? matches.find((match) => match.id === selectedMatchId) : undefined;

  // Giornata scelta dall'utente (valida solo per il torneo in cui l'ha scelta); altrimenti
  // quella della partita selezionata (modifica) o la prima con partite da prenotare.
  const [pickedRound, setPickedRound] = useState<{ tournamentId: string; key: string } | null>(null);
  const round =
    (pickedRound?.tournamentId === tournamentId && rounds.find((r) => r.key === pickedRound.key)) ||
    (selectedMatch && rounds.find((r) => r.matches.includes(selectedMatch))) ||
    rounds.find((r) => r.key === getDefaultRoundKey(rounds));
  const setRoundKey = (key: string) => setPickedRound({ tournamentId, key });

  // Modifica: il genitore conosce solo l'id della partita; all'arrivo delle partite
  // gli restituisce i dati completi (giocatori) della selezione.
  const onSelectMatchRef = useRef(onSelectMatch);
  useEffect(() => {
    onSelectMatchRef.current = onSelectMatch;
  });
  useEffect(() => {
    if (selectedMatch) onSelectMatchRef.current(selectedMatch);
  }, [selectedMatch]);

  return (
    <div className="bg-white border border-black/10 rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-black/10 bg-gray-50">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Partita del torneo</h2>
      </div>
      <div className="space-y-6 p-4 sm:p-6">
        {tournaments.length === 0 ? (
          <p className="text-sm text-secondary/60">
            Nessun torneo in corso: la partita non può essere cambiata, puoi modificare data, campo e orario.
          </p>
        ) : (
        <>
        <div className={`${rowClassName} pb-6 border-b border-gray-200`}>
          <label className={labelClassName}>Torneo</label>
          <div className="flex-1">
            <SearchableSelect
              value={tournament?.id ?? ""}
              onChange={(value) => {
                setTournamentId(value);
                onSelectMatch(null);
              }}
              options={tournaments.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Seleziona torneo"
              searchPlaceholder="Cerca torneo..."
              triggerClassName="w-full rounded-lg border border-black/10 bg-white px-4 py-2 text-sm text-left text-secondary flex items-center justify-between focus:outline-none focus-visible:ring-0 focus-visible:border-black/10"
              dropdownClassName="rounded-lg border border-black/10 bg-white"
            />
          </div>
        </div>

        {matchesLoading ? (
          <div className="flex items-center gap-2 text-secondary/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Caricamento partite...</span>
          </div>
        ) : matchesFailed ? (
          <p className="text-sm text-red-600">Impossibile caricare le partite del torneo. Riprova più tardi.</p>
        ) : rounds.length === 0 ? (
          <p className="text-sm text-secondary/60">
            Nessuna partita da prenotare in questo torneo al momento.
          </p>
        ) : (
          <>
            <div className={`${rowClassName} pb-6 border-b border-gray-200`}>
              <label className={labelClassName}>{isChampionship ? "Giornata" : "Turno"}</label>
              <div
                ref={scrollRef}
                className="flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-hide cursor-grab"
                style={{ WebkitOverflowScrolling: "touch" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {rounds.map((r) => {
                  const label = getRoundButtonLabel(r, isChampionship);
                  const isActive = r.key === round?.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      title={r.label}
                      onClick={() => {
                        setRoundKey(r.key);
                        onSelectMatch(null);
                      }}
                      className={`h-10 flex-1 min-w-10 px-3 text-sm font-medium text-center rounded-lg border transition-all ${
                        isActive
                          ? "bg-[#023047] text-white border-[#023047]"
                          : "bg-secondary text-white border-secondary hover:opacity-90"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={rowClassName}>
              <label className={labelClassName}>Partita</label>
              <ul className="flex-1 flex flex-col gap-2">
                {round?.matches.filter((match) => !match.booking).map((match) => {
                  const isSelected = match.id === selectedMatchId;

                  return (
                    <li key={match.id}>
                      <button
                        type="button"
                        onClick={() => onSelectMatch(isSelected ? null : match)}
                        // Selezionata: stesso colore delle lezioni private (#023047)
                        style={isSelected ? { background: "#023047" } : undefined}
                        className={`w-full text-left py-3 px-3 rounded-lg transition flex items-center gap-4 text-sm text-white ${
                          isSelected ? "" : "bg-secondary hover:opacity-90"
                        }`}
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <TypeIcon className="h-5 w-5 text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{match.player1.full_name}</p>
                          <p className="font-semibold text-white text-sm truncate mt-0.5">{match.player2.full_name}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}
