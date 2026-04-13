import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ListItem {
  text: string;
  completed: boolean;
  added_at: string;
}

/**
 * PATCH /api/lists/[listName]/items/[itemText]/toggle
 * Toggle the completion status of an item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { listName: string; itemText: string } }
) {
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
    const itemText = decodeURIComponent(params.itemText);

    // Find the list
    const list = await prisma.list.findFirst({
      where: {
        guildId: user.guildId,
        name: {
          equals: listName,
          mode: 'insensitive',
        },
      },
    });

    if (!list) {
      return NextResponse.json({ success: false, error: 'List not found' }, { status: 404 });
    }

    // Parse existing items
    const items: ListItem[] = Array.isArray(list.items)
      ? (list.items as unknown as ListItem[])
      : [];

    // Find and toggle the item (case-insensitive match)
    let itemFound = false;
    const updatedItems = items.map((item) => {
      if (item.text.toLowerCase() === itemText.toLowerCase()) {
        itemFound = true;
        return {
          ...item,
          completed: !item.completed,
        };
      }
      return item;
    });

    if (!itemFound) {
      return NextResponse.json(
        { success: false, error: 'Item not found in list' },
        { status: 404 }
      );
    }

    // Update list with toggled items array
    const updatedList = await prisma.list.update({
      where: { id: list.id },
      data: { items: updatedItems as any },
    });

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
