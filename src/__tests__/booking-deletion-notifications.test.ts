import {
  buildAdminsNotificationForAthleteBookingDeletion,
  shouldNotifyAdminsForAthleteBookingDeletion,
} from "@/lib/bookings/bookingDeletionNotifications";

describe("bookingDeletionNotifications", () => {
  describe("shouldNotifyAdminsForAthleteBookingDeletion", () => {
    it("returns true when the athlete deletes their own booking", () => {
      expect(
        shouldNotifyAdminsForAthleteBookingDeletion({
          actorUserId: "user-1",
          bookingOwnerId: "user-1",
          actorRole: "atleta",
        })
      ).toBe(true);
    });

    it("returns true when owner role resolves to atleta", () => {
      expect(
        shouldNotifyAdminsForAthleteBookingDeletion({
          actorUserId: "user-1",
          bookingOwnerId: "user-1",
          actorRole: null,
          ownerRole: "atleta",
        })
      ).toBe(true);
    });

    it("returns false when a manager deletes another user's booking", () => {
      expect(
        shouldNotifyAdminsForAthleteBookingDeletion({
          actorUserId: "manager-1",
          bookingOwnerId: "user-1",
          actorRole: "gestore",
          ownerRole: "atleta",
        })
      ).toBe(false);
    });
  });

  describe("buildAdminsNotificationForAthleteBookingDeletion", () => {
    it("builds the admin notification payload", () => {
      const notification = buildAdminsNotificationForAthleteBookingDeletion({
        athleteName: "Mario Rossi",
        court: "Campo 2",
        startTime: "2026-03-15T18:30:00.000Z",
      });

      expect(notification).toEqual({
        type: "booking",
        title: "Prenotazione eliminata da atleta",
        message: expect.stringContaining("Mario Rossi ha eliminato la prenotazione Campo 2"),
        link: "/dashboard/admin/bookings",
      });
      expect(notification.message).toContain("15/03/2026");
      expect(notification.message).toMatch(/alle \d{2}:\d{2}\./);
    });

    it("uses safe fallbacks when booking data is partial", () => {
      const notification = buildAdminsNotificationForAthleteBookingDeletion({
        startTime: "2026-03-15T08:00:00.000Z",
      });

      expect(notification.message).toContain("Un atleta");
      expect(notification.message).toContain("prenotazione campo");
    });
  });
});