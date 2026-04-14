import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/lists/[listName]
 * Delete a list by name
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ listName: string }> }
) {
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

    const listName = decodeURIComponent(params.listName);

    // Delete the list
    const deletedList = await prisma.list.deleteMany({
      where: {
        guildId: user.guildId,
        name: {
          equals: listName,
          mode: 'insensitive',
        },
      },
    });

    if (deletedList.count === 0) {
      return NextResponse.json({ success: false, error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'List deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting list:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete list',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
