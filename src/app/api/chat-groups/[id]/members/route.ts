import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';

export const dynamic = 'force-dynamic';

// DELETE - Esce dal gruppo (senza ?user_id) o, se admin del gruppo, rimuove un membro.
// Aggiunta di membri e cambio ruolo non sono esposti: la UI non li prevede.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;
    const user = authResult.data.user;

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('user_id');

    // If no user_id provided, user is leaving the group
    const userIdToRemove = targetUserId || user.id;
    const isSelfLeaving = userIdToRemove === user.id;

    // Get current user's membership
    const { data: currentMembership } = await supabaseServer
      .from('chat_group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 });
    }

    // If trying to remove someone else, must be admin
    if (!isSelfLeaving && currentMembership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo gli admin possono rimuovere membri' },
        { status: 403 },
      );
    }

    // L'ultimo admin che esce passa il ruolo al membro più anziano;
    // se non resta nessuno il gruppo viene eliminato.
    if (isSelfLeaving && currentMembership.role === 'admin') {
      const { data: others } = await supabaseServer
        .from('chat_group_members')
        .select('user_id, role')
        .eq('group_id', id)
        .neq('user_id', user.id)
        .order('joined_at', { ascending: true });

      if (!others || others.length === 0) {
        const { error: deleteError } = await supabaseServer
          .from('chat_groups')
          .delete()
          .eq('id', id);
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }

      if (!others.some((m) => m.role === 'admin')) {
        await supabaseServer
          .from('chat_group_members')
          .update({ role: 'admin' })
          .eq('group_id', id)
          .eq('user_id', others[0].user_id);
      }
    }

    const { error } = await supabaseServer
      .from('chat_group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userIdToRemove);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Errore interno del server';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
