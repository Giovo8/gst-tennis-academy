import { getBookingEmailCopy, getBookingTypeLabel } from "@/lib/email/booking-email-copy";

describe("bookingEmailCopy", () => {
  it("uses private lesson wording for created emails", () => {
    const copy = getBookingEmailCopy({
      action: "created",
      bookingType: "lezione_privata",
    });

    expect(copy.subjectPrefix).toBe("Nuova lezione privata prenotata");
    expect(copy.title).toBe("Nuova lezione privata prenotata");
    expect(copy.intro.toLowerCase()).not.toContain("calendario campi");
  });

  it("uses private lesson wording for deleted emails", () => {
    const copy = getBookingEmailCopy({
      action: "deleted",
      bookingType: "lezione_privata",
    });

    expect(copy.subjectPrefix).toBe("Lezione privata eliminata");
    expect(copy.title).toBe("Lezione privata eliminata");
    expect(copy.intro.toLowerCase()).not.toContain("calendario campi");
  });

  it("keeps field booking wording for court bookings", () => {
    const copy = getBookingEmailCopy({
      action: "created",
      bookingType: "campo",
    });

    expect(copy.subjectPrefix).toBe("Nuova prenotazione registrata");
    expect(copy.intro).toContain("calendario campi");
  });

  it("returns human-readable booking type labels", () => {
    expect(getBookingTypeLabel("lezione_privata")).toBe("Lezione privata");
    expect(getBookingTypeLabel("campo")).toBe("Campo");
    expect(getBookingTypeLabel("tipo_personalizzato")).toBe("Tipo Personalizzato");
  });
});
