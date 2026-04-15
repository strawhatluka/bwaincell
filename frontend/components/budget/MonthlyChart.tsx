'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Transaction {
  id: number;
  userId: string;
  guildId: string;
  amount: number | { toNumber: () => number }; // Prisma Decimal or number
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyChartProps {
  transactions: Transaction[];
}

export function MonthlyChart({ transactions }: MonthlyChartProps) {
  const chartData = useMemo(() => {
    const categoryMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((transaction) => {
      const existing = categoryMap.get(transaction.category) || {
        income: 0,
        expense: 0,
      };
      const amount =
        typeof transaction.amount === 'number' ? transaction.amount : Number(transaction.amount);
      if (transaction.type === 'income') {
        existing.income += amount;
      } else {
        existing.expense += amount;
      }
      categoryMap.set(transaction.category, existing);
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      income: data.income,
      expense: data.expense,
    }));
  }, [transactions]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : Number(t.amount)), 0);
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : Number(t.amount)), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Budget Overview</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800 font-medium mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-600">${totals.income.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800 font-medium mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">${totals.expense.toFixed(2)}</p>
        </div>
        <div className={`p-4 rounded-lg ${totals.balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <p
            className={`text-sm font-medium mb-1 ${
              totals.balance >= 0 ? 'text-blue-800' : 'text-orange-800'
            }`}
          >
            Net Balance
          </p>
          <p
            className={`text-2xl font-bold ${
              totals.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`}
          >
            ${totals.balance.toFixed(2)}
          </p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="income" fill="#10b981" name="Income" />
            <Bar dataKey="expense" fill="#ef4444" name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data to display. Add transactions to see the chart.
        </div>
      )}
    </div>
  );
}
