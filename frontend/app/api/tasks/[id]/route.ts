import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Task from '@database/models/Task';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/tasks/[id]
 * Update a task
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

    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json();
    const { description, dueDate, completed } = body;

    let updatedTask = null;

    // If marking as completed=true, use completeTask (sets completed_at)
    if (completed === true) {
      updatedTask = await Task.completeTask(taskId, user.guild_id);
      if (!updatedTask) {
        return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      }
    }

    // If description or dueDate provided, apply edit
    if (description !== undefined || dueDate !== undefined) {
      updatedTask = await Task.editTask(
        taskId,
        user.guild_id,
        description !== undefined ? description : undefined,
        dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined
      );
      if (!updatedTask) {
        return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      }
    }

    // Edge case: completed=false is not directly supported by available model methods.
    // The provided Task model exposes completeTask, deleteTask, editTask — no "uncomplete" helper.
    if (completed === false && description === undefined && dueDate === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Uncompleting a task is not supported by the current model API',
        },
        { status: 400 }
      );
    }

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: 'No update fields provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully',
    });
  } catch (error) {
    console.error('[API] Error updating task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
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

    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const deleted = await Task.deleteTask(taskId, user.guild_id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
