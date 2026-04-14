import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ListItem {
  text: string;
  completed: boolean;
  added_at: string;
}

/**
 * POST /api/lists/[listName]/items
 * Add an item to a list
 */
export async function POST(request: NextRequest, props: { params: Promise<{ listName: string }> }) {
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
    const body = await request.json();
    const { item } = body;

    if (!item || typeof item !== 'string' || item.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Item text is required' }, { status: 400 });
    }

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

    // Create new item
    const newItem: ListItem = {
      text: item.trim(),
      completed: false,
      added_at: new Date().toISOString(),
    };

    // Add item to array
    const updatedItems = [...items, newItem];

    // Update list with new items array
    const updatedList = await prisma.list.update({
      where: { id: list.id },
      data: { items: updatedItems as any },
    });

    return NextResponse.json({
      success: true,
      data: updatedList,
      message: 'Item added successfully',
    });
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
