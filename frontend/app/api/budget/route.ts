import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Budget from '@database/models/Budget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/budget
 * Returns recent budget transactions for the authenticated user's guild
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

    const transactions = await Budget.getRecentEntries(user.guild_id, 100);

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('[API] GET /api/budget error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch budget transactions',
      },
      { status: 500 }
    );
  }
}
