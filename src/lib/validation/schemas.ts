/**
 * Input validation schemas using Zod
 * Provides type-safe validation for all user inputs
 */

import { z } from 'zod';
import { USER_ROLES, BOOKING_STATUS, VALIDATION_RULES } from '@/lib/constants/app';

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

// z.guid() accetta qualsiasi 8-4-4-4-12 esadecimale (come z.string().uuid() di zod 3)
const uuidSchema = z.guid('ID non valido');

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

export const AVVISO_TIPI = ['generale', 'evento', 'chiusura', 'importante'] as const;

export const createAvvisoSchema = z.object({
  tipo: z.enum(AVVISO_TIPI).default('generale'),
  testo: z.string().trim().min(1, 'Titolo vuoto').max(120, 'Titolo troppo lungo'),
  messaggio: z.string().trim().max(1000, 'Testo troppo lungo').optional(),
  visibile_fino: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida')
    .optional()
    .or(z.literal('')),
  // Solo percorsi interni all'app ("/..."), mai URL assoluti o "//host"
  link: z
    .string()
    .trim()
    .max(300, 'Link troppo lungo')
    .refine((v) => v === '' || (v.startsWith('/') && !v.startsWith('//')), {
      message: 'Il link deve essere una pagina del sito (es. /tornei)',
    })
    .optional(),
});

// Modifica parziale: solo i campi presenti nel body vengono aggiornati.
// tipo ridefinito senza default: zod 4 applica i default anche dentro .partial()
export const updateAvvisoSchema = createAvvisoSchema.partial().extend({
  tipo: z.enum(AVVISO_TIPI).optional(),
  attivo: z.boolean().optional(),
});

// ==================== CHAT ====================

export const createChatGroupSchema = z.object({
  name: z.string().trim().min(1, 'Il nome del gruppo è obbligatorio').max(80, 'Nome troppo lungo'),
  description: z.string().trim().max(300, 'Descrizione troppo lunga').nullish(),
  member_ids: z.array(uuidSchema).min(1, 'Seleziona almeno un membro').max(50, 'Troppi membri'),
});

export const chatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Il messaggio non può essere vuoto')
    .max(2000, 'Messaggio troppo lungo'),
});
