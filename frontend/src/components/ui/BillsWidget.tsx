'use client';

import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Check } from 'lucide-react';

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
}

interface Props {
  bills: Bill[];
  onRefresh: () => void;
}

export default function BillsWidget({ bills, onRefresh }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function markPaid(bill: Bill) {
    setLoading(bill.id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bills/${bill.id}/pay`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setLoading(null);
    onRefresh();
  }

  if (!bills.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-amber-50 border-b border-amber-100">
        <p className="text-sm font-semibold text-amber-900">⏰ Contas a Vencer Esta Semana</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {bills.map((bill) => (
          <li key={bill.id} className="flex items-center gap-4 px-5 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{bill.description}</p>
              <p className="text-xs text-gray-400">{formatDate(bill.due_date)}</p>
            </div>
            <p className="text-sm font-semibold text-red-600">{formatCurrency(bill.amount)}</p>
            <button
              onClick={() => markPaid(bill)}
              disabled={loading === bill.id}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
              title="Marcar como pago"
            >
              <Check size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
