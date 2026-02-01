/**
 * Application-wide constants
 * Centralized configuration to avoid magic numbers and hardcoded strings
 */

// ==================== USER ROLES ====================
export const USER_ROLES = {
  ADMIN: 'admin',
  GESTORE: 'gestore',
  MAESTRO: 'maestro',
  ATLETA: 'atleta',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ==================== BOOKING STATUS ====================
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

// ==================== TOURNAMENT STATUS ====================
export const TOURNAMENT_STATUS = {
  DRAFT: 'Bozza',
  OPEN_REGISTRATION: 'Aperte le Iscrizioni',
  REGISTRATION_CLOSED: 'Iscrizioni Chiuse',
  IN_PROGRESS: 'In Corso',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
} as const;

export type TournamentStatus = typeof TOURNAMENT_STATUS[keyof typeof TOURNAMENT_STATUS];

// ==================== COMPETITION TYPES ====================
export const COMPETITION_TYPE = {
  TORNEO: 'torneo',
  CAMPIONATO: 'campionato',
} as const;

export type CompetitionType = typeof COMPETITION_TYPE[keyof typeof COMPETITION_TYPE];

// ==================== COMPETITION FORMATS ====================
export const COMPETITION_FORMAT = {
  ELIMINAZIONE_DIRETTA: 'eliminazione_diretta',
  ROUND_ROBIN: 'round_robin',
  GIRONE_ELIMINAZIONE: 'girone_eliminazione',
} as const;

export type CompetitionFormat = typeof COMPETITION_FORMAT[keyof typeof COMPETITION_FORMAT];

// ==================== TIME CONSTANTS ====================
export const TIME_CONSTANTS = {
  ONE_HOUR_MS: 60 * 60 * 1000,
  TWENTY_FOUR_HOURS_MS: 24 * 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,
  BOOKING_ADVANCE_HOURS: 24,
} as const;

// ==================== VALIDATION RULES ====================
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 255,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  SEARCH_MIN_CHARS: 2,
  SEARCH_MAX_RESULTS: 50,
  MAX_FILE_SIZE_MB: 5,
} as const;

// ==================== PAGINATION ====================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
} as const;

// ==================== MATCH STATUSES ====================
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

// ==================== HTTP STATUS CODES ====================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ==================== ERROR MESSAGES ====================
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Non autorizzato',
  FORBIDDEN: 'Accesso negato',
  NOT_FOUND: 'Risorsa non trovata',
  INVALID_INPUT: 'Dati non validi',
  SERVER_ERROR: 'Errore del server',
  MISSING_FIELDS: 'Campi obbligatori mancanti',
  WEAK_PASSWORD: 'Password troppo debole',
  INVALID_EMAIL: 'Email non valida',
  INVALID_TOKEN: 'Token non valido o scaduto',
  CONFLICT: 'Risorsa già esistente',
  RATE_LIMIT: 'Troppe richieste, riprova più tardi',
} as const;

// ==================== TOURNAMENT CONFIGURATION ====================
export const TOURNAMENT_CONFIG = {
  MIN_PARTICIPANTS: 2,
  MAX_PARTICIPANTS_BRACKET: 128,
  VALID_BRACKET_SIZES: [2, 4, 8, 16, 32, 64, 128],
  MIN_GROUP_SIZE: 3,
  MAX_GROUP_SIZE: 8,
} as const;

// ==================== NEWS CATEGORIES ====================
export const NEWS_CATEGORIES = {
  GENERAL: 'generale',
  TOURNAMENT: 'torneo',
  TRAINING: 'allenamento',
  EVENT: 'evento',
  ANNOUNCEMENT: 'comunicato',
} as const;

export type NewsCategory = typeof NEWS_CATEGORIES[keyof typeof NEWS_CATEGORIES];

// ==================== NOTIFICATION TYPES ====================
export const NOTIFICATION_TYPE = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  BOOKING: 'booking',
  TOURNAMENT: 'tournament',
  MESSAGE: 'message',
  SYSTEM: 'system',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
