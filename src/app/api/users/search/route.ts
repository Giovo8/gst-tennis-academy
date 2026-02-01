import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchQuery } from "@/lib/security/sanitize";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import logger from "@/lib/logger/secure-logger";
import { HTTP_STATUS, ERROR_MESSAGES, VALIDATION_RULES } from "@/lib/constants/app";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/search
 * Search users for messaging (authenticated users only)
 * Protected with rate limiting and input sanitization
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = applyRateLimit(clientId, RATE_LIMITS.API_SEARCH);
    
    if (!rateLimit.allowed) {
      logger.security('Rate limit exceeded for user search', { clientId });
      return NextResponse.json(
        { 
          error: ERROR_MESSAGES.RATE_LIMIT,
          retryAfter: rateLimit.reset,
        },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    // Authentication
    const supabaseSession = await createClient();
    const { data: { user }, error: authError } = await supabaseSession.auth.getUser();
    
    if (authError || !user) {
      logger.warn('Unauthorized search attempt', { clientId });
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Input validation
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = searchParams.get("q") || "";
    
    // Validate query length
    if (!rawQuery || rawQuery.length < VALIDATION_RULES.SEARCH_MIN_CHARS) {
      return NextResponse.json([]);
    }

    if (rawQuery.length > 100) {
      return NextResponse.json(
        { error: 'Query troppo lunga' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Sanitize search query to prevent SQL injection
    const sanitizedQuery = sanitizeSearchQuery(rawQuery);
    
    logger.debug('User search query', {
      userId: user.id,
      queryLength: sanitizedQuery.length,
    });

    // Perform search with sanitized input
    const { data: users, error } = await supabaseServer
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .neq("id", user.id)
      .or(`full_name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%`)
      .limit(VALIDATION_RULES.SEARCH_MAX_RESULTS);

    if (error) {
      logger.error('Database error in user search', error, {
        userId: user.id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/users/search', HTTP_STATUS.OK, duration);

    return NextResponse.json(users || []);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Exception in user search', error);
    logger.apiResponse('GET', '/api/users/search', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
