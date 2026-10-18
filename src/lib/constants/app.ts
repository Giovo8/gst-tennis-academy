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

// ==================== BOOKING STATUS ====================
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  CANCELLATION_REQUESTED: 'cancellation_requested',
} as const;

// ==================== TOURNAMENT STATUS ====================
export const TOURNAMENT_STATUS = {
  DRAFT: 'Bozza',
  OPEN_REGISTRATION: 'Aperte le Iscrizioni',
  REGISTRATION_CLOSED: 'Iscrizioni Chiuse',
  IN_PROGRESS: 'In Corso',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
} as const;

// ==================== COMPETITION TYPES ====================
export const COMPETITION_TYPE = {
  TORNEO: 'torneo',
  CAMPIONATO: 'campionato',
} as const;

export type CompetitionType = (typeof COMPETITION_TYPE)[keyof typeof COMPETITION_TYPE];

// ==================== COMPETITION FORMATS ====================
export const COMPETITION_FORMAT = {
  ELIMINAZIONE_DIRETTA: 'eliminazione_diretta',
  ROUND_ROBIN: 'round_robin',
  GIRONE_ELIMINAZIONE: 'girone_eliminazione',
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
  MAX_FILE_SIZE_MB: 5,
} as const;

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
