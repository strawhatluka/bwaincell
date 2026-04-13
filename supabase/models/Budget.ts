import supabase from '../supabase';
import type { BudgetRow, BudgetInsert } from '../types';

// Define budget type enum
type BudgetType = 'expense' | 'income';

// Interface for budget summary
interface BudgetSummary {
  income: string;
  expenses: string;
  balance: string;
  categories: CategorySummary[];
  entryCount: number;
}

// Interface for category summary
interface CategorySummary {
  name: string;
  amount: string;
  percentage: string;
}

// Interface for category result
interface CategoryResult {
  category: string;
  total: string;
  count: number;
}

// Interface for monthly trend
interface MonthlyTrend {
  month: string;
  income: string;
  expenses: string;
  balance: string;
}

class Budget {
  static async addExpense(
    guildId: string,
    category: string,
    amount: number,
    description: string | null = null,
    userId?: string
  ): Promise<BudgetRow> {
    const insert: BudgetInsert = {
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      type: 'expense' as BudgetType,
      category,
      amount,
      description,
    };

    const { data, error } = await supabase
      .from('budgets')
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async addIncome(
    guildId: string,
    amount: number,
    description: string | null = null,
    userId?: string
  ): Promise<BudgetRow> {
    const insert: BudgetInsert = {
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      type: 'income' as BudgetType,
      category: 'Income',
      amount,
      description,
    };

    const { data, error } = await supabase
      .from('budgets')
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getSummary(guildId: string, month: number | null = null): Promise<BudgetSummary> {
    let startDate: Date;
    let endDate: Date;

    if (month) {
      const year = new Date().getFullYear();
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const { data: entries, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('guild_id', guildId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) throw error;
    const rows = entries || [];

    const income = rows
      .filter((e: BudgetRow) => e.type === 'income')
      .reduce((sum: number, e: BudgetRow) => sum + Number(e.amount), 0);

    const expenses = rows
      .filter((e: BudgetRow) => e.type === 'expense')
      .reduce((sum: number, e: BudgetRow) => sum + Number(e.amount), 0);

    const categories: Record<string, number> = {};
    rows
      .filter((e: BudgetRow) => e.type === 'expense')
      .forEach((e: BudgetRow) => {
        if (e.category) {
          if (!categories[e.category]) {
            categories[e.category] = 0;
          }
          categories[e.category] += Number(e.amount);
        }
      });

    return {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      balance: (income - expenses).toFixed(2),
      categories: Object.entries(categories)
        .map(([name, amount]) => ({
          name,
          amount: amount.toFixed(2),
          percentage: ((amount / expenses) * 100).toFixed(1),
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)),
      entryCount: rows.length,
    };
  }

  static async getCategories(guildId: string): Promise<CategoryResult[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('guild_id', guildId)
      .eq('type', 'expense');

    if (error) throw error;
    const rows = data || [];

    // Group and sum in JS (replaces Sequelize fn('SUM')/GROUP BY)
    const grouped: Record<string, { total: number; count: number }> = {};
    for (const row of rows) {
      const cat = row.category || 'Uncategorized';
      if (!grouped[cat]) {
        grouped[cat] = { total: 0, count: 0 };
      }
      grouped[cat].total += Number(row.amount);
      grouped[cat].count += 1;
    }

    return Object.entries(grouped)
      .map(([category, { total, count }]) => ({
        category,
        total: total.toFixed(2),
        count,
      }))
      .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  }

  static async getRecentEntries(guildId: string, limit: number = 10): Promise<BudgetRow[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('guild_id', guildId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getMonthlyTrend(guildId: string, months: number = 6): Promise<MonthlyTrend[]> {
    const results: MonthlyTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const { data: entries, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('guild_id', guildId)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString());

      if (error) throw error;
      const rows = entries || [];

      const income = rows
        .filter((e: BudgetRow) => e.type === 'income')
        .reduce((sum: number, e: BudgetRow) => sum + Number(e.amount), 0);

      const expenses = rows
        .filter((e: BudgetRow) => e.type === 'expense')
        .reduce((sum: number, e: BudgetRow) => sum + Number(e.amount), 0);

      results.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: income.toFixed(2),
        expenses: expenses.toFixed(2),
        balance: (income - expenses).toFixed(2),
      });
    }

    return results;
  }

  static async deleteEntry(entryId: number, guildId: string): Promise<boolean> {
    const { error, count } = await supabase
      .from('budgets')
      .delete({ count: 'exact' })
      .eq('id', entryId)
      .eq('guild_id', guildId);

    if (error) throw error;
    return (count ?? 0) > 0;
  }
}

export default Budget;
export type { BudgetSummary, CategorySummary, CategoryResult, MonthlyTrend };
