import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import List from '@database/models/List';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/lists/[listName]/items
 * Add an item to a list
 */
export async function POST(request: NextRequest, props: { params: Promise<{ listName: string }> }) {
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
    const body = await request.json();
    const { item } = body;

    if (!item || typeof item !== 'string' || item.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Item text is required' }, { status: 400 });
    }

    const updatedList = await List.addItem(user.guild_id, listName, item.trim());

    if (!updatedList) {
      return NextResponse.json({ success: false, error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedList,
        message: 'Item added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error adding item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add item',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
