'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import { Trash2, Pencil } from 'lucide-react';
import { Transaction } from '@/types';
import api from '@/lib/api';

interface Props {
  transactions: Transaction[];
  onRefresh: () => void;
}

export default function TransactionList({ transactions, onRefresh }: Props) {
  async function handleDelete(id: string) {
    if (!confirm('Excluir esta transação?')) return;
    await api.delete(`/transactions/${id}`);
    onRefresh();
  }

  if (!transactions.length) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Nenhuma transação encontrada.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-50">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: tx.categories?.color + '20' || '#f3f4f6' }}
          >
            {tx.categories?.icon || (tx.type === 'income' ? '💰' : '💸')}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
            <p className="text-xs text-gray-400">
              {tx.categories?.name || 'Sem categoria'} · {formatDate(tx.date)}
              {tx.source === 'whatsapp' && ' · 💬'}
            </p>
          </div>

          <div className="text-right">
            <p
              className={`text-sm font-semibold ${
                tx.type === 'income' ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
            </p>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleDelete(tx.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
