import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/tasks/[id]
 * Update a task
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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

    const taskId = parseInt(params.id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json();
    const { description, dueDate, completed } = body;

    // Build update data object
    const updateData: {
      description?: string;
      dueDate?: Date | null;
      completed?: boolean;
      completedAt?: Date | null;
    } = {};

    if (description !== undefined) {
      updateData.description = description;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    // Update task
    const updatedTask = await prisma.task.updateMany({
      where: {
        id: taskId,
        guildId: user.guildId,
      },
      data: updateData,
    });

    if (updatedTask.count === 0) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Fetch and return updated task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    return NextResponse.json({
      success: true,
      data: task,
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
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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

    const taskId = parseInt(params.id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    // Delete task
    const deletedTask = await prisma.task.deleteMany({
      where: {
        id: taskId,
        guildId: user.guildId,
      },
    });

    if (deletedTask.count === 0) {
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
