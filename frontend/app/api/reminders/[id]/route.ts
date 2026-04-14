import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/reminders/[id]
 * Delete a reminder
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    const reminderId = parseInt(params.id, 10);

    if (isNaN(reminderId)) {
      return NextResponse.json({ success: false, error: 'Invalid reminder ID' }, { status: 400 });
    }

    // Delete reminder
    const deletedReminder = await prisma.reminder.deleteMany({
      where: {
        id: reminderId,
        guildId: user.guildId,
      },
    });

    if (deletedReminder.count === 0) {
      return NextResponse.json({ success: false, error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting reminder:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete reminder',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
