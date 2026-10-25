import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { chatMessageSchema } from '@/lib/validation/schemas';
import { messagePreview, upsertChatNotifications } from '@/lib/notifications/chatNotifications';
import { getMessageNotificationLink } from '@/lib/notifications/links';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';
const MESSAGE_SELECT = `
  id,
  sender_id,
  recipient_id,
  group_id,
  content,
  is_read,
  created_at,
  sender:sender_id(id, full_name, avatar_url)
`;

async function isMember(groupId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from('chat_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

// GET - Ultimi messaggi del gruppo, in ordine cronologico.
// offset conta dai più recenti: offset=50 restituisce i 50 precedenti.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;
    const user = authResult.data.user;

    if (!(await isMember(id, user.id))) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0);

    const { data: messages, error } = await supabaseServer
      .from('internal_messages')
      .select(MESSAGE_SELECT)
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('chat-groups messages GET failed', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    return NextResponse.json((messages ?? []).reverse());
  } catch (error: unknown) {
    logger.error('chat-groups messages GET exception', error);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

// POST - Invia un messaggio al gruppo e notifica gli altri membri
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;
    const user = authResult.data.user;

    const body = await request.json().catch(() => null);
    const parsed = chatMessageSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
        { status: 400 },
      );
    }
    const { content } = parsed.data;

    const { data: members, error: membersError } = await supabaseServer
      .from('chat_group_members')
      .select('user_id, user:user_id(role), group:group_id(name)')
      .eq('group_id', id);

    if (membersError) {
      logger.error('chat-groups messages POST members failed', membersError);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    if (!members?.some((m) => m.user_id === user.id)) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 });
    }

    const { data: message, error } = await supabaseServer
      .from('internal_messages')
      .insert({
        sender_id: user.id,
        recipient_id: null,
        group_id: id,
        subject: '',
        content,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) {
      logger.error('chat-groups messages POST insert failed', error);
      return NextResponse.json({ error: 'Invio non riuscito' }, { status: 500 });
    }

    const groupName = (members[0]?.group as { name?: string } | null)?.name || 'Gruppo';
    const senderName = (message.sender as { full_name?: string } | null)?.full_name || 'Un utente';

    await Promise.all([
      supabaseServer
        .from('chat_groups')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id),
      upsertChatNotifications(
        members
          .filter((m) => m.user_id !== user.id)
          .map((m) => ({
            userId: m.user_id,
            link: getMessageNotificationLink(
              (m.user as { role?: string } | null)?.role,
              `group-${id}`,
            ),
          })),
        `Nuovo messaggio in ${groupName}`,
        `${senderName}: ${messagePreview(content)}`,
      ),
    ]);

    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    logger.error('chat-groups messages POST exception', error);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
