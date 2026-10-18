/**
 * Server-safe sanitization utilities
 * These functions can be safely imported on the server side
 * They do NOT depend on jsdom/DOMPurify which causes issues in Vercel serverless
 */

/**
 * Sanitize phone number - keep only digits and +
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
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
function removeNullBytes(input: string): string {
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
