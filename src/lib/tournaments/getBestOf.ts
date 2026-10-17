/**
 * Numero di set dell'incontro ("al meglio di N").
 *
 * La fonte di verità è `match_format` (best_of_1 | best_of_3 | best_of_5), scelto in
 * creazione torneo. La colonna `best_of` non viene mai valorizzata dalla creazione
 * (default 3, vincolo DB 3|5) ed è usata solo come fallback per tornei legacy.
 */
export function getBestOf(tournament?: { match_format?: string | null; best_of?: number | null } | null): number {
  const match = tournament?.match_format?.match(/^best_of_(\d+)$/);
  const fromFormat = match ? Number(match[1]) : NaN;
  if ([1, 3, 5].includes(fromFormat)) return fromFormat;
  if (tournament?.best_of && [1, 3, 5].includes(tournament.best_of)) return tournament.best_of;
  return 3;
}
