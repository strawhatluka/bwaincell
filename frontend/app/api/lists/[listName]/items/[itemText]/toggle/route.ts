import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import List from '@database/models/List';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/lists/[listName]/items/[itemText]/toggle
 * Toggle the completion status of an item
 */
export async function PATCH(
  _request: NextRequest,
  props: { params: Promise<{ listName: string; itemText: string }> }
) {
  const { listName: rawListName, itemText: rawItemText } = await props.params;
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
    const itemText = decodeURIComponent(rawItemText);

    const updatedList = await List.toggleItem(user.guild_id, listName, itemText);

    if (!updatedList) {
      return NextResponse.json(
        { success: false, error: 'List or item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedList,
      message: 'Item toggled successfully',
    });
  } catch (error) {
    console.error('[API] Error toggling item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to toggle item',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
