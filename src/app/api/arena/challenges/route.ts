import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch challenges
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const challengeId = searchParams.get("challenge_id");

    console.log("🔵 GET /api/arena/challenges called with:", { userId, status, challengeId });

    // If requesting a specific challenge
    if (challengeId) {
      const { data: challenge, error } = await supabaseServer
        .from("arena_challenges")
        .select("*")
        .eq("id", challengeId)
        .single();

      if (error) {
        console.error("Error fetching challenge:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }

      // Fetch related profiles
      const userIds = [
        challenge.challenger_id,
        challenge.opponent_id,
        challenge.my_partner_id,
        challenge.opponent_partner_id,
      ].filter(Boolean);

      const { data: profiles } = await supabaseServer
        .from("profiles")
        .select("id, full_name, avatar_url, email, phone")
        .in("id", userIds);

      // Fetch arena stats separately
      const { data: arenaStats } = await supabaseServer
        .from("arena_stats")
        .select("user_id, ranking, points, level")
        .in("user_id", userIds);

      // Combine profiles with arena stats
      const enrichedProfiles = profiles?.map(profile => {
        const stats = arenaStats?.find(s => s.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email: profile.email,
          phone: profile.phone,
          arena_rank: stats?.level || null,
          arena_points: stats?.points || null,
        };
      });

      // Fetch booking if exists
      let booking = null;
      if (challenge.booking_id) {
        const { data: bookingData } = await supabaseServer
          .from("bookings")
          .select("id, court, start_time, end_time, status")
          .eq("id", challenge.booking_id)
          .single();
        booking = bookingData;
      }

      // Enrich challenge with related data
      const enrichedChallenge = {
        ...challenge,
        challenger: enrichedProfiles?.find(p => p.id === challenge.challenger_id),
        opponent: enrichedProfiles?.find(p => p.id === challenge.opponent_id),
        my_partner: enrichedProfiles?.find(p => p.id === challenge.my_partner_id),
        opponent_partner: enrichedProfiles?.find(p => p.id === challenge.opponent_partner_id),
        booking,
      };

      return NextResponse.json({ challenge: enrichedChallenge });
    }

    // Otherwise, fetch list of challenges
    let query = supabaseServer
      .from("arena_challenges")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching challenges:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Fetched challenges:", data?.length || 0);

    // Filter by status if requested
    let filteredData = data || [];
    if (status) {
      filteredData = filteredData.filter(c => c.status === status);
      console.log("✅ After status filter:", filteredData.length);
    }

    // If no data, return empty
    if (!filteredData || filteredData.length === 0) {
      console.log("⚠️ No challenges found");
      return NextResponse.json({ challenges: [] });
    }

    // Fetch related data
    const userIds = [...new Set([
      ...filteredData.map(c => c.challenger_id),
      ...filteredData.map(c => c.opponent_id),
    ].filter(Boolean))];

    const bookingIds = filteredData.map(c => c.booking_id).filter(Boolean);

    console.log("📊 Fetching related data for", userIds.length, "users and", bookingIds.length, "bookings");

    // Fetch profiles
    let profiles: any[] = [];
    if (userIds.length > 0) {
      try {
        const result = await supabaseServer
          .from("profiles")
          .select("id, full_name, avatar_url, email, phone")
          .in("id", userIds);
        profiles = result.data || [];
        console.log("✅ Fetched profiles:", profiles.length);
      } catch (err) {
        console.error("❌ Error fetching profiles:", err);
      }
    }

    // Fetch arena stats
    let arenaStats: any[] = [];
    if (userIds.length > 0) {
      try {
        const result = await supabaseServer
          .from("arena_stats")
          .select("user_id, ranking, points, level")
          .in("user_id", userIds);
        arenaStats = result.data || [];
        console.log("✅ Fetched arena stats:", arenaStats.length);
      } catch (err) {
        console.error("❌ Error fetching arena stats:", err);
      }
    }

    // Combine profiles with arena stats
    const enrichedProfiles = profiles?.map(profile => {
      const stats = arenaStats?.find(s => s.user_id === profile.id);
      return {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: profile.email,
        phone: profile.phone,
        arena_rank: stats?.level || null,
        arena_points: stats?.points || null,
      };
    });

    // Fetch bookings
    let bookings: any[] = [];
    if (bookingIds.length > 0) {
      try {
        const result = await supabaseServer
          .from("bookings")
          .select("id, court, start_time, end_time, status")
          .in("id", bookingIds);
        bookings = result.data || [];
        console.log("✅ Fetched bookings:", bookings.length);
      } catch (err) {
        console.error("❌ Error fetching bookings:", err);
      }
    }

    // Attach related data
    const enrichedChallenges = filteredData.map(challenge => ({
      ...challenge,
      challenger: enrichedProfiles?.find(p => p.id === challenge.challenger_id),
      opponent: enrichedProfiles?.find(p => p.id === challenge.opponent_id),
      booking: bookings?.find(b => b.id === challenge.booking_id),
    }));

    // Auto-cancel challenges with past dates and pending status
    const now = new Date();
    const challengesToCancel = enrichedChallenges.filter(
      challenge => 
        challenge.status === "pending" && 
        challenge.scheduled_date && 
        new Date(challenge.scheduled_date) < now
    );

    if (challengesToCancel.length > 0) {
      console.log("⏰ Found", challengesToCancel.length, "challenges with past dates. Cancelling them...");
      
      try {
        const challengeIds = challengesToCancel.map(c => c.id);
        await supabaseServer
          .from("arena_challenges")
          .update({ status: "cancelled" })
          .in("id", challengeIds);
        
        console.log("✅ Auto-cancelled", challengeIds.length, "expired challenges");
        
        // Update the local array with new status
        const cancelledMap = new Map(challengeIds.map(id => [id, true]));
        enrichedChallenges.forEach(challenge => {
          if (cancelledMap.has(challenge.id)) {
            challenge.status = "cancelled";
          }
        });
      } catch (err) {
        console.error("❌ Error auto-cancelling expired challenges:", err);
      }
    }

    // Auto-transition accepted challenges to awaiting_score when booking time has passed
    const challengesToAwaitScore = enrichedChallenges.filter(challenge => {
      if (challenge.status !== "accepted") return false;
      const refDate = challenge.booking?.start_time || challenge.scheduled_date;
      return refDate && new Date(refDate) < now;
    });

    if (challengesToAwaitScore.length > 0) {
      try {
        const ids = challengesToAwaitScore.map(c => c.id);
        await supabaseServer
          .from("arena_challenges")
          .update({ status: "awaiting_score" })
          .in("id", ids);

        const awaitingMap = new Map(ids.map(id => [id, true]));
        enrichedChallenges.forEach(challenge => {
          if (awaitingMap.has(challenge.id)) {
            challenge.status = "awaiting_score";
          }
        });
      } catch (err) {
        console.error("❌ Error auto-transitioning to awaiting_score:", err);
      }
    }

    console.log("✅ Returning", enrichedChallenges.length, "enriched challenges");
    return NextResponse.json({ challenges: enrichedChallenges });
  } catch (error: any) {
    console.error("💥 Error in GET /api/arena/challenges:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
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

    const initialStatus = creatorRole === "admin" || creatorRole === "gestore" ? "accepted" : "pending";

    if (!challenger_id || !opponent_id) {
      return NextResponse.json(
        { error: "Challenger and opponent IDs are required" },
        { status: 400 }
      );
    }

    if (challenger_id === opponent_id) {
      return NextResponse.json(
        { error: "Cannot challenge yourself" },
        { status: 400 }
      );
    }

    // Create challenge
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
      .select(`
        *,
        challenger:profiles!arena_challenges_challenger_id_fkey(id, full_name, avatar_url),
        opponent:profiles!arena_challenges_opponent_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Error creating challenge:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Challenge created successfully:", data?.id);

    // Create notification for opponent
    try {
      // Get challenger name and opponent role
      const { data: challenger } = await supabaseServer
        .from("profiles")
        .select("full_name")
        .eq("id", challenger_id)
        .single();

      const { data: opponent } = await supabaseServer
        .from("profiles")
        .select("role")
        .eq("id", opponent_id)
        .single();

      // Determine opponent's dashboard path based on role
      const opponentDashboard = opponent?.role === "maestro" ? "maestro" : "atleta";
      const hasBookedCourt = Boolean(booking_id);
      const notificationType = hasBookedCourt ? "arena_challenge_booked" : "arena_challenge";
      const notificationTitle = hasBookedCourt ? "🎾 Sfida Arena con Campo Prenotato!" : "🏆 Nuova Sfida Arena!";
      const challengeTypeLabel = challenge_type === "amichevole" ? "Amichevole" : "Ranked";
      const matchTypeLabel = match_type === "doppio" ? "Doppio" : "Singolo";
      const details: string[] = [];
      if (court) details.push(`Campo: ${court}`);
      if (scheduled_date) {
        const scheduled = new Date(scheduled_date);
        details.push(
          `Data: ${scheduled.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}`
        );
        details.push(
          `Ora: ${scheduled.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
        );
      }
      details.push(`Tipo: ${challengeTypeLabel}`);
      details.push(`Match: ${matchTypeLabel}`);
      const detailsSuffix = details.length > 0 ? ` (${details.join(" · ")})` : "";
      const notificationMessage = hasBookedCourt
        ? message
          ? `${challenger?.full_name || "Un atleta"} ti ha sfidato e ha gia prenotato il campo!${detailsSuffix} Messaggio: "${message}"`
          : `${challenger?.full_name || "Un atleta"} ti ha sfidato e ha gia prenotato il campo Arena!${detailsSuffix}`
        : message
          ? `${challenger?.full_name || "Un atleta"} ti ha sfidato!${detailsSuffix} Messaggio: "${message}"`
          : `${challenger?.full_name || "Un atleta"} ti ha sfidato in Arena!${detailsSuffix}`;

      // Create notification in notifications table
      await supabaseServer.from("notifications").insert([
        {
          user_id: opponent_id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          action_url: `/dashboard/${opponentDashboard}/arena/challenge/${data.id}`,
          is_read: false,
        },
      ]);

      // Also create internal message for backward compatibility
      await supabaseServer.from("internal_messages").insert([
        {
          sender_id: challenger_id,
          recipient_id: opponent_id,
          subject: notificationTitle,
          content: notificationMessage,
        },
      ]);
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
      // Non blocchiamo la creazione della sfida se fallisce la notifica
    }

    return NextResponse.json({ challenge: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/arena/challenges:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      message
    } = body;

    if (!challenge_id) {
      return NextResponse.json(
        { error: "Challenge ID is required" },
        { status: 400 }
      );
    }

    // Tennis does not allow draws - winner must be specified when completing
    if (status === "completed" && !winner_id) {
      return NextResponse.json(
        { error: "Nel tennis non ci possono essere pareggi. Devi specificare un vincitore." },
        { status: 400 }
      );
    }

    const updateData: any = {};

    // Update status-related fields
    if (status) updateData.status = status;
    if (winner_id) updateData.winner_id = winner_id;
    if (score) updateData.score = score;
    if (notes) updateData.notes = notes;
    
    // Update challenge configuration fields
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

    // Get the previous state BEFORE update to determine notification logic
    const { data: previousData } = await supabaseServer
      .from("arena_challenges")
      .select("status, booking_id")
      .eq("id", challenge_id)
      .single();

    const previousStatus = previousData?.status;
    const previousBookingId = previousData?.booking_id || null;

    const { data, error } = await supabaseServer
      .from("arena_challenges")
      .update(updateData)
      .eq("id", challenge_id)
      .select(`
        *,
        challenger:profiles!arena_challenges_challenger_id_fkey(id, full_name, avatar_url),
        opponent:profiles!arena_challenges_opponent_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Error updating challenge:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const linkedBookingId = booking_id !== undefined ? booking_id : (data.booking_id || previousBookingId);

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
            console.error("Error rolling back challenge status after booking cancellation failure:", rollbackError);
          }
        }

        return NextResponse.json({ error: "Failed to cancel linked booking" }, { status: 500 });
      }
    }

    // Send notification based on status change
    try {
      let notificationTitle = "";
      let notificationContent = "";
      let recipientIds: string[] = [];

      if (status === "accepted") {
        // Check if it was a counter_proposal being accepted (challenger confirming opponent's changes)
        // or a regular pending challenge being accepted (opponent accepting original challenge)
        if (previousStatus === "counter_proposal") {
          notificationTitle = "✅ Modifiche Confermate!";
          notificationContent = `${data.challenger.full_name} ha confermato le tue modifiche alla sfida!`;
          recipientIds = [data.opponent_id];
        } else {
          notificationTitle = "✅ Sfida Accettata!";
          notificationContent = `${data.opponent.full_name} ha accettato la tua sfida!`;
          recipientIds = [data.challenger_id];
        }
      } else if (status === "declined") {
        // Check if it was a counter_proposal being declined
        if (previousStatus === "counter_proposal") {
          notificationTitle = "❌ Modifiche Rifiutate";
          notificationContent = `${data.challenger.full_name} ha rifiutato le tue modifiche alla sfida.`;
          recipientIds = [data.opponent_id];
        } else {
          notificationTitle = "❌ Sfida Rifiutata";
          notificationContent = `${data.opponent.full_name} ha rifiutato la tua sfida.`;
          recipientIds = [data.challenger_id];
        }
      } else if (status === "counter_proposal") {
        notificationTitle = "✏️ Sfida Modificata";
        notificationContent = `${data.opponent.full_name} ha proposto delle modifiche alla tua sfida. Rivedi i dettagli e conferma.`;
        recipientIds = [data.challenger_id];
      } else if (status === "completed") {
        const winnerId = winner_id || data.winner_id;
        const loserId = winnerId === data.challenger_id ? data.opponent_id : data.challenger_id;
        const winnerName =
          winnerId === data.challenger_id
            ? data.challenger.full_name
            : data.opponent.full_name;

        notificationTitle = "🏁 Sfida Completata";
        notificationContent = `La sfida è terminata! Vincitore: ${winnerName}${
          score ? ` (${score})` : ""
        }`;
        recipientIds = [loserId]; // Notify loser (winner already knows they won)
      } else if (status === "cancelled") {
        notificationTitle = "🚫 Sfida Annullata";
        notificationContent = linkedBookingId
          ? "La sfida Arena è stata annullata e la prenotazione collegata è stata annullata."
          : "La sfida Arena è stata annullata.";
        recipientIds = [data.challenger_id, data.opponent_id];
      }

      if (notificationContent && recipientIds.length > 0) {
        const uniqueRecipientIds = Array.from(new Set(recipientIds));
        const { data: recipients } = await supabaseServer
          .from("profiles")
          .select("id, role")
          .in("id", uniqueRecipientIds);

        const recipientRoleMap = new Map((recipients || []).map((recipient) => [recipient.id, recipient.role]));

        await supabaseServer.from("notifications").insert(
          uniqueRecipientIds.map((recipientId) => ({
            user_id: recipientId,
            type: "arena_challenge",
            title: notificationTitle,
            message: notificationContent,
            action_url: `/dashboard/${recipientRoleMap.get(recipientId) === "maestro" ? "maestro" : "atleta"}/arena/challenge/${challenge_id}`,
            is_read: false,
          }))
        );

        await supabaseServer.from("internal_messages").insert(
          uniqueRecipientIds.map((recipientId) => ({
            sender_id: data.challenger_id === recipientId ? data.opponent_id : data.challenger_id,
            recipient_id: recipientId,
            subject: "📢 Aggiornamento Sfida Arena",
            content: notificationContent,
          }))
        );
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

    return NextResponse.json({ challenge: data });
  } catch (error: any) {
    console.error("Error in PATCH /api/arena/challenges:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update challenge (alias for PATCH)
export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const challengeIdFromQuery = searchParams.get("challenge_id");

  const body = await req.json();

  // Se challenge_id è nella query string, aggiungilo al body
  if (challengeIdFromQuery && !body.challenge_id) {
    body.challenge_id = challengeIdFromQuery;
  }

  // Crea una nuova Request con il body aggiornato per chiamare PATCH
  const newReq = new Request(req.url, {
    method: 'PATCH',
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
      return NextResponse.json(
        { error: "Challenge ID is required" },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error("Error in DELETE /api/arena/challenges:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
