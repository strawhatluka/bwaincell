import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Budget from '@database/models/Budget';
import supabase from '@database/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/budget/transactions/[id]
 * Update a budget transaction
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
      type?: string;
      category?: string;
      description?: string | null;
      date?: string;
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
      updateData.type = type;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (date !== undefined) {
      // Parse date as local timezone, not UTC
      let d: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        d = new Date(date + 'T00:00:00');
      } else {
        d = new Date(date);
      }
      updateData.date = d.toISOString();
    }

    const { data: updated, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', transactionId)
      .eq('guild_id', user.guild_id)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
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

    const transactionId = parseInt(params.id, 10);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const deleted = await Budget.deleteEntry(transactionId, user.guild_id);

    if (!deleted) {
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
