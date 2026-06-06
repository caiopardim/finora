'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

interface MonthlyChartProps {
  data: Array<{ month: string; type: string; total: number }>;
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const months = Array.from(new Set(data.map((d) => d.month))).sort();

  const chartData = months.map((month) => {
    const income = data.find((d) => d.month === month && d.type === 'income')?.total || 0;
    const expense = data.find((d) => d.month === month && d.type === 'expense')?.total || 0;
    return {
      month: dayjs(month).locale('pt-br').format('MMM/YY'),
      Receitas: income,
      Despesas: expense,
    };
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Receitas vs Despesas</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
          <Legend />
          <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
