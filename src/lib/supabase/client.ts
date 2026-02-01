import { createClient } from "@supabase/supabase-js";
import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";

/**
 * Supabase Client for Browser
 * Uses anonymous key (safe for client-side)
 */

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function createSupabaseClient() {
  try {
    const supabaseUrl = env.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = env.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    logger.debug('Initializing Supabase client');

    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    logger.error('Failed to initialize Supabase client', error);
    throw error;
  }
}

// Lazy initialization
function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient() as any;
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient() as any;

