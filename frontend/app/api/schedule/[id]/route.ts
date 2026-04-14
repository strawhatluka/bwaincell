import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Schedule from '@database/models/Schedule';
import supabase from '@database/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/schedule/[id]
 * Update a schedule event
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const eventId = parseInt(params.id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ success: false, error: 'Invalid event ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, datetime, event, date, time } = body;

    // Build update data object
    const updateData: {
      event?: string;
      date?: string;
      time?: string;
      description?: string | null;
    } = {};

    // Handle both 'title' and 'event' field names for compatibility
    if (title !== undefined) {
      updateData.event = title;
    } else if (event !== undefined) {
      updateData.event = event;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    // Handle datetime or separate date/time
    if (datetime !== undefined) {
      const dt = new Date(datetime);
      updateData.date = dt.toISOString().split('T')[0]; // YYYY-MM-DD
      updateData.time = dt.toTimeString().split(' ')[0]; // HH:MM:SS
    } else {
      if (date !== undefined) {
        updateData.date = date;
      }
      if (time !== undefined) {
        updateData.time = time;
      }
    }

    const { data: updated, error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', eventId)
      .eq('guild_id', user.guild_id)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Event updated successfully',
    });
  } catch (error) {
    console.error('[API] Error updating schedule event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedule/[id]
 * Delete a schedule event
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const eventId = parseInt(params.id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ success: false, error: 'Invalid event ID' }, { status: 400 });
    }

    const deleted = await Schedule.deleteEvent(eventId, user.guild_id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting schedule event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
