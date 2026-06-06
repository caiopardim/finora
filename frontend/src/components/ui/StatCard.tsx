import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, trendValue, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-2xl p-6 border border-gray-100 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>

      {trendValue && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend === 'up' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
            )}
          >
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
          <span className="text-xs text-gray-400">vs mês anterior</span>
        </div>
      )}
    </div>
  );
}
