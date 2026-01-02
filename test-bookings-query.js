// Test script per verificare la connessione al database e la tabella bookings
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leggi .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabili d\'ambiente mancanti!');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'presente' : 'MANCANTE');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'presente' : 'MANCANTE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBookings() {
  console.log('🔍 Test connessione Supabase...\n');

  // Test 1: Count con bypass RLS
  console.log('📊 Test 1: Conteggio prenotazioni (senza RLS - service role)');
  console.log('⚠️ Nota: questo test usa ANON key quindi le RLS policies si applicano');
  const { count, error: countError } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Errore:', countError);
  } else {
    console.log('✅ Numero totale di prenotazioni visibili:', count);
  }

  // Test 2: Select semplice
  console.log('\n📊 Test 2: Select di tutte le prenotazioni (max 10)');
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('❌ Errore:', error);
  } else {
    console.log('✅ Prenotazioni trovate:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('\nPrima prenotazione:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️ Nessuna prenotazione trovata. Questo potrebbe essere dovuto a:');
      console.log('   1. Non ci sono prenotazioni nel database');
      console.log('   2. Le RLS policies bloccano l\'accesso (auth.uid() è NULL)');
      console.log('   3. L\'utente non ha il ruolo admin/gestore/maestro');
    }
  }

  // Test 3: Verifica ruolo utente corrente
  console.log('\n📊 Test 3: Verifica autenticazione');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Utente autenticato:', user ? `Sì (${user.id})` : 'No (anonimo)');
  
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Errore lettura profilo:', profileError);
    } else {
      console.log('Ruolo utente:', profile?.role);
      console.log('Email:', profile?.email);
    }
  } else {
    console.log('⚠️ Nessun utente autenticato - le RLS policies bloccheranno l\'accesso');
  }

  // Test 4: Verifica schema
  console.log('\n📊 Test 4: Test query diretta RPC');
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_my_role');
  
  if (rpcError) {
    console.error('❌ Errore RPC:', rpcError);
  } else {
    console.log('✅ get_my_role() ritorna:', rpcData || 'NULL');
  }
}

testBookings().then(() => {
  console.log('\n✅ Test completato');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Errore durante il test:', err);
  process.exit(1);
});
