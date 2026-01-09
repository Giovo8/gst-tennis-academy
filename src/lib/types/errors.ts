/**
 * Type-safe error handling utilities
 */

export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

export function createApiError(error: unknown): ApiError {
  return {
    message: getErrorMessage(error),
    code: error instanceof Error && 'code' in error ? String(error.code) : undefined,
    details: error instanceof Error ? error : undefined,
  };
}
