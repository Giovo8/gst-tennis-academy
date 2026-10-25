import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

// GET /api/tournaments/[id]/groups - Get groups for a tournament
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = context.params instanceof Promise ? await context.params : context.params;
  const supabase = supabaseServer;

  try {
    // Fetch groups with participants
    const { data: groups, error: groupsError } = await supabase
      .from('tournament_groups')
      .select(
        `
        *,
        tournament:tournaments(title, match_format, surface_type)
      `,
      )
      .eq('tournament_id', params.id)
      .order('group_order');

    if (groupsError) throw groupsError;

    // For each group, fetch participants with standings
    const groupsWithStandings = await Promise.all(
      (groups || []).map(async (group: any) => {
        const { data: standings, error: standingsError } = await supabase.rpc(
          'calculate_group_standings',
          { group_uuid: group.id },
        );

        if (standingsError) {
          console.error('Error calculating standings:', standingsError);
        }

        return {
          ...group,
          standings: standings || [],
        };
      }),
    );

    return NextResponse.json({
      success: true,
      groups: groupsWithStandings,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
