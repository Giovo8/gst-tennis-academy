import { createBrowserClient } from "@supabase/ssr";
import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";

/**
 * Supabase Client for Browser
 * Uses anonymous key (safe for client-side)
 * Uses createBrowserClient from @supabase/ssr so the session is stored
 * in cookies and is accessible by server-side Route Handlers.
 */

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

function createSupabaseClient() {
  try {
    const supabaseUrl = env.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = env.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    logger.debug('Initializing Supabase client');

    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "implicit",
      },
    });
  } catch (error) {
    logger.error('Failed to initialize Supabase client', error);
    throw error;
  }
}

// Lazy initialization
function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance!;
}

export const supabase = getSupabaseClient();

