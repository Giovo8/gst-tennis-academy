#!/usr/bin/env node

/**
 * Check tournaments in database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env variables manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTournaments() {
  console.log('\n🔍 Checking tournaments in database...\n');
  
  // Get all tournaments
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: true });
    
  if (error) {
    console.error('❌ Error fetching tournaments:', error.message);
    return;
  }
  
  if (!tournaments || tournaments.length === 0) {
    console.log('⚠️  No tournaments found in database!');
    return;
  }
  
  console.log(`✅ Found ${tournaments.length} tournament(s):\n`);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  tournaments.forEach((t, index) => {
    console.log(`${index + 1}. ${t.title}`);
    console.log(`   ID: ${t.id}`);
    console.log(`   Status: ${t.status}`);
    console.log(`   Start Date: ${t.start_date || 'NOT SET'}`);
    console.log(`   End Date: ${t.end_date || 'NOT SET'}`);
    console.log(`   Competition Type: ${t.competition_type || 'NOT SET'}`);
    console.log(`   Format: ${t.format || 'NOT SET'}`);
    
    if (t.start_date) {
      const startDate = new Date(t.start_date);
      startDate.setHours(0, 0, 0, 0);
      const isUpcoming = startDate >= today;
      console.log(`   Is Upcoming: ${isUpcoming ? '✅ YES' : '❌ NO (past tournament)'}`);
    } else {
      console.log(`   Is Upcoming: ⚠️  CANNOT DETERMINE (no start_date)`);
    }
    console.log('');
  });
  
  // Check upcoming only
  const { data: upcoming, error: upcomingError } = await supabase
    .from('tournaments')
    .select('*')
    .gte('start_date', today.toISOString())
    .order('start_date', { ascending: true });
    
  if (upcomingError) {
    console.error('❌ Error fetching upcoming tournaments:', upcomingError.message);
  } else {
    console.log(`\n📅 Upcoming tournaments (start_date >= today): ${upcoming?.length || 0}`);
    if (upcoming && upcoming.length > 0) {
      upcoming.forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.title} - ${t.start_date}`);
      });
    }
  }
}

checkTournaments()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
