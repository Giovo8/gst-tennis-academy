import {
  buildCoachNotificationForPrivateLesson,
  shouldNotifyCoachForPrivateLesson,
} from '@/lib/bookings/privateLessonNotifications';

describe('privateLessonNotifications', () => {
  describe('shouldNotifyCoachForPrivateLesson', () => {
    it('returns true only for private lessons with a selected coach', () => {
      expect(
        shouldNotifyCoachForPrivateLesson({
          bookingType: 'lezione_privata',
          coachId: 'coach-1',
        }),
      ).toBe(true);

      expect(
        shouldNotifyCoachForPrivateLesson({
          bookingType: 'lezione_gruppo',
          coachId: 'coach-1',
        }),
      ).toBe(false);

      expect(
        shouldNotifyCoachForPrivateLesson({
          bookingType: 'lezione_privata',
          coachId: null,
        }),
      ).toBe(false);
    });
  });

  describe('buildCoachNotificationForPrivateLesson', () => {
    it('builds the single lesson notification payload', () => {
      const notification = buildCoachNotificationForPrivateLesson({
        athleteName: 'Mario Rossi',
        court: 'Campo 3',
        startTime: '2026-03-18T17:30:00.000Z',
      });

      expect(notification).toEqual({
        type: 'booking',
        title: 'Nuova lezione privata',
        message: expect.stringContaining(
          'Mario Rossi ti ha selezionato per una lezione privata su Campo 3',
        ),
        link: '/dashboard/maestro/bookings',
      });
    });

    it("formats date and time in the academy's time zone", () => {
      // 17:30 UTC del 18 marzo = 18:30 a Roma (ora solare)
      const notification = buildCoachNotificationForPrivateLesson({
        startTime: '2026-03-18T17:30:00.000Z',
      });

      expect(notification.message).toContain('il 18/03/2026 alle 18:30');
    });
  });
});
