import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase/serverClient';

// GET - Valida un codice invito (pubblico, service role). Il consumo del codice
// avviene solo in POST /api/auth/signup, che ricava il ruolo dal codice stesso.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ valid: false, error: 'Codice richiesto' }, { status: 400 });
  }

  // Use service role to bypass RLS
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, code, role, max_uses, uses_remaining, expires_at')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'Codice non valido' }, { status: 404 });
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Codice scaduto' }, { status: 410 });
  }

  // Check if uses remaining
  if (data.uses_remaining !== null && data.uses_remaining <= 0) {
    return NextResponse.json({ valid: false, error: 'Codice esaurito' }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    role: data.role,
    code: data.code,
    id: data.id,
  });
}
