'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface CategoryPieChartProps {
  data: Array<{ category_name: string; total: number; icon: string; color: string }>;
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const topCategories = data.slice(0, 8);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Gastos por Categoria</h2>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={topCategories}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="total"
            nameKey="category_name"
          >
            {topCategories.map((entry, index) => (
              <Cell key={index} fill={entry.color || `hsl(${index * 40}, 70%, 50%)`} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend
            formatter={(value, entry: any) =>
              `${entry.payload.icon} ${value}`
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
