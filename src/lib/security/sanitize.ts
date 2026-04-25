/**
 * Client-side sanitization utilities
 * Re-exports server-safe functions and adds DOMPurify-based sanitizeHtml
 */

import DOMPurify from 'isomorphic-dompurify';

// Re-export all server-safe functions
export {
  escapeSqlLike,
  sanitizeSearchQuery,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeUuid,
  removeNullBytes,
  sanitizeObject,
  sanitizeText,
} from './sanitize-server';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify to clean malicious scripts and attributes
 * Only available client-side (requires jsdom)
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
}
