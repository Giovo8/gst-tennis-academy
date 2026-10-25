import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import logger from '@/lib/logger/secure-logger';

/** POST /api/admin/users — crea un utente (account Auth + profilo) dal pannello admin. */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, ['admin', 'gestore']);
    if (!auth.success) return auth.response;
    const actorRole = auth.data.profile?.role;

    const body = await request.json();
    const {
      email,
      password,
      full_name,
      role,
      phone,
      date_of_birth,
      birth_city,
      fiscal_code,
      address,
      city,
      province,
      postal_code,
      notes,
    } = body;

    // Validazione input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password sono obbligatorie' }, { status: 400 });
    }

    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Formato email non valido' }, { status: 400 });
    }

    // Validazione password (minimo 6 caratteri)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere almeno 6 caratteri' },
        { status: 400 },
      );
    }

    // Validazione ruolo
    const validRoles = ['atleta', 'maestro', 'gestore', 'admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 });
    }

    // Impedisci a gestore di creare admin
    if (actorRole === 'gestore' && role === 'admin') {
      return NextResponse.json(
        { error: 'I gestori non possono creare utenti admin' },
        { status: 403 },
      );
    }

    const { data: newUser, error: createError } = await supabaseServer.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name?.trim() || email.toLowerCase(),
        role: role || 'atleta',
      },
    });

    if (createError) {
      logger.error('Creazione utente Auth non riuscita', createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser.user) {
      logger.error('Creazione utente Auth senza utente restituito');
      return NextResponse.json({ error: 'Errore creazione utente' }, { status: 500 });
    }

    // Il trigger handle_new_user crea il profilo: qui lo si completa (upsert)
    const profileData = {
      id: newUser.user.id,
      email: email.toLowerCase(),
      full_name: full_name?.trim() || null,
      role: role || 'atleta',
      phone: phone || null,
      date_of_birth: date_of_birth || null,
      bio: notes || null,
      metadata: {
        birth_city: birth_city || null,
        fiscal_code: fiscal_code || null,
        address: address || null,
        city: city || null,
        province: province || null,
        postal_code: postal_code || null,
      },
    };

    const { error: profileError } = await supabaseServer.from('profiles').upsert(profileData, {
      onConflict: 'id',
    });

    if (profileError) {
      // Senza profilo l'account non è utilizzabile: si annulla la creazione
      await supabaseServer.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: 'Errore creazione profilo. Utente non creato.' },
        { status: 500 },
      );
    }

    // Initialize arena_stats
    await supabaseServer.from('arena_stats').upsert(
      {
        user_id: newUser.user.id,
        points: 0,
        level: 'Bronzo',
        wins: 0,
        losses: 0,
        total_matches: 0,
      },
      { onConflict: 'user_id' },
    );

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role,
      },
    });
  } catch (error) {
    logger.error('Errore creazione utente', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users?userId=<id> — elimina l'account Auth e, a cascata,
 * il profilo. Eliminare solo la riga `profiles` lascerebbe attivo il login.
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, ['admin', 'gestore']);
    if (!auth.success) return auth.response;
    const { user, profile } = auth.data;

    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId mancante' }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Non puoi eliminare il tuo account' }, { status: 400 });
    }

    // Come in creazione: un gestore non può agire su un admin
    if (profile?.role === 'gestore') {
      const { data: target } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (target?.role === 'admin') {
        return NextResponse.json({ error: 'Non puoi eliminare un admin' }, { status: 403 });
      }
    }

    const { error: profileDeleteError } = await supabaseServer
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      // Si prosegue comunque: l'account Auth va eliminato in ogni caso
      logger.error('Eliminazione profilo non riuscita', profileDeleteError, { userId });
    }

    const { error: deleteError } = await supabaseServer.auth.admin.deleteUser(userId);
    if (deleteError) {
      logger.error('Eliminazione account Auth non riuscita', deleteError, { userId });
      return NextResponse.json({ error: 'Eliminazione non riuscita' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Errore eliminazione utente', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
