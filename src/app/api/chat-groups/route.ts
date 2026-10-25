import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { createChatGroupSchema } from '@/lib/validation/schemas';
import { upsertChatNotifications } from '@/lib/notifications/chatNotifications';
import { getMessageNotificationLink } from '@/lib/notifications/links';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

const GROUP_SELECT = `
  *,
  members:chat_group_members(
    id,
    user_id,
    role,
    joined_at,
    user:user_id(id, full_name, avatar_url, role)
  )
`;

// GET - Gruppi dell'utente, con ultimo messaggio e numero di messaggi non letti
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;
    const user = authResult.data.user;

    const { data: memberships, error: membershipError } = await supabaseServer
      .from('chat_group_members')
      .select('group_id, last_read_at')
      .eq('user_id', user.id);

    if (membershipError) {
      logger.error('chat-groups GET memberships failed', membershipError);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json([]);
    }

    const groupIds = memberships.map((m) => m.group_id);

    const { data: groups, error: groupsError } = await supabaseServer
      .from('chat_groups')
      .select(GROUP_SELECT)
      .in('id', groupIds);

    if (groupsError) {
      logger.error('chat-groups GET groups failed', groupsError);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    const lastReadByGroup = new Map(memberships.map((m) => [m.group_id, m.last_read_at]));

    const summaries = await Promise.all(
      (groups ?? []).map(async (group) => {
        const lastReadAt = lastReadByGroup.get(group.id);
        const [lastResult, unreadResult] = await Promise.all([
          supabaseServer
            .from('internal_messages')
            .select('id, sender_id, content, created_at')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseServer
            .from('internal_messages')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .neq('sender_id', user.id)
            .gt('created_at', lastReadAt),
        ]);

        return {
          ...group,
          last_message: lastResult.data ?? null,
          unread_count: unreadResult.count ?? 0,
        };
      }),
    );

    return NextResponse.json(summaries);
  } catch (error: unknown) {
    logger.error('chat-groups GET exception', error);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

// POST - Crea un gruppo: il creatore ne è admin, i membri ricevono una notifica
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;
    const user = authResult.data.user;

    const body = await request.json().catch(() => null);
    const parsed = createChatGroupSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
        { status: 400 },
      );
    }
    const { name, description, member_ids } = parsed.data;

    const { data: group, error: groupError } = await supabaseServer
      .from('chat_groups')
      .insert({
        name,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError) {
      logger.error('chat-groups POST insert failed', groupError);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    const otherMemberIds = [...new Set(member_ids)].filter((id) => id !== user.id);
    const membersToInsert = [
      { group_id: group.id, user_id: user.id, role: 'admin' },
      ...otherMemberIds.map((id) => ({ group_id: group.id, user_id: id, role: 'member' })),
    ];

    const { error: membersError } = await supabaseServer
      .from('chat_group_members')
      .insert(membersToInsert);

    if (membersError) {
      // Rollback: senza membri il gruppo non ha senso
      await supabaseServer.from('chat_groups').delete().eq('id', group.id);
      logger.error('chat-groups POST members failed', membersError);
      return NextResponse.json({ error: 'Creazione gruppo non riuscita' }, { status: 400 });
    }

    const { data: completeGroup, error: fetchError } = await supabaseServer
      .from('chat_groups')
      .select(GROUP_SELECT)
      .eq('id', group.id)
      .single();

    if (fetchError) {
      logger.error('chat-groups POST fetch failed', fetchError);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    const creator = completeGroup.members?.find((m) => m.user_id === user.id)?.user;
    await upsertChatNotifications(
      (completeGroup.members ?? [])
        .filter((m) => m.user_id !== user.id)
        .map((m) => ({
          userId: m.user_id,
          link: getMessageNotificationLink(m.user?.role, `group-${group.id}`),
        })),
      `Nuovo gruppo: ${name}`,
      `${creator?.full_name || 'Un utente'} ti ha aggiunto al gruppo`,
    );

    return NextResponse.json(
      { ...completeGroup, last_message: null, unread_count: 0 },
      { status: 201 },
    );
  } catch (error: unknown) {
    logger.error('chat-groups POST exception', error);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
