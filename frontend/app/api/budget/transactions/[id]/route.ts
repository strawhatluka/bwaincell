import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';
import { BudgetType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/budget/transactions/[id]
 * Update a budget transaction
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

    const transactionId = parseInt(params.id, 10);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, type, category, description, date } = body;

    // Build update data object
    const updateData: {
      amount?: number;
      type?: BudgetType;
      category?: string;
      description?: string | null;
      date?: Date;
    } = {};

    if (amount !== undefined) {
      if (typeof amount !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Amount must be a number' },
          { status: 400 }
        );
      }
      updateData.amount = amount;
    }

    if (type !== undefined) {
      if (type !== 'income' && type !== 'expense') {
        return NextResponse.json(
          { success: false, error: "Type must be 'income' or 'expense'" },
          { status: 400 }
        );
      }
      updateData.type = type as BudgetType;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (date !== undefined) {
      // Parse date as local timezone, not UTC
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Append local midnight time to prevent UTC conversion
        updateData.date = new Date(date + 'T00:00:00');
      } else {
        updateData.date = new Date(date);
      }
    }

    // Update transaction
    const updatedTransaction = await prisma.budget.updateMany({
      where: {
        id: transactionId,
        guildId: user.guildId,
      },
      data: updateData,
    });

    if (updatedTransaction.count === 0) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch and return updated transaction
    const transaction = await prisma.budget.findUnique({
      where: { id: transactionId },
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    console.error('[API] Error updating transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget/transactions/[id]
 * Delete a budget transaction
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

    const transactionId = parseInt(params.id, 10);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    // Delete transaction
    const deletedTransaction = await prisma.budget.deleteMany({
      where: {
        id: transactionId,
        guildId: user.guildId,
      },
    });

    if (deletedTransaction.count === 0) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
