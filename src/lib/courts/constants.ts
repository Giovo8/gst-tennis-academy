/**
 * Default fallback courts list
 * Used when database is unavailable or during initial load
 *
 * IMPORTANT: These are fallback values only.
 * Always use getCourts() to load courts from database for the most up-to-date list.
 */
export const DEFAULT_COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];

/**
 * @deprecated Use getCourts() from '@/lib/courts/getCourts' instead
 * This constant is kept for backward compatibility only
 */
export const COURTS = DEFAULT_COURTS;
