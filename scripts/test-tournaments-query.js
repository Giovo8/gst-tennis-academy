#!/usr/bin/env node

/**
 * Test script to verify tournaments query works correctly
 * Run with: node scripts/test-tournaments-query.js
 */

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTournamentsQuery() {
  console.log("🧪 Testing tournaments query...\n");

  try {
    // Test 1: Get all tournaments
    console.log("1️⃣  Fetching ALL tournaments...");
    const { data: allTournaments, error: allError, count: allCount } = await supabase
      .from("tournaments")
      .select("id,title,status,start_date,competition_type", { count: "exact" });

    if (allError) {
      console.error("   ❌ Error:", allError.message);
      return;
    }

    console.log(`   ✅ Found ${allCount} total tournaments`);
    if (allTournaments && allTournaments.length > 0) {
      console.log("   Sample tournaments:");
      allTournaments.slice(0, 3).forEach((t) => {
        console.log(
          `     - ${t.title} (${t.status}) - ${t.start_date ? new Date(t.start_date).toLocaleDateString("it-IT") : "N/A"}`
        );
      });
    }

    // Test 2: Get active tournaments (like homepage)
    console.log("\n2️⃣  Fetching ACTIVE tournaments (like homepage)...");
    const { data: activeTournaments, error: activeError, count: activeCount } = await supabase
      .from("tournaments")
      .select("id,title,status,start_date,competition_type", { count: "exact" })
      .in("status", ["Aperte le Iscrizioni", "In Corso"]);

    if (activeError) {
      console.error("   ❌ Error:", activeError.message);
      return;
    }

    console.log(`   ✅ Found ${activeCount} active tournaments`);
    if (activeTournaments && activeTournaments.length > 0) {
      console.log("   Active tournaments:");
      activeTournaments.slice(0, 5).forEach((t) => {
        console.log(
          `     - ${t.title} (${t.status}) - ${t.start_date ? new Date(t.start_date).toLocaleDateString("it-IT") : "N/A"}`
        );
      });
    } else {
      console.log("   ⚠️  No active tournaments found");
    }

    // Test 3: Test participant count for a tournament
    if (activeTournaments && activeTournaments.length > 0) {
      const tournament = activeTournaments[0];
      console.log(`\n3️⃣  Counting participants for: ${tournament.title}...`);
      const { count: participantCount, error: participantError } = await supabase
        .from("tournament_participants")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament.id);

      if (participantError) {
        console.error("   ❌ Error:", participantError.message);
      } else {
        console.log(`   ✅ Tournament has ${participantCount ?? 0} participants`);
      }
    }

    // Test 4: Performance - measure query time
    console.log("\n4️⃣  Performance test (10 queries)...");
    const times = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await supabase
        .from("tournaments")
        .select("id,title,status", { count: "exact" })
        .in("status", ["Aperte le Iscrizioni", "In Corso"]);
      times.push(Date.now() - start);
    }
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    console.log(`   ✅ Query times: avg=${avgTime.toFixed(0)}ms, min=${minTime}ms, max=${maxTime}ms`);

    console.log("\n✨ All tests passed!\n");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

testTournamentsQuery();
