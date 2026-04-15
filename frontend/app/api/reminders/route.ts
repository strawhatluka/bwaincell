import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Reminder from '@database/models/Reminder';

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

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const reminders = await Reminder.getUserReminders(user.guild_id);

    // Convert time field to HH:MM string format if it's a DateTime/ISO string
    const formattedReminders = (reminders || []).map((reminder: any) => {
      let timeStr = reminder.time;
      if (timeStr && typeof timeStr === 'string') {
        // If ISO format, extract HH:MM
        if (timeStr.includes('T')) {
          timeStr = timeStr.substring(11, 16);
        } else if (timeStr.length >= 5) {
          timeStr = timeStr.substring(0, 5);
        }
      } else if (timeStr instanceof Date) {
        timeStr = timeStr.toISOString().substring(11, 16);
      }
      return {
        ...reminder,
        time: timeStr,
      };
    });

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
