import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, unauthorized } from "@/lib/auth/routeAuth";
import {
  fetchEnrichedChallenge,
  fetchEnrichedChallenges,
  notifyOpponentOfNewChallenge,
  notifyChallengeStatusChange,
} from "@/lib/arena/challengeService";

// GET - Fetch challenges
export async function GET(req: Request) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const challengeId = searchParams.get("challenge_id");

    if (challengeId) {
      const challenge = await fetchEnrichedChallenge(challengeId);
      if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }
      return NextResponse.json({ challenge });
    }

    const challenges = await fetchEnrichedChallenges(userId, status);
    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("Error in GET /api/arena/challenges:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Internal server error" }, { status: 500 });
  }
}

// POST - Create new challenge
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      challenger_id,
      opponent_id,
      message,
      scheduled_date,
      court,
      match_format,
      duration_minutes,
      match_type,
      challenge_type,
      my_partner_id,
      opponent_partner_id,
      booking_id,
    } = body;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let creatorRole: string | null = null;
    if (token) {
      const { data: authData } = await supabaseServer.auth.getUser(token);
      const creatorId = authData.user?.id;
      if (creatorId) {
        const { data: creatorProfile } = await supabaseServer
          .from("profiles")
          .select("role")
          .eq("id", creatorId)
          .maybeSingle();
        creatorRole = creatorProfile?.role || null;
      }
    }

    const initialStatus =
      creatorRole === "admin" || creatorRole === "gestore" ? "accepted" : "pending";

    if (!challenger_id || !opponent_id) {
      return NextResponse.json(
        { error: "Challenger and opponent IDs are required" },
        { status: 400 },
      );
    }

    if (challenger_id === opponent_id) {
      return NextResponse.json({ error: "Cannot challenge yourself" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("arena_challenges")
      .insert([
        {
          challenger_id,
          opponent_id,
          message: message || null,
          scheduled_date: scheduled_date || null,
          court: court || null,
          match_format: match_format || "best_of_3",
          duration_minutes: duration_minutes || 120,
          match_type: match_type || "singolo",
          challenge_type: challenge_type || "ranked",
          my_partner_id: my_partner_id || null,
          opponent_partner_id: opponent_partner_id || null,
          booking_id: booking_id || null,
          status: initialStatus,
        },
      ])
      .select(
        `*,
        challenger:profiles!arena_challenges_challenger_id_fkey(id, full_name, avatar_url),
        opponent:profiles!arena_challenges_opponent_id_fkey(id, full_name, avatar_url)`,
      )
      .single();

    if (error) {
      console.error("Error creating challenge:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await notifyOpponentOfNewChallenge({
      challengeId: data.id,
      challengerId: challenger_id,
      opponentId: opponent_id,
      message,
      court,
      scheduledDate: scheduled_date,
      matchType: match_type,
      challengeType: challenge_type,
      bookingId: booking_id,
    });

    return NextResponse.json({ challenge: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/arena/challenges:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update challenge (accept, decline, complete)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      challenge_id,
      status,
      winner_id,
      score,
      notes,
      booking_id,
      scheduled_date,
      court,
      match_format,
      duration_minutes,
      match_type,
      challenge_type,
      my_partner_id,
      opponent_partner_id,
      message,
    } = body;

    if (!challenge_id) {
      return NextResponse.json({ error: "Challenge ID is required" }, { status: 400 });
    }

    if (status === "completed" && !winner_id) {
      return NextResponse.json(
        { error: "Nel tennis non ci possono essere pareggi. Devi specificare un vincitore." },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (winner_id) updateData.winner_id = winner_id;
    if (score) updateData.score = score;
    if (notes) updateData.notes = notes;
    if (booking_id !== undefined) updateData.booking_id = booking_id;
    if (scheduled_date) updateData.scheduled_date = scheduled_date;
    if (court) updateData.court = court;
    if (match_format) updateData.match_format = match_format;
    if (duration_minutes) updateData.duration_minutes = duration_minutes;
    if (match_type) updateData.match_type = match_type;
    if (challenge_type) updateData.challenge_type = challenge_type;
    if (my_partner_id !== undefined) updateData.my_partner_id = my_partner_id;
    if (opponent_partner_id !== undefined) updateData.opponent_partner_id = opponent_partner_id;
    if (message !== undefined) updateData.message = message;

    // Fetch previous state before update to drive notification logic
    const { data: previousData } = await supabaseServer
      .from("arena_challenges")
      .select("status, booking_id")
      .eq("id", challenge_id)
      .single();

    const previousStatus = previousData?.status ?? null;
    const previousBookingId = previousData?.booking_id || null;

    const { data, error } = await supabaseServer
      .from("arena_challenges")
      .update(updateData)
      .eq("id", challenge_id)
      .select(
        `*,
        challenger:profiles!arena_challenges_challenger_id_fkey(id, full_name, avatar_url),
        opponent:profiles!arena_challenges_opponent_id_fkey(id, full_name, avatar_url)`,
      )
      .single();

    if (error) {
      console.error("Error updating challenge:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const linkedBookingId =
      booking_id !== undefined ? booking_id : data.booking_id || previousBookingId;

    if (status === "cancelled" && linkedBookingId) {
      const { error: bookingCancelError } = await supabaseServer
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", linkedBookingId);

      if (bookingCancelError) {
        console.error("Error cancelling linked booking:", bookingCancelError);

        if (previousStatus) {
          const { error: rollbackError } = await supabaseServer
            .from("arena_challenges")
            .update({ status: previousStatus })
            .eq("id", challenge_id);

          if (rollbackError) {
            console.error(
              "Error rolling back challenge status after booking cancellation failure:",
              rollbackError,
            );
          }
        }

        return NextResponse.json({ error: "Failed to cancel linked booking" }, { status: 500 });
      }
    }

    await notifyChallengeStatusChange({
      challengeId: challenge_id,
      data,
      status,
      previousStatus,
      winnerId: winner_id,
      score,
      linkedBookingId,
    });

    return NextResponse.json({ challenge: data });
  } catch (error) {
    console.error("Error in PATCH /api/arena/challenges:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Internal server error" }, { status: 500 });
  }
}

// PUT - Update challenge (alias for PATCH)
export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const challengeIdFromQuery = searchParams.get("challenge_id");

  const body = await req.json();

  if (challengeIdFromQuery && !body.challenge_id) {
    body.challenge_id = challengeIdFromQuery;
  }

  const newReq = new Request(req.url, {
    method: "PATCH",
    headers: req.headers,
    body: JSON.stringify(body),
  });

  return PATCH(newReq);
}

// DELETE - Cancel challenge
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const challengeId = searchParams.get("challenge_id");

    if (!challengeId) {
      return NextResponse.json({ error: "Challenge ID is required" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("arena_challenges")
      .delete()
      .eq("id", challengeId);

    if (error) {
      console.error("Error deleting challenge:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/arena/challenges:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Internal server error" }, { status: 500 });
  }
}
