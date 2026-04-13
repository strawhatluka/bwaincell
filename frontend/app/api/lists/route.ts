import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/lists
 * Retrieve all lists for the authenticated user's guild
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database to access guildId
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { guildId: true },
    });

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

    // Fetch all lists for this guild
    const lists = await prisma.list.findMany({
      where: { guildId: user.guildId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: lists });
  } catch (error) {
    console.error('[API] Error fetching lists:', error);

    // Log more details about the error
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

    // Get user from database to access guildId and discordId
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { guildId: true, discordId: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Check if list with this name already exists (case-insensitive)
    const existingList = await prisma.list.findFirst({
      where: {
        guildId: user.guildId,
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingList) {
      return NextResponse.json(
        { success: false, error: 'A list with this name already exists' },
        { status: 400 }
      );
    }

    // Create new list
    const list = await prisma.list.create({
      data: {
        name: name.trim(),
        userId: user.discordId,
        guildId: user.guildId,
        items: [],
      },
    });

    return NextResponse.json({ success: true, data: list }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating list:', error);

    // Log more details about the error
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
