/**
 * Server-safe sanitization utilities
 * These functions can be safely imported on the server side
 * They do NOT depend on jsdom/DOMPurify which causes issues in Vercel serverless
 */

/**
 * Escape special characters for SQL LIKE queries
 * Prevents SQL injection in pattern matching
 */
export function escapeSqlLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Sanitize search query
 * Removes potentially dangerous characters while preserving valid input
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove HTML tags using regex (server-safe)
  let clean = query.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  clean = clean.trim();
  
  // Remove multiple spaces
  clean = clean.replace(/\s+/g, ' ');
  
  // Escape SQL special characters
  clean = escapeSqlLike(clean);
  
  return clean;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize phone number - keep only digits and +
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Sanitize URL - validate and encode
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize filename - remove path traversal and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path traversal sequences
    .replace(/\.\./g, '')
    // Remove dangerous characters
    .replace(/[<>:"|?*\\\/]/g, '')
    // Remove leading/trailing dots and spaces
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

/**
 * Sanitize UUID - validate format
 */
export function sanitizeUuid(uuid: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid) ? uuid.toLowerCase() : null;
}

/**
 * Remove null bytes from string (common in injection attacks)
 */
export function removeNullBytes(input: string): string {
  return input.replace(/\0/g, '');
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return removeNullBytes(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    const sanitizedRecord: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitizedRecord[key] = sanitizeValue(nestedValue);
    }

    return sanitizedRecord;
  }

  return value;
}

/**
 * Sanitize object by applying sanitization to all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  return sanitizeValue(obj) as T;
}

/**
 * Sanitize text content by removing HTML tags (server-safe version)
 * Uses regex instead of DOMPurify for server compatibility
 */
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}
