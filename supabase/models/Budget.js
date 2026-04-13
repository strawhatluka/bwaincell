"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = __importDefault(require("../supabase"));
class Budget {
    static async addExpense(guildId, category, amount, description = null, userId) {
        const insert = {
            user_id: userId || 'system', // Keep for audit trail (WO-015)
            guild_id: guildId,
            type: 'expense',
            category,
            amount,
            description,
        };
        const { data, error } = await supabase_1.default
            .from('budgets')
            .insert(insert)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    static async addIncome(guildId, amount, description = null, userId) {
        const insert = {
            user_id: userId || 'system', // Keep for audit trail (WO-015)
            guild_id: guildId,
            type: 'income',
            category: 'Income',
            amount,
            description,
        };
        const { data, error } = await supabase_1.default
            .from('budgets')
            .insert(insert)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // NOTE: Filters by guild_id only for shared household access (WO-015)
    static async getSummary(guildId, month = null) {
        let startDate;
        let endDate;
        if (month) {
            const year = new Date().getFullYear();
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59);
        }
        else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }
        const { data: entries, error } = await supabase_1.default
            .from('budgets')
            .select('*')
            .eq('guild_id', guildId)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString());
        if (error)
            throw error;
        const rows = entries || [];
        const income = rows
            .filter((e) => e.type === 'income')
            .reduce((sum, e) => sum + Number(e.amount), 0);
        const expenses = rows
            .filter((e) => e.type === 'expense')
            .reduce((sum, e) => sum + Number(e.amount), 0);
        const categories = {};
        rows
            .filter((e) => e.type === 'expense')
            .forEach((e) => {
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
    static async getCategories(guildId) {
        const { data, error } = await supabase_1.default
            .from('budgets')
            .select('*')
            .eq('guild_id', guildId)
            .eq('type', 'expense');
        if (error)
            throw error;
        const rows = data || [];
        // Group and sum in JS (replaces Sequelize fn('SUM')/GROUP BY)
        const grouped = {};
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
    static async getRecentEntries(guildId, limit = 10) {
        const { data, error } = await supabase_1.default
            .from('budgets')
            .select('*')
            .eq('guild_id', guildId)
            .order('date', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        return data || [];
    }
    static async getMonthlyTrend(guildId, months = 6) {
        const results = [];
        const now = new Date();
        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const { data: entries, error } = await supabase_1.default
                .from('budgets')
                .select('*')
                .eq('guild_id', guildId)
                .gte('date', monthStart.toISOString())
                .lte('date', monthEnd.toISOString());
            if (error)
                throw error;
            const rows = entries || [];
            const income = rows
                .filter((e) => e.type === 'income')
                .reduce((sum, e) => sum + Number(e.amount), 0);
            const expenses = rows
                .filter((e) => e.type === 'expense')
                .reduce((sum, e) => sum + Number(e.amount), 0);
            results.push({
                month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                income: income.toFixed(2),
                expenses: expenses.toFixed(2),
                balance: (income - expenses).toFixed(2),
            });
        }
        return results;
    }
    static async deleteEntry(entryId, guildId) {
        const { error, count } = await supabase_1.default
            .from('budgets')
            .delete({ count: 'exact' })
            .eq('id', entryId)
            .eq('guild_id', guildId);
        if (error)
            throw error;
        return (count ?? 0) > 0;
    }
}
exports.default = Budget;
//# sourceMappingURL=Budget.js.map