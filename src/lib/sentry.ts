export async function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({ dsn });
  } catch {
    // Sentry not installed — skip silently
  }
}
