/**
 * Helper to extract response from auth result with proper type narrowing
 */
export function extractAuthResponse(authResult: any) {
  if (!authResult.success) {
    return authResult.response;
  }
  return null;
}

export function extractAuthData(authResult: any) {
  if (authResult.success) {
    return authResult.data;
  }
  return null;
}
