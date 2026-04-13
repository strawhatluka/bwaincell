import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/reminders
 * Returns all active reminders for the authenticated user's guild
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { guildId: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const reminders = await prisma.reminder.findMany({
      where: {
        guildId: user.guildId,
        active: true,
      },
      orderBy: { nextTrigger: 'asc' },
    });

    // Convert time field from DateTime to string (HH:MM format)
    const formattedReminders = reminders.map((reminder) => ({
      ...reminder,
      time: reminder.time.toISOString().substring(11, 16),
    }));

    return NextResponse.json({
      success: true,
      data: formattedReminders,
    });
  } catch (error) {
    console.error('[API] GET /api/reminders error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reminders',
      },
      { status: 500 }
    );
  }
}
