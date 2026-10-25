import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import env from '@/lib/config/env';
import logger from '@/lib/logger/secure-logger';

/** POST /api/admin/users/reset-password — invia all'utente l'email di reimpostazione password. */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Formato email non valido' }, { status: 400 });
    }

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, '');
    const redirectTo = `${appBaseUrl}/auth/reset-password`;

    const { error } = await supabaseServer.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Errore invio reset password', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
