// Export all email templates
export { baseEmailLayout, generatePlainText } from "./layout";

export {
  bookingConfirmationTemplate,
  bookingReminderTemplate,
  bookingCancelledTemplate,
} from "./booking";

export {
  tournamentRegistrationTemplate,
  tournamentReminderTemplate,
  tournamentResultsTemplate,
} from "./tournament";

export {
  lessonRequestTemplate,
  lessonConfirmedTemplate,
  announcementNotificationTemplate,
  subscriptionCreatedTemplate,
  welcomeEmailTemplate,
} from "./notifications";

// Template data types
export type BookingConfirmationData = {
  user_name: string;
  court_name: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  total_price: string;
  booking_id: string;
  site_url: string;
};

export type BookingReminderData = {
  user_name: string;
  court_name: string;
  booking_date: string;
  booking_time: string;
  hours_until: number;
  site_url: string;
};

export type TournamentRegistrationData = {
  user_name: string;
  tournament_name: string;
  tournament_date: string;
  tournament_location: string;
  category: string;
  registration_fee: string;
  tournament_id: string;
  site_url: string;
};

export type LessonConfirmedData = {
  student_name: string;
  coach_name: string;
  lesson_date: string;
  lesson_time: string;
  court_name: string;
  lesson_type: string;
  duration: string;
  site_url: string;
};

export type WelcomeEmailData = {
  user_name: string;
  site_url: string;
};
