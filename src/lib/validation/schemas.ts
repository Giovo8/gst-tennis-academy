/**
 * Input validation schemas using Zod
 * Provides type-safe validation for all user inputs
 */

import { z } from 'zod';
import { 
  USER_ROLES, 
  BOOKING_STATUS, 
  TOURNAMENT_STATUS,
  COMPETITION_TYPE,
  COMPETITION_FORMAT,
  VALIDATION_RULES,
  NEWS_CATEGORIES 
} from '@/lib/constants/app';

// ==================== COMMON SCHEMAS ====================

export const emailSchema = z
  .string()
  .email('Email non valida')
  .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, 'Email troppo lunga')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password deve contenere almeno ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} caratteri`)
  .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH, 'Password troppo lunga')
  .regex(/[A-Z]/, 'Password deve contenere almeno una lettera maiuscola')
  .regex(/[a-z]/, 'Password deve contenere almeno una lettera minuscola')
  .regex(/[0-9]/, 'Password deve contenere almeno un numero')
  .regex(/[^A-Za-z0-9]/, 'Password deve contenere almeno un carattere speciale');

export const uuidSchema = z.string().uuid('ID non valido');

export const urlSchema = z.string().url('URL non valido').optional();

export const phoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
  },
  z
    .string()
    .regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Numero di telefono non valido')
    .optional()
);

export const dateStringSchema = z.string().datetime('Data non valida');

// ==================== USER SCHEMAS ====================

export const userRoleSchema = z.enum([
  USER_ROLES.ADMIN,
  USER_ROLES.GESTORE,
  USER_ROLES.MAESTRO,
  USER_ROLES.ATLETA,
] as [string, ...string[]]);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z
    .string()
    .min(VALIDATION_RULES.USERNAME_MIN_LENGTH, 'Nome troppo corto')
    .max(VALIDATION_RULES.USERNAME_MAX_LENGTH, 'Nome troppo lungo')
    .trim(),
  phone: phoneSchema,
  role: userRoleSchema,
  inviteCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password obbligatoria'),
});

// ==================== BOOKING SCHEMAS ====================

export const bookingStatusSchema = z.enum([
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.CANCELLATION_REQUESTED,
] as [string, ...string[]]);

// Booking participant schema
export const bookingParticipantSchema = z.object({
  user_id: uuidSchema.optional().nullable(),
  full_name: z.string().min(2, 'Nome troppo corto').max(100, 'Nome troppo lungo'),
  email: emailSchema.optional().nullable(),
  // Usa validazione permissiva: il telefono viene sanificato prima dell'inserimento in DB
  // e i formati internazionali (es. "+39 347 1234567") devono essere accettati
  phone: z.string().max(30).optional().nullable(),
  is_registered: z.boolean().default(false),
});

export const baseBookingSchema = z.object({
  user_id: uuidSchema,
  coach_id: uuidSchema.optional().nullable(),
  court: z.string().min(1, 'Campo obbligatorio'),
  type: z.enum(['campo', 'lezione', 'lezione_privata', 'lezione_gruppo']).default('campo'),
  start_time: dateStringSchema,
  end_time: dateStringSchema,
  notes: z.string().max(500, 'Note troppo lunghe').optional().nullable(),
  status: bookingStatusSchema.optional(),
  participants: z.array(bookingParticipantSchema).max(4, 'Massimo 4 partecipanti').optional().default([]),
});

export const createBookingSchema = baseBookingSchema.refine((data) => {
  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  return end > start;
}, {
  message: 'La data di fine deve essere successiva alla data di inizio',
  path: ['end_time'],
});

export const updateBookingSchema = baseBookingSchema.partial().extend({
  id: uuidSchema,
});

// ==================== LISTINO PREZZI SCHEMAS ====================

export const createListinoPrezzoSchema = z.object({
  tipo_prenotazione: z.enum(['campo', 'lezione', 'lezione_privata', 'lezione_gruppo']),
  // Obbligatorio per 'campo' (singolo/doppio) e 'lezione_privata' (singola/doppia in base al
  // numero di partecipanti), non ammesso per gli altri tipi.
  formato: z.enum(['singolo', 'doppio', 'singola', 'doppia']).optional().nullable(),
  // Obbligatoria solo per 'campo'/'lezione_privata' (prezzo diverso per giorno/notte, oppure
  // 'unica' per un prezzo unico valido su tutta la giornata).
  fascia_oraria: z.enum(['giorno', 'notte', 'unica']).optional().nullable(),
  durata_minuti: z.number().int('Durata non valida').positive('Durata deve essere maggiore di zero'),
  prezzo: z.number().nonnegative('Il prezzo non può essere negativo'),
  valido_dal: dateStringSchema.optional(),
  // Se assente/vuoto il prezzo resta valido a tempo indeterminato (finché non ne viene impostato un altro).
  valido_al: dateStringSchema.optional().nullable(),
}).refine((data) => !data.valido_al || new Date(data.valido_al) > new Date(data.valido_dal ?? Date.now()), {
  message: 'La data di fine validità deve essere successiva alla data di decorrenza',
  path: ['valido_al'],
}).refine((data) => (data.tipo_prenotazione === 'campo') === ['singolo', 'doppio'].includes(data.formato ?? ''), {
  message: "Il formato (singolo/doppio) è obbligatorio per il tipo Campo e non ammesso per gli altri tipi",
  path: ['formato'],
}).refine((data) => (data.tipo_prenotazione === 'lezione_privata') === ['singola', 'doppia'].includes(data.formato ?? ''), {
  message: "Il formato (singola/doppia) è obbligatorio per la Lezione privata e non ammesso per gli altri tipi",
  path: ['formato'],
}).refine((data) => (['campo', 'lezione_privata'].includes(data.tipo_prenotazione)) === Boolean(data.fascia_oraria), {
  message: "La fascia oraria (giorno/notte/unica) è obbligatoria per Campo e Lezione privata e non ammessa per gli altri tipi",
  path: ['fascia_oraria'],
});

// ==================== SOGLIA ORARIO NOTTURNO SCHEMAS ====================

export const createSogliaOrarioNotturnoSchema = z.object({
  ora_notte: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Orario non valido (HH:MM)'),
  valido_dal: dateStringSchema.optional(),
  valido_al: dateStringSchema.optional().nullable(),
}).refine((data) => !data.valido_al || new Date(data.valido_al) > new Date(data.valido_dal ?? Date.now()), {
  message: 'La data di fine validità deve essere successiva alla data di decorrenza',
  path: ['valido_al'],
});

// ==================== TOURNAMENT SCHEMAS ====================

export const tournamentStatusSchema = z.enum([
  TOURNAMENT_STATUS.DRAFT,
  TOURNAMENT_STATUS.OPEN_REGISTRATION,
  TOURNAMENT_STATUS.REGISTRATION_CLOSED,
  TOURNAMENT_STATUS.IN_PROGRESS,
  TOURNAMENT_STATUS.COMPLETED,
  TOURNAMENT_STATUS.CANCELLED,
] as [string, ...string[]]);

export const competitionTypeSchema = z.enum([
  COMPETITION_TYPE.TORNEO,
  COMPETITION_TYPE.CAMPIONATO,
] as [string, ...string[]]);

export const competitionFormatSchema = z.enum([
  COMPETITION_FORMAT.ELIMINAZIONE_DIRETTA,
  COMPETITION_FORMAT.ROUND_ROBIN,
  COMPETITION_FORMAT.GIRONE_ELIMINAZIONE,
] as [string, ...string[]]);

export const createTournamentSchema = z.object({
  title: z.string().min(3, 'Titolo troppo corto').max(200, 'Titolo troppo lungo'),
  start_date: dateStringSchema,
  end_date: dateStringSchema.optional(),
  max_participants: z.number().int().positive('Numero partecipanti deve essere positivo'),
  status: tournamentStatusSchema.default(TOURNAMENT_STATUS.DRAFT),
  competition_type: competitionTypeSchema.default(COMPETITION_TYPE.TORNEO),
  format: competitionFormatSchema.default(COMPETITION_FORMAT.ELIMINAZIONE_DIRETTA),
  rounds_data: z.array(z.any()).optional(),
  groups_data: z.array(z.any()).optional(),
  standings: z.array(z.any()).optional(),
  description: z.string().max(1000, 'Descrizione troppo lunga').optional(),
});

export const updateTournamentSchema = createTournamentSchema.partial().extend({
  id: uuidSchema,
});

// ==================== NEWS SCHEMAS ====================

export const newsCategorySchema = z.enum([
  NEWS_CATEGORIES.GENERAL,
  NEWS_CATEGORIES.TOURNAMENT,
  NEWS_CATEGORIES.TRAINING,
  NEWS_CATEGORIES.EVENT,
  NEWS_CATEGORIES.ANNOUNCEMENT,
] as [string, ...string[]]);

export const createNewsSchema = z.object({
  title: z.string().min(5, 'Titolo troppo corto').max(200, 'Titolo troppo lungo'),
  category: newsCategorySchema,
  content: z.string().min(20, 'Contenuto troppo corto').max(10000, 'Contenuto troppo lungo'),
  excerpt: z.string().max(500, 'Estratto troppo lungo').optional(),
  image_url: urlSchema,
  is_published: z.boolean().default(false),
});

export const updateNewsSchema = createNewsSchema.partial().extend({
  id: uuidSchema,
});

// ==================== SEARCH SCHEMAS ====================

export const searchQuerySchema = z.object({
  q: z.string()
    .min(VALIDATION_RULES.SEARCH_MIN_CHARS, `Minimo ${VALIDATION_RULES.SEARCH_MIN_CHARS} caratteri`)
    .max(100, 'Query troppo lunga'),
  limit: z.number().int().min(1).max(VALIDATION_RULES.SEARCH_MAX_RESULTS).optional(),
});

// ==================== PAGINATION SCHEMAS ====================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(10).max(100).default(20),
});

// ==================== TYPE EXPORTS ====================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BookingParticipant = z.infer<typeof bookingParticipantSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CreateListinoPrezzoInput = z.infer<typeof createListinoPrezzoSchema>;
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
