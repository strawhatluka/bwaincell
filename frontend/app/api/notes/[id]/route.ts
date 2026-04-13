import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/notes/[id]
 * Update a note
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const noteId = parseInt(params.id, 10);

    if (isNaN(noteId)) {
      return NextResponse.json({ success: false, error: 'Invalid note ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, tags } = body;

    // Build update data object
    const updateData: {
      title?: string;
      content?: string;
      tags?: string[];
    } = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (content !== undefined) {
      updateData.content = content;
    }

    if (tags !== undefined && Array.isArray(tags)) {
      updateData.tags = tags;
    }

    // Update note
    const updatedNote = await prisma.note.updateMany({
      where: {
        id: noteId,
        guildId: user.guildId,
      },
      data: updateData,
    });

    if (updatedNote.count === 0) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Fetch and return updated note
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

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
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const noteId = parseInt(params.id, 10);

    if (isNaN(noteId)) {
      return NextResponse.json({ success: false, error: 'Invalid note ID' }, { status: 400 });
    }

    // Delete note
    const deletedNote = await prisma.note.deleteMany({
      where: {
        id: noteId,
        guildId: user.guildId,
      },
    });

    if (deletedNote.count === 0) {
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
