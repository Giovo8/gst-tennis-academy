import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getErrorMessage } from "@/lib/types/errors";
import type { RoundData, GroupData, GroupStanding } from "@/lib/types/tournament";
import { createTournamentSchema, updateTournamentSchema } from "@/lib/validation/schemas";
import { sanitizeObject, sanitizeUuid } from "@/lib/security/sanitize";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import logger from "@/lib/logger/secure-logger";
import { 
  HTTP_STATUS, 
  ERROR_MESSAGES, 
  USER_ROLES,
  COMPETITION_TYPE,
  COMPETITION_FORMAT,
  TOURNAMENT_CONFIG 
} from "@/lib/constants/app";
import type { CompetitionType, CompetitionFormat } from "@/lib/constants/app";

interface TournamentBody {
  title: string;
  start_date: string;
  end_date?: string;
  max_participants: number;
  status: string;
  competition_type?: CompetitionType;
  format?: CompetitionFormat;
  rounds_data?: RoundData[];
  groups_data?: GroupData[];
  standings?: GroupStanding[];
}

async function getUserProfileFromRequest(req: Request) {
  const authHeader = (req as any).headers?.get?.("authorization") ?? null;
  const token = authHeader?.replace("Bearer ", "") ?? null;
  if (!token) return { user: null, profile: null };
  const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { user: null, profile: null };
  }
  const user = userData.user;
  const { data: profile } = await supabaseServer.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  return { user, profile };
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const requestTimeout = 8000; // 8 seconds timeout for Vercel (10s limit)
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const upcoming = url.searchParams.get("upcoming");
    const type = url.searchParams.get("type") as CompetitionType | null;
    const includeCounts = url.searchParams.get("includeCounts") === "true";

    try {
      logger.debug('Tournament GET request', { id, upcoming, type, includeCounts });
    } catch (logErr) {
      console.error('[API] Logger failed:', logErr);
    }

    // Validate UUID if provided
    if (id && !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (id) {
      const { data, error } = await supabaseServer
        .from("tournaments")
        .select(`*`)
        .eq("id", id)
        .single();
      
      if (error) {
        logger.error('Tournament not found', error, { tournamentId: id });
        return NextResponse.json(
          { error: ERROR_MESSAGES.NOT_FOUND },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }
      
      if (!data) {
        return NextResponse.json(
          { error: ERROR_MESSAGES.NOT_FOUND },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      // Count participants
      const { count, error: countErr } = await supabaseServer
        .from("tournament_participants")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", id);
      
      if (countErr) {
        logger.error('Failed to count participants', countErr, { tournamentId: id });
        return NextResponse.json(
          { error: ERROR_MESSAGES.SERVER_ERROR },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }

      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/tournaments', HTTP_STATUS.OK, duration);
      return NextResponse.json({ tournament: data, current_participants: count ?? 0 });
    }

    // Build query for list of tournaments
    // Limit fields to reduce payload size on Vercel
    const selectFields = includeCounts
      ? "*"
      : "id,title,description,start_date,max_participants,tournament_type,competition_type,status,format";
    
    let query = supabaseServer
      .from("tournaments")
      .select(selectFields) // NO count here - causes extra query
      .order("start_date", { ascending: true });

    if (upcoming === "true") {
      // Filter for active tournaments: open registrations or in progress
      query = query.in("status", ["Aperte le Iscrizioni", "In Corso"]);
      try {
        logger.debug('Filtering for active tournaments', { upcoming });
      } catch (logErr) {
        console.log('[API] Filtering for active tournaments');
      }
    }

    // Validate and filter by competition type
    if (type && (type === COMPETITION_TYPE.TORNEO || type === COMPETITION_TYPE.CAMPIONATO)) {
      query = query.eq("competition_type", type);
      try {
        logger.debug('Filtering by competition type', { type });
      } catch (logErr) {
        console.log('[API] Filtering by type:', type);
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('[API/tournaments] Database error:', error);
      try {
        logger.error('Database error fetching tournaments', error, { upcoming, type });
      } catch (logErr) {
        console.error('[API] Logger failed:', logErr);
      }
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
    
    // Check timeout before processing results
    if (Date.now() - startTime > requestTimeout) {
      try {
        logger.warn('Request approaching timeout limit', { 
          duration: Date.now() - startTime,
          dataLength: data?.length || 0 
        });
      } catch (logErr) {
        console.warn('[API] Timeout warning:', Date.now() - startTime);
      }
      return NextResponse.json({ tournaments: data || [] });
    }
    
    // Only add participant counts if explicitly requested AND time permits
    let result = data || [];
    if (includeCounts && result.length > 0 && (Date.now() - startTime < requestTimeout - 2000)) {
      try {
        logger.debug('Fetching participant counts', { count: Math.min(10, result.length) });
      } catch (logErr) {
        console.log('[API] Fetching counts for', Math.min(10, result.length), 'tournaments');
      }
      result = await Promise.all(
        result.slice(0, 10).map(async (tournament) => {
          const { count } = await supabaseServer
            .from("tournament_participants")
            .select("id", { count: "exact", head: true })
            .eq("tournament_id", tournament.id);
          return { ...tournament, current_participants: count ?? 0 };
        })
      );
    }
    
    const duration = Date.now() - startTime;
    try {
      logger.apiResponse('GET', '/api/tournaments', HTTP_STATUS.OK, duration);
      logger.debug('Returned tournaments', { count: result.length, duration });
    } catch (logErr) {
      console.log('[API] Response:', { count: result.length, duration });
    }
    return NextResponse.json({ tournaments: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    // Log to console for Vercel debugging
    console.error('[API/tournaments] GET failed:', {
      error: errorMessage,
      duration,
      stack: errorStack?.substring(0, 500),
    });
    
    try {
      logger.error('Exception in tournaments GET', error, { duration });
      logger.apiResponse('GET', '/api/tournaments', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    } catch (logErr) {
      console.error('[API] Logger failed on error:', logErr);
    }
    
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimit = applyRateLimit(clientId, RATE_LIMITS.API_WRITE);
    
    if (!rateLimit.allowed) {
      logger.security('Tournament creation rate limit exceeded', { clientId });
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

    // Authentication and authorization
    const { user, profile } = await getUserProfileFromRequest(req);
    if (!profile || ![USER_ROLES.GESTORE, USER_ROLES.ADMIN].includes(profile.role as any)) {
      logger.security('Unauthorized tournament creation attempt', {
        userId: user?.id,
        role: profile?.role,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);

    // Validate with Zod
    const validationResult = createTournamentSchema.safeParse(sanitized);
    
    if (!validationResult.success) {
      logger.warn('Tournament validation failed', {
        userId: user.id,
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const body = validationResult.data;

    // Additional validation for bracket sizes
    if (body.format === COMPETITION_FORMAT.ELIMINAZIONE_DIRETTA && 
        !TOURNAMENT_CONFIG.VALID_BRACKET_SIZES.includes(body.max_participants as any)) {
      return NextResponse.json({ 
        error: `For eliminazione_diretta, max_participants must be one of: ${TOURNAMENT_CONFIG.VALID_BRACKET_SIZES.join(', ')}` 
      }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    if ((body.format === COMPETITION_FORMAT.ROUND_ROBIN || 
         body.format === COMPETITION_FORMAT.GIRONE_ELIMINAZIONE) && 
        body.max_participants < TOURNAMENT_CONFIG.MIN_GROUP_SIZE) {
      return NextResponse.json({ 
        error: `For round_robin or girone_eliminazione, max_participants must be at least ${TOURNAMENT_CONFIG.MIN_GROUP_SIZE}` 
      }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const { data, error } = await supabaseServer
      .from("tournaments")
      .insert([body])
      .select();

    if (error) {
      logger.error('Failed to create tournament', error, { userId: user.id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
    
    const duration = Date.now() - startTime;
    logger.info('Tournament created', { userId: user.id, tournamentId: data[0].id });
    logger.apiResponse('POST', '/api/tournaments', HTTP_STATUS.CREATED, duration);
    return NextResponse.json({ tournament: data?.[0] }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Exception in tournaments POST', error);
    logger.apiResponse('POST', '/api/tournaments', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PUT(req: Request) {
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id || !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { user, profile } = await getUserProfileFromRequest(req);
    if (!profile || ![USER_ROLES.GESTORE, USER_ROLES.ADMIN].includes(profile.role as any)) {
      logger.security('Unauthorized tournament update attempt', {
        userId: user?.id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);
    
    const { data, error } = await supabaseServer
      .from("tournaments")
      .update(sanitized)
      .eq("id", id)
      .select();

    if (error) {
      logger.error('Failed to update tournament', error, { userId: user.id, tournamentId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
    
    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', '/api/tournaments', HTTP_STATUS.OK, duration);
    return NextResponse.json({ tournament: data?.[0] });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Exception in tournaments PUT', error);
    logger.apiResponse('PUT', '/api/tournaments', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function DELETE(req: Request) {
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id || !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { user, profile } = await getUserProfileFromRequest(req);
    if (!profile || ![USER_ROLES.GESTORE, USER_ROLES.ADMIN].includes(profile.role as any)) {
      logger.security('Unauthorized tournament deletion attempt', {
        userId: user?.id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { error } = await supabaseServer.from("tournaments").delete().eq("id", id);
    
    if (error) {
      logger.error('Failed to delete tournament', error, { userId: user.id, tournamentId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
    
    const duration = Date.now() - startTime;
    logger.info('Tournament deleted', { userId: user.id, tournamentId: id });
    logger.apiResponse('DELETE', '/api/tournaments', HTTP_STATUS.OK, duration);
    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Exception in tournaments DELETE', error);
    logger.apiResponse('DELETE', '/api/tournaments', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
