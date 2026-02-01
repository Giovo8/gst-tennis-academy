import { createClient } from "@supabase/supabase-js";
import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";

/**
 * Supabase Server Client with Service Role Key
 * 
 * ⚠️ SECURITY WARNING:
 * - This client has FULL DATABASE ACCESS and bypasses Row Level Security (RLS)
 * - NEVER expose service role key to client-side code
 * - NEVER use NEXT_PUBLIC_ prefix for service role key
 * - Only use in secure server-side contexts (API routes, server components)
 * 
 * Use cases:
 * - Admin operations that need to bypass RLS
 * - Background jobs and cron tasks
 * - Server-to-server authentication
 */

let supabaseServerInstance: ReturnType<typeof createClient> | null = null;

function createSupabaseServer() {
  try {
    // Validate environment variables are loaded
    const supabaseUrl = env.supabaseUrl;
    const supabaseServiceRole = env.supabaseServiceRoleKey;

    if (!supabaseUrl) {
      const error = new Error('SUPABASE_URL is not configured');
      logger.fatal('Missing Supabase URL', error);
      throw error;
    }

    if (!supabaseServiceRole) {
      const error = new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      logger.fatal('Missing Supabase Service Role Key', error);
      throw error;
    }

    logger.debug('Initializing Supabase server client');

    return createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (error) {
    logger.fatal('Failed to initialize Supabase server client', error);
    throw error;
  }
}

// Lazy initialization
function getSupabaseServer() {
  if (!supabaseServerInstance) {
    supabaseServerInstance = createSupabaseServer() as any;
  }
  return supabaseServerInstance;
}

export const supabaseServer = getSupabaseServer() as any;
