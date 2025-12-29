import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

async function getUserProfile(req: Request) {
  const authHeader = (req as any).headers?.get?.('authorization') ?? null;
  const token = authHeader?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  
  const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userData?.user) return null;
  
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('id, role')
    .eq('id', userData.user.id)
    .single();
  
  return profile;
}

export async function GET(req: Request) {
  try {
    const profile = await getUserProfile(req);
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin, gestore, or maestro
    const roleLower = String(profile.role).toLowerCase();
    if (!['admin', 'gestore', 'maestro'].includes(roleLower)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users that can be enrolled in tournaments
    const { data: users, error } = await supabaseServer
      .from('profiles')
      .select('id, full_name, email, role')
      .not('role', 'is', null)
      .order('full_name', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to only include relevant roles (case-insensitive)
    const filteredUsers = (users || []).filter(user => {
      const role = String(user.role || '').toLowerCase();
      return ['atleta', 'coach', 'maestro', 'admin', 'gestore'].includes(role);
    });

    return NextResponse.json({ users: filteredUsers });
  } catch (error: any) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
