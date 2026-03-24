import { resolveBookingEmailAthleteContext } from "@/lib/bookings/bookingEmailAthleteContext";

describe("resolveBookingEmailAthleteContext", () => {
  it("prefers the participant identity when the booking owner is staff", () => {
    const result = resolveBookingEmailAthleteContext({
      owner: {
        full_name: "Segreteria GST",
        email: "segreteria@example.com",
        role: "gestore",
      },
      participants: [
        {
          full_name: "Mario Rossi",
          email: "mario@example.com",
        },
      ],
    });

    expect(result.athleteName).toBe("Mario Rossi");
    expect(result.athleteEmail).toBe("mario@example.com");
    expect(result.athleteRecipientEmails).toEqual(["mario@example.com"]);
    expect(result.additionalAthleteNames).toEqual([]);
  });

  it("keeps the owner identity when the booking owner is the athlete", () => {
    const result = resolveBookingEmailAthleteContext({
      owner: {
        full_name: "Mario Rossi",
        email: "mario@example.com",
        role: "atleta",
      },
      participants: [
        {
          full_name: "Luca Bianchi",
          email: "luca@example.com",
        },
      ],
    });

    expect(result.athleteName).toBe("Mario Rossi");
    expect(result.athleteEmail).toBe("mario@example.com");
    expect(result.athleteRecipientEmails).toEqual(["mario@example.com", "luca@example.com"]);
    expect(result.additionalAthleteNames).toEqual(["Luca Bianchi"]);
  });

  it("falls back to the first participant email when the owner email is missing", () => {
    const result = resolveBookingEmailAthleteContext({
      owner: {
        full_name: "Mario Rossi",
        email: null,
        role: "atleta",
      },
      participants: [
        {
          full_name: "Mario Rossi",
          email: "mario@example.com",
        },
      ],
    });

    expect(result.athleteName).toBe("Mario Rossi");
    expect(result.athleteEmail).toBe("mario@example.com");
    expect(result.athleteRecipientEmails).toEqual(["mario@example.com"]);
  });
});