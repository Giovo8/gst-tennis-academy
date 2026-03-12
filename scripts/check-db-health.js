#!/usr/bin/env node

/**
 * Script di diagnostica per verificare lo stato del database Supabase
 * dopo un periodo di inattività
 * 
 * Esegui con: node scripts/check-db-health.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carica variabili d'ambiente da .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabili d\'ambiente mancanti!');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verifica dello stato del database Supabase...\n');
console.log('━'.repeat(60));

async function checkDatabaseHealth() {
  const results = {
    connection: false,
    tables: {},
    totalRecords: 0,
    errors: []
  };

  try {
    // 1. Test connessione base
    console.log('\n📡 1. Test connessione...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      throw new Error(`Connessione fallita: ${healthError.message}`);
    }
    
    results.connection = true;
    console.log('   ✅ Connessione stabilita con successo');

    // 2. Verifica tabelle principali
    console.log('\n📊 2. Verifica tabelle principali...');
    
    const tables = [
      'profiles',
      'bookings',
      'tournaments',
      'tournament_registrations',
      'arena_stats',
      'arena_challenges',
      'news',
      'notifications'
    ];

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          results.tables[table] = { status: '❌', count: 0, error: error.message };
          results.errors.push(`${table}: ${error.message}`);
          console.log(`   ❌ ${table.padEnd(25)} - Errore: ${error.message}`);
        } else {
          results.tables[table] = { status: '✅', count: count || 0 };
          results.totalRecords += count || 0;
          console.log(`   ✅ ${table.padEnd(25)} - ${count || 0} record`);
        }
      } catch (err) {
        results.tables[table] = { status: '❌', count: 0, error: err.message };
        results.errors.push(`${table}: ${err.message}`);
        console.log(`   ❌ ${table.padEnd(25)} - Errore: ${err.message}`);
      }
    }

    // 3. Verifica integrità dati
    console.log('\n🔐 3. Verifica integrità dati...');
    
    // Conta utenti
    const { count: usersCount, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) {
      console.log('   ❌ Impossibile contare gli utenti');
      results.errors.push(`Profili utente: ${usersError.message}`);
    } else {
      console.log(`   ✅ ${usersCount || 0} profili utente trovati`);
    }

    // Conta prenotazioni attive
    const today = new Date().toISOString();
    const { count: bookingsCount, error: bookingsError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', today);
    
    if (bookingsError) {
      console.log('   ❌ Impossibile contare le prenotazioni');
      results.errors.push(`Prenotazioni: ${bookingsError.message}`);
    } else {
      console.log(`   ✅ ${bookingsCount || 0} prenotazioni future trovate`);
    }

    // Conta tornei attivi
    const { count: tournamentsCount, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('end_date', today);
    
    if (tournamentsError) {
      console.log('   ❌ Impossibile contare i tornei');
      results.errors.push(`Tornei: ${tournamentsError.message}`);
    } else {
      console.log(`   ✅ ${tournamentsCount || 0} tornei attivi/futuri trovati`);
    }

    // 4. Test funzioni RLS
    console.log('\n🔒 4. Test Row Level Security (RLS)...');
    
    const { data: rlsTest, error: rlsError } = await supabase
      .rpc('get_my_role')
      .single();
    
    if (rlsError) {
      console.log('   ⚠️  Funzione RLS non testabile (necessita autenticazione)');
    } else {
      console.log('   ✅ Funzioni RLS operative');
    }

    // 5. Riepilogo finale
    console.log('\n' + '━'.repeat(60));
    console.log('\n📋 RIEPILOGO:');
    console.log('━'.repeat(60));
    console.log(`Stato connessione:     ${results.connection ? '✅ ATTIVA' : '❌ FALLITA'}`);
    console.log(`Tabelle verificate:    ${Object.keys(results.tables).length}`);
    
    const successfulTables = Object.values(results.tables).filter(t => t.status === '✅').length;
    console.log(`Tabelle operative:     ${successfulTables}/${Object.keys(results.tables).length}`);
    console.log(`Record totali:         ${results.totalRecords}`);
    console.log(`Errori rilevati:       ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  ERRORI RILEVATI:');
      results.errors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
    }

    console.log('\n' + '━'.repeat(60));

    // Conclusione
    if (results.connection && results.errors.length === 0) {
      console.log('\n✅ DATABASE COMPLETAMENTE OPERATIVO');
      console.log('   Il database è stato riavviato con successo e tutti i dati');
      console.log('   sono integri. Puoi procedere normalmente.');
      return 0;
    } else if (results.connection && results.errors.length > 0) {
      console.log('\n⚠️  DATABASE PARZIALMENTE OPERATIVO');
      console.log('   La connessione funziona ma ci sono alcuni problemi.');
      console.log('   Rivedi gli errori sopra per maggiori dettagli.');
      return 1;
    } else {
      console.log('\n❌ DATABASE NON OPERATIVO');
      console.log('   Impossibile connettersi al database.');
      console.log('   Verifica che Supabase sia effettivamente attivo.');
      return 2;
    }

  } catch (error) {
    console.error('\n❌ Errore critico durante la verifica:', error.message);
    console.error('\nDettagli:', error);
    return 3;
  }
}

// Esegui la verifica
checkDatabaseHealth()
  .then(exitCode => {
    console.log('\n');
    process.exit(exitCode);
  })
  .catch(err => {
    console.error('\n💥 Errore imprevisto:', err);
    process.exit(99);
  });
