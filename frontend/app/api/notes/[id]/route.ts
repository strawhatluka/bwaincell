import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Note from '@database/models/Note';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/notes/[id]
 * Update a note
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const noteId = parseInt(id, 10);

    if (isNaN(noteId)) {
      return NextResponse.json({ success: false, error: 'Invalid note ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, tags } = body;

    const updates: { title?: string; content?: string; tags?: string[] } = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined && Array.isArray(tags)) updates.tags = tags;

    const note = await Note.updateNote(noteId, user.guild_id, updates);

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: note,
      message: 'Note updated successfully',
    });
  } catch (error) {
    console.error('[API] Error updating note:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update note',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note
 */
export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const noteId = parseInt(id, 10);

    if (isNaN(noteId)) {
      return NextResponse.json({ success: false, error: 'Invalid note ID' }, { status: 400 });
    }

    const deleted = await Note.deleteNote(noteId, user.guild_id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting note:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete note',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
