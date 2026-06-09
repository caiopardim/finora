import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import * as dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async getReportData(userId: string) {
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const lastMonthStart = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const lastMonthEnd = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
    const yearStart = dayjs().startOf('year').format('YYYY-MM-DD');

    const [todayData, monthData, lastMonthData, yearData, categoryData, billsData] =
      await Promise.all([
        this.supabase
          .from('transactions')
          .select('type, amount, description, categories(name)')
          .eq('user_id', userId)
          .eq('date', today),

        this.supabase
          .from('transactions')
          .select('type, amount, categories(name)')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', today),

        this.supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', userId)
          .gte('date', lastMonthStart)
          .lte('date', lastMonthEnd),

        this.supabase
          .from('transactions')
          .select('type, amount, categories(name)')
          .eq('user_id', userId)
          .gte('date', yearStart)
          .lte('date', today),

        this.supabase
          .from('category_spending')
          .select('*')
          .eq('user_id', userId)
          .gte('month', monthStart),

        this.supabase
          .from('bills')
          .select('*')
          .eq('user_id', userId)
          .eq('paid', false)
          .gte('due_date', today)
          .lte('due_date', dayjs().add(7, 'day').format('YYYY-MM-DD')),
      ]);

    const summarize = (rows: any[]) => ({
      income: rows?.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0) || 0,
      expense: rows?.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0) || 0,
    });

    const today_ = summarize(todayData.data || []);
    const month_ = summarize(monthData.data || []);
    const lastMonth_ = summarize(lastMonthData.data || []);
    const year_ = summarize(yearData.data || []);

    // Compute top spending categories from month transactions
    const categoryTotals: Record<string, number> = {};
    for (const tx of monthData.data || []) {
      if (tx.type === 'expense') {
        const cat = (tx.categories as any)?.name ?? 'Outros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
      }
    }
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    // Today's transactions formatted
    const todayTransactions = (todayData.data || []).map((t: any) => ({
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: (t.categories as any)?.name ?? 'Outros',
    }));

    return {
      today: {
        ...today_,
        balance: today_.income - today_.expense,
        isPositive: today_.income >= today_.expense,
        transactions: todayTransactions,
      },
      currentMonth: {
        ...month_,
        balance: month_.income - month_.expense,
        isPositive: month_.income >= month_.expense,
        topSpendingCategory: topCategories[0] ?? null,
        topCategories,
      },
      lastMonth: {
        ...lastMonth_,
        balance: lastMonth_.income - lastMonth_.expense,
        isPositive: lastMonth_.income >= lastMonth_.expense,
      },
      comparison: {
        expenseDiff: month_.expense - lastMonth_.expense,
        expenseDiffPercent:
          lastMonth_.expense > 0
            ? (((month_.expense - lastMonth_.expense) / lastMonth_.expense) * 100).toFixed(1)
            : null,
        spendingMore: month_.expense > lastMonth_.expense,
      },
      year: { ...year_, balance: year_.income - year_.expense },
      billsDueThisWeek: (billsData.data || []).map((b: any) => ({
        description: b.description,
        amount: b.amount,
        due_date: b.due_date,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async getMonthlyHistory(userId: string, months = 6) {
    const start = dayjs().subtract(months - 1, 'month').startOf('month').format('YYYY-MM-DD');

    const { data } = await this.supabase
      .from('monthly_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('month', start)
      .order('month');

    return data || [];
  }
}
