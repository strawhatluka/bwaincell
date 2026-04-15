import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Note from '@database/models/Note';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/notes
 * Returns all notes for the authenticated user's guild
 * Supports search query parameter to filter by title/content or tags
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const searchQuery = request.nextUrl.searchParams.get('search');

    const notes =
      searchQuery && searchQuery.trim()
        ? await Note.searchNotes(user.guild_id, searchQuery.trim())
        : await Note.getNotes(user.guild_id);

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

    const user = await User.findByEmail(session.user.email);

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

    const note = await Note.createNote(
      user.guild_id,
      title.trim(),
      content.trim(),
      Array.isArray(tags) ? tags : [],
      user.discord_id
    );

    return NextResponse.json(
      {
        success: true,
        data: note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] POST /api/notes error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 });
  }
}
