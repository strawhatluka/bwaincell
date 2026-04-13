/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize, Op, fn, col } from 'sequelize';
import schemas from '../schema';

// Define budget type enum
type BudgetType = 'expense' | 'income';

// Define attributes interface matching the schema
interface BudgetAttributes {
  id: number;
  type: BudgetType;
  category?: string | null;
  amount: number;
  description?: string | null;
  date: Date;
  user_id: string;
  guild_id: string;
}

// Creation attributes (id and date are optional during creation)
interface BudgetCreationAttributes
  extends Optional<BudgetAttributes, 'id' | 'date' | 'category' | 'description'> {}

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

const BudgetBase = Model as any;
class Budget extends BudgetBase<BudgetAttributes, BudgetCreationAttributes> {
  // Commenting out public fields to prevent Sequelize warnings
  // public id!: number;
  // public type!: BudgetType;
  // public category?: string | null;
  // public amount!: number;
  // public description?: string | null;
  // public date!: Date;
  // public user_id!: string;
  // public guild_id!: string;

  static init(sequelize: Sequelize) {
    return Model.init.call(this as any, schemas.budget, {
      sequelize,
      modelName: 'Budget',
      tableName: 'budgets',
      timestamps: false,
    });
  }

  static async addExpense(
    guildId: string,
    category: string,
    amount: number,
    description: string | null = null,
    userId?: string
  ): Promise<Budget> {
    return await (this as any).create({
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      type: 'expense',
      category,
      amount,
      description,
    });
  }

  static async addIncome(
    guildId: string,
    amount: number,
    description: string | null = null,
    userId?: string
  ): Promise<Budget> {
    return await (this as any).create({
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      type: 'income',
      category: 'Income',
      amount,
      description,
    });
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getSummary(guildId: string, month: number | null = null): Promise<BudgetSummary> {
    const where: Record<string, unknown> = { guild_id: guildId };

    if (month) {
      const year = new Date().getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      where.date = { [Op.between]: [startDate, endDate] };
    } else {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      where.date = { [Op.between]: [startOfMonth, endOfMonth] };
    }

    const entries = await (this as any).findAll({ where });

    const income = entries
      .filter((e: Budget) => e.type === 'income')
      .reduce((sum: number, e: Budget) => sum + Number(e.amount), 0);

    const expenses = entries
      .filter((e: Budget) => e.type === 'expense')
      .reduce((sum: number, e: Budget) => sum + Number(e.amount), 0);

    const categories: Record<string, number> = {};
    entries
      .filter((e: Budget) => e.type === 'expense')
      .forEach((e: Budget) => {
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
      entryCount: entries.length,
    };
  }

  static async getCategories(guildId: string): Promise<CategoryResult[]> {
    const result = (await (this as any).findAll({
      where: { guild_id: guildId, type: 'expense' },
      attributes: [
        'category',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['category'],
      raw: true,
    })) as Array<{ category: string; total: string; count: number }>;

    return result
      .map((r) => ({
        category: r.category,
        total: parseFloat(r.total).toFixed(2),
        count: r.count,
      }))
      .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  }

  static async getRecentEntries(guildId: string, limit: number = 10): Promise<Budget[]> {
    return await (this as any).findAll({
      where: { guild_id: guildId },
      order: [['date', 'DESC']],
      limit,
    });
  }

  static async getMonthlyTrend(guildId: string, months: number = 6): Promise<MonthlyTrend[]> {
    const results: MonthlyTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const entries = await (this as any).findAll({
        where: {
          guild_id: guildId,
          date: { [Op.between]: [month, monthEnd] },
        },
      });

      const income = entries
        .filter((e: Budget) => e.type === 'income')
        .reduce((sum: number, e: Budget) => sum + Number(e.amount), 0);

      const expenses = entries
        .filter((e: Budget) => e.type === 'expense')
        .reduce((sum: number, e: Budget) => sum + Number(e.amount), 0);

      results.push({
        month: month.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: income.toFixed(2),
        expenses: expenses.toFixed(2),
        balance: (income - expenses).toFixed(2),
      });
    }

    return results;
  }

  static async deleteEntry(entryId: number, guildId: string): Promise<boolean> {
    const result = await (this as any).destroy({
      where: { id: entryId, guild_id: guildId },
    });

    return result > 0;
  }
}

export default Budget;
