import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Schedule from '@database/models/Schedule';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/schedule
 * Returns schedule/calendar events for the authenticated user's guild
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filterParam = searchParams.get('filter');
    const filter: 'upcoming' | 'past' | 'all' =
      filterParam === 'past' || filterParam === 'all' ? filterParam : 'upcoming';

    const events = await Schedule.getEvents(user.guild_id, filter);

    return NextResponse.json({
      success: true,
      data: events || [],
    });
  } catch (error) {
    console.error('[API] GET /api/schedule error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
