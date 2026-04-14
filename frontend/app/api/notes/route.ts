import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/notes
 * Returns all notes for the authenticated user's guild
 * Supports search query parameter to filter by title or tags
 */
export async function GET(request: NextRequest) {
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

    // Get search query parameter
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('search');

    // Build where clause with search functionality
    const whereClause: any = { guildId: user.guildId };

    if (searchQuery && searchQuery.trim()) {
      // Search in title (case-insensitive) or tags (JSONB array contains)
      whereClause.OR = [
        {
          title: {
            contains: searchQuery.trim(),
            mode: 'insensitive',
          },
        },
        {
          tags: {
            array_contains: [searchQuery.trim()],
          },
        },
      ];
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error('[API] GET /api/notes error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notes',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Creates a new note
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { discordId: true, guildId: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, tags } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    console.log('[API] POST /api/notes - creating note:', {
      title,
      content,
      tags,
      userId: user.discordId,
      guildId: user.guildId,
    });

    const note = await prisma.note.create({
      data: {
        userId: user.discordId,
        guildId: user.guildId,
        title: title.trim(),
        content: content.trim(),
        tags: tags || [],
      },
    });

    return NextResponse.json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error('[API] POST /api/notes error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 });
  }
}
