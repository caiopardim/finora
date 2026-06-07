'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  /** Pass an existing transaction to open in edit mode */
  transaction?: {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category_id?: string | null;
    date: string;
  };
}

export default function AddTransactionModal({ onClose, onSuccess, transaction }: Props) {
  const { c } = useTheme();
  const isEdit = !!transaction;

  const [form, setForm] = useState({
    type: (transaction?.type ?? 'expense') as 'income' | 'expense',
    amount: transaction ? String(transaction.amount) : '',
    description: transaction?.description ?? '',
    category_id: transaction?.category_id ?? '',
    date: transaction?.date ?? new Date().toISOString().split('T')[0],
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from('categories')
        .select('id,name,icon,type')
        .eq('user_id', session.user.id)
        .order('name')
        .then(({ data: cats }) => setCategories(cats || []));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description,
      category_id: form.category_id || null,
      date: form.date,
    };

    if (isEdit) {
      const { error: err } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', transaction!.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Não autenticado'); setLoading(false); return; }
      const { error: err } = await supabase.from('transactions').insert({
        ...payload, user_id: user.id, source: 'web',
      });
      if (err) { setError(err.message); setLoading(false); return; }
    }

    onSuccess();
    setLoading(false);
  }

  const filteredCategories = categories.filter(
    (cat) => cat.type === form.type || cat.type === 'both',
  );

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    borderRadius: 10, border: `1.5px solid ${c.border}`,
    fontSize: 14, color: c.text, background: c.input,
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 500, color: c.textMuted, marginBottom: 6,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: `1px solid ${c.border}` }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: c.text }}>
            {isEdit ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint, display: 'flex' }}>
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setForm({ ...form, type: t, category_id: '' })}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  background: form.type === t
                    ? (t === 'expense' ? '#fee2e2' : '#dcfce7')
                    : c.inputBg,
                  color: form.type === t
                    ? (t === 'expense' ? '#dc2626' : '#16a34a')
                    : c.textMuted,
                }}
              >
                {t === 'expense' ? '💸 Despesa' : '💰 Receita'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Valor (R$)</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0,00"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <input
              type="text" required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Almoço no restaurante"
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Categoria</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Selecionar categoria</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Data</label>
            <input
              type="date" required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${c.border}`,
              background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '12px', borderRadius: 12, border: 'none',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(34,197,94,0.3)',
            }}>{loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
