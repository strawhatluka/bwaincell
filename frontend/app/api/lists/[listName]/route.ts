import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import List from '@database/models/List';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/lists/[listName]
 * Delete a list by name
 */
export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ listName: string }> }
) {
  const { listName: rawListName } = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const listName = decodeURIComponent(rawListName);

    const deleted = await List.deleteList(user.guild_id, listName);

    if (!deleted) {
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
