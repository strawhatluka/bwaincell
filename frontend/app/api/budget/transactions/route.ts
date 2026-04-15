import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User } from '@database/models/User';
import Budget from '@database/models/Budget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/budget/transactions
 * Retrieve recent budget transactions for the authenticated user's guild
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

    const transactions = await Budget.getRecentEntries(user.guild_id, 100);

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('[API] Error fetching budget transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/transactions
 * Create a new budget transaction
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
    const { amount, type, category, description } = body;

    // Validate required fields
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Amount is required and must be a number' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'income' && type !== 'expense')) {
      return NextResponse.json(
        { success: false, error: "Type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }

    if (type === 'expense' && (!category || typeof category !== 'string')) {
      return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
    }

    let transaction;
    if (type === 'expense') {
      transaction = await Budget.addExpense(
        user.guild_id,
        category,
        amount,
        description || undefined,
        user.discord_id
      );
    } else {
      transaction = await Budget.addIncome(
        user.guild_id,
        amount,
        description || undefined,
        user.discord_id
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: transaction,
        message: 'Transaction created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating budget transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
