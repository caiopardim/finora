'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  /** Tipo pré-selecionado ao abrir para um novo lançamento (receita/despesa). */
  initialType?: 'income' | 'expense';
  transaction?: {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category_id?: string | null;
    wallet_id?: string | null;
    date: string;
  };
}

function fmtDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseDisplay(display: string): number {
  return parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;
}
function toRawDigits(n: number): string {
  return Math.round(n * 100).toString();
}

export default function AddTransactionModal({ onClose, onSuccess, transaction, initialType }: Props) {
  const { c } = useTheme();
  const isEdit = !!transaction;

  const [rawDigits, setRawDigits] = useState(transaction ? toRawDigits(transaction.amount) : '');
  const [form, setForm] = useState({
    type:        (transaction?.type ?? initialType ?? 'expense') as 'income' | 'expense',
    description: transaction?.description ?? '',
    category_id: transaction?.category_id ?? '',
    wallet_id:   transaction?.wallet_id ?? '',
    date:        transaction?.date ?? new Date().toISOString().split('T')[0],
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const uid = session.user.id;
      Promise.all([
        supabase.from('categories').select('id,name,icon,type').eq('user_id', uid).order('name'),
        supabase.from('wallets').select('id,name,icon,color,type').eq('user_id', uid).order('name'),
      ]).then(([catsRes, walletsRes]) => {
        setCategories(catsRes.data || []);
        setWallets(walletsRes.data || []);
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const amount = parseDisplay(fmtDisplay(rawDigits));
    if (!amount) { setError('Informe um valor válido'); setLoading(false); return; }

    const payload = {
      type:        form.type,
      amount,
      description: form.description,
      category_id: form.category_id || null,
      wallet_id:   form.wallet_id   || null,
      date:        form.date,
    };

    if (isEdit) {
      const { error: err } = await supabase.from('transactions').update(payload).eq('id', transaction!.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Não autenticado'); setLoading(false); return; }
      const { error: err } = await supabase.from('transactions').insert({ ...payload, user_id: user.id, source: 'web' });
      if (err) { setError(err.message); setLoading(false); return; }
    }

    onSuccess();
    setLoading(false);
  }

  const filteredCategories = categories.filter(cat => cat.type === form.type || cat.type === 'both');

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: `1px solid ${c.border}`, maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: c.text }}>
            {isEdit ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint, display: 'flex' }}><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t, category_id: '' })} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                background: form.type === t ? (t === 'expense' ? '#fee2e2' : '#dcfce7') : c.inputBg,
                color:      form.type === t ? (t === 'expense' ? '#dc2626'  : '#16a34a') : c.textMuted,
              }}>
                {t === 'expense' ? '💸 Despesa' : '💰 Receita'}
              </button>
            ))}
          </div>

          {/* Wallet selector — visual cards */}
          {wallets.length > 0 && (
            <div>
              <label style={labelStyle}>
                {form.type === 'expense' ? '🏦 De qual conta sai?' : '🏦 Para qual conta entra?'}
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {wallets.map(w => {
                  const selected = form.wallet_id === w.id;
                  return (
                    <button key={w.id} type="button" onClick={() => setForm(f => ({ ...f, wallet_id: selected ? '' : w.id }))} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10,
                      border: `2px solid ${selected ? w.color : c.border}`,
                      background: selected ? w.color + '20' : c.surface,
                      cursor: 'pointer', fontSize: 13, fontWeight: selected ? 700 : 400,
                      color: selected ? w.color : c.textMuted,
                    }}>
                      <span style={{ fontSize: 16 }}>{w.icon}</span>
                      {w.name}
                    </button>
                  );
                })}
              </div>
              {!form.wallet_id && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: c.textFaint }}>Nenhuma conta selecionada</p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label style={labelStyle}>Valor (R$)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: c.textMuted, pointerEvents: 'none' }}>R$</span>
              <input type="text" inputMode="numeric" required value={fmtDisplay(rawDigits)}
                onChange={e => setRawDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="0,00" style={{ ...inputStyle, paddingLeft: 36 }}/>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <input type="text" required value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Almoço no restaurante" style={inputStyle}/>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
              <option value="">Selecionar categoria</option>
              {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle}/>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(34,197,94,0.3)' }}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
