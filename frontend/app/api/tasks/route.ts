import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Task from '@database/models/Task';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/tasks
 * Returns all tasks for the authenticated user's guild
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const tasks = await Task.getUserTasks(user.guild_id, 'all');

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('[API] GET /api/tasks error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Creates a new task
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
    const { description, dueDate } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    const task = await Task.createTask(
      user.guild_id,
      description.trim(),
      dueDate ? new Date(dueDate) : null,
      user.discord_id
    );

    return NextResponse.json(
      {
        success: true,
        data: task,
        message: 'Task created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] POST /api/tasks error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
