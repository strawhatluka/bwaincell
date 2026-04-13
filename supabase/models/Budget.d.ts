import type { BudgetRow } from '../types';
interface BudgetSummary {
    income: string;
    expenses: string;
    balance: string;
    categories: CategorySummary[];
    entryCount: number;
}
interface CategorySummary {
    name: string;
    amount: string;
    percentage: string;
}
interface CategoryResult {
    category: string;
    total: string;
    count: number;
}
interface MonthlyTrend {
    month: string;
    income: string;
    expenses: string;
    balance: string;
}
declare class Budget {
    static addExpense(guildId: string, category: string, amount: number, description?: string | null, userId?: string): Promise<BudgetRow>;
    static addIncome(guildId: string, amount: number, description?: string | null, userId?: string): Promise<BudgetRow>;
    static getSummary(guildId: string, month?: number | null): Promise<BudgetSummary>;
    static getCategories(guildId: string): Promise<CategoryResult[]>;
    static getRecentEntries(guildId: string, limit?: number): Promise<BudgetRow[]>;
    static getMonthlyTrend(guildId: string, months?: number): Promise<MonthlyTrend[]>;
    static deleteEntry(entryId: number, guildId: string): Promise<boolean>;
}
export default Budget;
export type { BudgetSummary, CategorySummary, CategoryResult, MonthlyTrend };
//# sourceMappingURL=Budget.d.ts.map