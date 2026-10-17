/**
 * @jest-environment node
 */

import {
  canUserBookTournamentMatch,
  getDefaultRoundKey,
  groupTournamentMatchesByRound,
  isMatchOpenForBooking,
  isTournamentInProgress,
  type BookableTournamentMatch,
} from "@/lib/bookings/tournamentBookings";
import { createBookingSchema } from "@/lib/validation/schemas";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_MATCH = "33333333-3333-4333-8333-333333333333";

function makeMatch(overrides: Partial<BookableTournamentMatch> = {}): BookableTournamentMatch {
  return {
    id: "m1",
    tournament_id: "t1",
    phase: "gironi",
    round_name: "Giornata 1",
    round_number: 1,
    match_number: 1,
    player1: { participant_id: "p1", user_id: UUID_A, full_name: "Mario Rossi", email: null },
    player2: { participant_id: "p2", user_id: UUID_B, full_name: "Luca Bianchi", email: null },
    booking: null,
    ...overrides,
  };
}

describe("isTournamentInProgress", () => {
  it("accetta le varianti di maiuscole usate dai flussi torneo", () => {
    expect(isTournamentInProgress("In Corso")).toBe(true);
    expect(isTournamentInProgress("In corso")).toBe(true);
  });

  it("esclude tornei aperti, conclusi o senza stato", () => {
    expect(isTournamentInProgress("Aperto")).toBe(false);
    expect(isTournamentInProgress("Concluso")).toBe(false);
    expect(isTournamentInProgress(null)).toBe(false);
  });
});

describe("isMatchOpenForBooking", () => {
  it("richiede entrambi i giocatori", () => {
    expect(isMatchOpenForBooking({ player1_id: "p1", player2_id: null, status: "programmata" })).toBe(false);
    expect(isMatchOpenForBooking({ player1_id: "p1", player2_id: "p2", status: "programmata" })).toBe(true);
  });

  it("esclude partite concluse, annullate o walkover", () => {
    for (const status of ["completata", "annullata", "walkover"]) {
      expect(isMatchOpenForBooking({ player1_id: "p1", player2_id: "p2", status })).toBe(false);
    }
    expect(
      isMatchOpenForBooking({ player1_id: "p1", player2_id: "p2", status: "programmata", match_status: "completed" })
    ).toBe(false);
  });
});

describe("canUserBookTournamentMatch", () => {
  it("l'atleta può prenotare solo le partite in cui gioca", () => {
    const match = makeMatch();
    expect(canUserBookTournamentMatch(match, UUID_A, false)).toBe(true);
    expect(canUserBookTournamentMatch(match, UUID_B, false)).toBe(true);
    expect(canUserBookTournamentMatch(match, "altro-utente", false)).toBe(false);
  });

  it("admin/gestore possono prenotare qualsiasi partita", () => {
    expect(canUserBookTournamentMatch(makeMatch(), "admin-id", true)).toBe(true);
  });
});

describe("groupTournamentMatchesByRound", () => {
  it("raggruppa per giornata in ordine numerico", () => {
    const rounds = groupTournamentMatchesByRound([
      makeMatch({ id: "a", round_name: "Giornata 10", round_number: 10 }),
      makeMatch({ id: "b", round_name: "Giornata 2", round_number: 2, match_number: 4 }),
      makeMatch({ id: "c", round_name: "Giornata 2", round_number: 2, match_number: 3 }),
    ]);

    expect(rounds.map((r) => r.label)).toEqual(["Giornata 2", "Giornata 10"]);
    expect(rounds[0].matches.map((m) => m.id)).toEqual(["c", "b"]);
  });

  it("mette i gironi prima dell'eliminazione", () => {
    const rounds = groupTournamentMatchesByRound([
      makeMatch({ id: "f", phase: "eliminazione", round_name: "Finale", round_number: 1 }),
      makeMatch({ id: "g", phase: "gironi", round_name: "Girone A", round_number: 0 }),
    ]);
    expect(rounds.map((r) => r.label)).toEqual(["Girone A", "Finale"]);
  });

  it("la giornata di default è la prima con partite da prenotare", () => {
    const booked = { id: "b1", court: "Campo 1", start_time: "", end_time: "" };
    const rounds = groupTournamentMatchesByRound([
      makeMatch({ id: "a", round_name: "Giornata 1", round_number: 1, booking: booked }),
      makeMatch({ id: "b", round_name: "Giornata 2", round_number: 2 }),
    ]);
    expect(getDefaultRoundKey(rounds)).toBe(rounds[1].key);
    expect(getDefaultRoundKey([])).toBe("");
  });
});

describe("createBookingSchema - tipo torneo", () => {
  const base = {
    user_id: UUID_A,
    court: "Campo 1",
    start_time: "2026-10-20T16:00:00.000Z",
    end_time: "2026-10-20T17:30:00.000Z",
  };

  it("richiede la partita del torneo", () => {
    expect(createBookingSchema.safeParse({ ...base, type: "torneo" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, type: "torneo", tournament_match_id: UUID_MATCH }).success).toBe(true);
  });

  it("non cambia la validazione degli altri tipi", () => {
    expect(createBookingSchema.safeParse({ ...base, type: "campo" }).success).toBe(true);
  });
});
