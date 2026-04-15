import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import List from '@database/models/List';

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/lists
 * Retrieve all lists for the authenticated user's guild
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found in database',
          message: 'Please authenticate via Discord bot first to create your user account',
        },
        { status: 404 }
      );
    }

    const lists = await List.getUserLists(user.guild_id);

    return NextResponse.json({ success: true, data: lists });
  } catch (error) {
    console.error('[API] Error fetching lists:', error);

    if (error instanceof Error) {
      console.error('[API] Error name:', error.name);
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lists',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lists
 * Create a new list
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required and cannot be empty' },
        { status: 400 }
      );
    }

    // createList returns null if a list with this name already exists (case-insensitive)
    const list = await List.createList(user.guild_id, name.trim(), user.discord_id);

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'A list with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: list }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating list:', error);

    if (error instanceof Error) {
      console.error('[API] Error name:', error.name);
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create list',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
