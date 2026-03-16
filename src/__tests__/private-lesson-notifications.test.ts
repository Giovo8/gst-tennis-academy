import {
  buildCoachNotificationForPrivateLesson,
  buildCoachNotificationForPrivateLessonBatch,
  shouldNotifyCoachForPrivateLesson,
} from "@/lib/bookings/privateLessonNotifications";

describe("privateLessonNotifications", () => {
  describe("shouldNotifyCoachForPrivateLesson", () => {
    it("returns true only for private lessons with a selected coach", () => {
      expect(
        shouldNotifyCoachForPrivateLesson({
          bookingType: "lezione_privata",
          coachId: "coach-1",
        })
      ).toBe(true);

      expect(
        shouldNotifyCoachForPrivateLesson({
          bookingType: "lezione_gruppo",
          coachId: "coach-1",
        })
      ).toBe(false);

      expect(
        shouldNotifyCoachForPrivateLesson({
          bookingType: "lezione_privata",
          coachId: null,
        })
      ).toBe(false);
    });
  });

  describe("buildCoachNotificationForPrivateLesson", () => {
    it("builds the single lesson notification payload", () => {
      const notification = buildCoachNotificationForPrivateLesson({
        athleteName: "Mario Rossi",
        court: "Campo 3",
        startTime: "2026-03-18T17:30:00.000Z",
      });

      expect(notification).toEqual({
        type: "booking",
        title: "Nuova lezione privata",
        message: expect.stringContaining("Mario Rossi ti ha selezionato per una lezione privata su Campo 3"),
        link: "/dashboard/maestro/agenda",
      });
    });

    it("builds the batch lesson notification payload", () => {
      const notification = buildCoachNotificationForPrivateLessonBatch({
        athleteName: "Mario Rossi",
        court: "Campo 3",
        lessonCount: 3,
        firstStartTime: "2026-03-18T17:30:00.000Z",
      });

      expect(notification).toEqual({
        type: "booking",
        title: "Nuove lezioni private",
        message: expect.stringContaining("Mario Rossi ti ha selezionato per 3 lezioni private su Campo 3"),
        link: "/dashboard/maestro/agenda",
      });
    });
  });
});