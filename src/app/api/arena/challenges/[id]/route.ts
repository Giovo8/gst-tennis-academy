import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const challengeId = params.id;

    // Fetch challenge data
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
      .select("id, full_name, avatar_url")
      .in("id", userIds);

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
      challenger: profiles?.find(p => p.id === challenge.challenger_id),
      opponent: profiles?.find(p => p.id === challenge.opponent_id),
      my_partner: profiles?.find(p => p.id === challenge.my_partner_id),
      opponent_partner: profiles?.find(p => p.id === challenge.opponent_partner_id),
      booking,
    };

    return NextResponse.json({ challenge: enrichedChallenge });
  } catch (error: any) {
    console.error("Error in GET /api/arena/challenges/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
