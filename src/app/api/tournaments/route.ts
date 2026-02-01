import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { RoundData, GroupData, GroupStanding } from "@/lib/types/tournament";
import { createTournamentSchema } from "@/lib/validation/schemas";
import { sanitizeObject, sanitizeUuid } from "@/lib/security/sanitize";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  USER_ROLES,
  COMPETITION_TYPE,
  COMPETITION_FORMAT,
  TOURNAMENT_CONFIG
} from "@/lib/constants/app";
import type { CompetitionType, CompetitionFormat } from "@/lib/constants/app";

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
  const supabase = getSupabase();
  const authHeader = (req as any).headers?.get?.("authorization") ?? null;
  const token = authHeader?.replace("Bearer ", "") ?? null;
  if (!token) return { user: null, profile: null };
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { user: null, profile: null };
  }
  const user = userData.user;
  const { data: profile } = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  return { user, profile };
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const requestTimeout = 8000;

  try {
    const supabase = getSupabase();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const upcoming = url.searchParams.get("upcoming");
    const type = url.searchParams.get("type") as CompetitionType | null;
    const includeCounts = url.searchParams.get("includeCounts") === "true";

    // Validate UUID if provided
    if (id && !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (id) {
      const { data, error } = await supabase
        .from("tournaments")
        .select(`*`)
        .eq("id", id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: ERROR_MESSAGES.NOT_FOUND },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      const { count, error: countErr } = await supabase
        .from("tournament_participants")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", id);

      if (countErr) {
        return NextResponse.json(
          { error: ERROR_MESSAGES.SERVER_ERROR },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }

      return NextResponse.json({ tournament: data, current_participants: count ?? 0 });
    }

    // Build query for list of tournaments
    const selectFields = includeCounts
      ? "*"
      : "id,title,description,start_date,max_participants,tournament_type,competition_type,status,format";

    let query = supabase
      .from("tournaments")
      .select(selectFields)
      .order("start_date", { ascending: true });

    if (upcoming === "true") {
      query = query.in("status", ["Aperte le Iscrizioni", "In Corso"]);
    }

    if (type && (type === COMPETITION_TYPE.TORNEO || type === COMPETITION_TYPE.CAMPIONATO)) {
      query = query.eq("competition_type", type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API/tournaments] Database error:', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Check timeout before processing results
    if (Date.now() - startTime > requestTimeout) {
      return NextResponse.json({ tournaments: data || [] });
    }

    // Only add participant counts if explicitly requested AND time permits
    let result = data || [];
    if (includeCounts && result.length > 0 && (Date.now() - startTime < requestTimeout - 2000)) {
      result = await Promise.all(
        result.slice(0, 10).map(async (tournament) => {
          const { count } = await supabase
            .from("tournament_participants")
            .select("id", { count: "exact", head: true })
            .eq("tournament_id", tournament.id);
          return { ...tournament, current_participants: count ?? 0 };
        })
      );
    }

    return NextResponse.json({ tournaments: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[API/tournaments] GET failed:', {
      error: error instanceof Error ? error.message : String(error),
      duration,
    });

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();

    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimit = applyRateLimit(clientId, RATE_LIMITS.API_WRITE);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT, retryAfter: rateLimit.reset },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    const { user, profile } = await getUserProfileFromRequest(req);
    if (!profile || ![USER_ROLES.GESTORE, USER_ROLES.ADMIN].includes(profile.role as any)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);
    const validationResult = createTournamentSchema.safeParse(sanitized);

    if (!validationResult.success) {
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

    const { data, error } = await supabase
      .from("tournaments")
      .insert([body])
      .select();

    if (error) {
      console.error('[API/tournaments] POST failed:', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json({ tournament: data?.[0] }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    console.error('[API/tournaments] POST exception:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = getSupabase();
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
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);

    const { data, error } = await supabase
      .from("tournaments")
      .update(sanitized)
      .eq("id", id)
      .select();

    if (error) {
      console.error('[API/tournaments] PUT failed:', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json({ tournament: data?.[0] });
  } catch (error) {
    console.error('[API/tournaments] PUT exception:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase();
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
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { error } = await supabase.from("tournaments").delete().eq("id", id);

    if (error) {
      console.error('[API/tournaments] DELETE failed:', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/tournaments] DELETE exception:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
