import {
  buildAdminsNotificationForUserBookingDeletion,
  shouldNotifyAdminsForUserBookingDeletion,
} from "@/lib/bookings/bookingDeletionNotifications";
import {
  BOOKING_DELETE_SNAPSHOT_FIELDS,
  getBookingDeletionMode,
} from "@/lib/bookings/bookingDeletionEmail";

describe("bookingDeletionNotifications", () => {
  describe("shouldNotifyAdminsForUserBookingDeletion", () => {
    it("returns true when the athlete deletes their own booking", () => {
      expect(
        shouldNotifyAdminsForUserBookingDeletion({
          actorUserId: "user-1",
          bookingOwnerId: "user-1",
          actorRole: "atleta",
        })
      ).toBe(true);
    });

    it("returns true when a maestro deletes their own booking", () => {
      expect(
        shouldNotifyAdminsForUserBookingDeletion({
          actorUserId: "user-1",
          bookingOwnerId: "user-1",
          actorRole: "maestro",
        })
      ).toBe(true);
    });

    it("returns true when owner role resolves to atleta", () => {
      expect(
        shouldNotifyAdminsForUserBookingDeletion({
          actorUserId: "user-1",
          bookingOwnerId: "user-1",
          actorRole: null,
          ownerRole: "atleta",
        })
      ).toBe(true);
    });

    it("returns false when an admin deletes their own booking", () => {
      expect(
        shouldNotifyAdminsForUserBookingDeletion({
          actorUserId: "admin-1",
          bookingOwnerId: "admin-1",
          actorRole: "admin",
        })
      ).toBe(false);
    });

    it("returns false when a manager deletes another user's booking", () => {
      expect(
        shouldNotifyAdminsForUserBookingDeletion({
          actorUserId: "manager-1",
          bookingOwnerId: "user-1",
          actorRole: "gestore",
          ownerRole: "atleta",
        })
      ).toBe(false);
    });
  });

  describe("buildAdminsNotificationForUserBookingDeletion", () => {
    it("builds the admin notification payload", () => {
      const notification = buildAdminsNotificationForUserBookingDeletion({
        userName: "Mario Rossi",
        court: "Campo 2",
        startTime: "2026-03-15T18:30:00.000Z",
      });

      expect(notification).toEqual({
        type: "booking",
        title: "Prenotazione campo eliminata da utente",
        message: expect.stringContaining("Mario Rossi ha eliminato la prenotazione Campo 2"),
        link: "/dashboard/admin/bookings",
      });
      expect(notification.message).toContain("15/03/2026");
      expect(notification.message).toMatch(/alle \d{2}:\d{2}\./);
    });

    it("uses safe fallbacks when booking data is partial", () => {
      const notification = buildAdminsNotificationForUserBookingDeletion({
        startTime: "2026-03-15T08:00:00.000Z",
      });

      expect(notification.message).toContain("Un utente");
      expect(notification.message).toContain("prenotazione campo");
    });
  });

  describe("booking deletion email helpers", () => {
    it("loads the full booking snapshot needed for deletion emails", () => {
      expect(BOOKING_DELETE_SNAPSHOT_FIELDS).toContain("coach_id");
      expect(BOOKING_DELETE_SNAPSHOT_FIELDS).toContain("type");
      expect(BOOKING_DELETE_SNAPSHOT_FIELDS).toContain("end_time");
      expect(BOOKING_DELETE_SNAPSHOT_FIELDS).toContain("notes");
    });

    it("does not assign a booking mode to private lessons", () => {
      expect(getBookingDeletionMode("lezione_privata", 4)).toBeUndefined();
    });

    it("keeps booking mode only for court bookings", () => {
      expect(getBookingDeletionMode("campo", 2)).toBe("singolo");
      expect(getBookingDeletionMode("campo", 4)).toBe("doppio");
    });
  });
});