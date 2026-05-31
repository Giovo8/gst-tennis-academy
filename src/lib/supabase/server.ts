import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger/secure-logger';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Expected when called from a Server Component; sessions are
            // refreshed by middleware. Logged at debug for diagnostics.
            logger.debug('Supabase cookie set skipped (Server Component context)', {
              cookie: name,
            });
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Expected when called from a Server Component; sessions are
            // refreshed by middleware. Logged at debug for diagnostics.
            logger.debug('Supabase cookie remove skipped (Server Component context)', {
              cookie: name,
            });
          }
        },
      },
    }
  );
}
