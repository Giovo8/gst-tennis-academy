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
} from '@/lib/constants/app';

// ==================== COMMON SCHEMAS ====================

const emailSchema = z
  .string()
  .email('Email non valida')
  .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, 'Email troppo lunga')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(
    VALIDATION_RULES.PASSWORD_MIN_LENGTH,
    `Password deve contenere almeno ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} caratteri`,
  )
  .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH, 'Password troppo lunga')
  .regex(/[A-Z]/, 'Password deve contenere almeno una lettera maiuscola')
  .regex(/[a-z]/, 'Password deve contenere almeno una lettera minuscola')
  .regex(/[0-9]/, 'Password deve contenere almeno un numero')
  .regex(/[^A-Za-z0-9]/, 'Password deve contenere almeno un carattere speciale');

const uuidSchema = z.string().uuid('ID non valido');

const phoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
  },
  z
    .string()
    .regex(
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      'Numero di telefono non valido',
    )
    .optional(),
);

const dateStringSchema = z.string().datetime('Data non valida');

// ==================== USER SCHEMAS ====================

const userRoleSchema = z.enum([
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

// ==================== BOOKING SCHEMAS ====================

const bookingStatusSchema = z.enum([
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.CANCELLATION_REQUESTED,
] as [string, ...string[]]);

// Booking participant schema
const bookingParticipantSchema = z.object({
  user_id: uuidSchema.optional().nullable(),
  full_name: z.string().min(2, 'Nome troppo corto').max(100, 'Nome troppo lungo'),
  email: emailSchema.optional().nullable(),
  // Usa validazione permissiva: il telefono viene sanificato prima dell'inserimento in DB
  // e i formati internazionali (es. "+39 347 1234567") devono essere accettati
  phone: z.string().max(30).optional().nullable(),
  is_registered: z.boolean().default(false),
});

const baseBookingSchema = z.object({
  user_id: uuidSchema,
  coach_id: uuidSchema.optional().nullable(),
  court: z.string().min(1, 'Campo obbligatorio'),
  type: z
    .enum(['campo', 'lezione', 'lezione_privata', 'lezione_gruppo', 'torneo'])
    .default('campo'),
  // Solo per type 'torneo': partita del torneo da giocare nello slot prenotato.
  tournament_match_id: uuidSchema.optional().nullable(),
  start_time: dateStringSchema,
  end_time: dateStringSchema,
  notes: z.string().max(500, 'Note troppo lunghe').optional().nullable(),
  status: bookingStatusSchema.optional(),
  participants: z
    .array(bookingParticipantSchema)
    .max(4, 'Massimo 4 partecipanti')
    .optional()
    .default([]),
});

export const createBookingSchema = baseBookingSchema
  .refine(
    (data) => {
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);
      return end > start;
    },
    {
      message: 'La data di fine deve essere successiva alla data di inizio',
      path: ['end_time'],
    },
  )
  .refine((data) => data.type !== 'torneo' || Boolean(data.tournament_match_id), {
    message: 'Seleziona la partita del torneo da giocare',
    path: ['tournament_match_id'],
  });

// ==================== TOURNAMENT SCHEMAS ====================

const tournamentStatusSchema = z.enum([
  TOURNAMENT_STATUS.DRAFT,
  TOURNAMENT_STATUS.OPEN_REGISTRATION,
  TOURNAMENT_STATUS.REGISTRATION_CLOSED,
  TOURNAMENT_STATUS.IN_PROGRESS,
  TOURNAMENT_STATUS.COMPLETED,
  TOURNAMENT_STATUS.CANCELLED,
] as [string, ...string[]]);

const competitionTypeSchema = z.enum([COMPETITION_TYPE.TORNEO, COMPETITION_TYPE.CAMPIONATO] as [
  string,
  ...string[],
]);

const competitionFormatSchema = z.enum([
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

// ==================== FEEDBACK ====================

export const FEEDBACK_CATEGORIE = ['suggerimento', 'problema', 'altro'] as const;
export const FEEDBACK_STATI = ['nuovo', 'letto', 'archiviato'] as const;

export const createFeedbackSchema = z.object({
  categoria: z.enum(FEEDBACK_CATEGORIE),
  titolo: z.string().trim().min(3, 'Titolo troppo corto').max(100, 'Titolo troppo lungo'),
  messaggio: z.string().trim().min(5, 'Messaggio troppo corto').max(2000, 'Messaggio troppo lungo'),
});

export const createFeedbackRispostaSchema = z.object({
  messaggio: z.string().trim().min(1, 'Messaggio vuoto').max(2000, 'Messaggio troppo lungo'),
});

export const updateFeedbackSchema = z.object({
  stato: z.enum(FEEDBACK_STATI),
});

// ==================== TYPE EXPORTS ====================
