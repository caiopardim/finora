'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import AddTransactionModal from '@/components/ui/AddTransactionModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

function fmt(v: number) { return formatCurrency(v); }

export default function TransactionsPage() {
  const { c } = useTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [count, setCount]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<any | null>(null);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [filters, setFilters] = useState({ type: '', start_date: '', end_date: '' });
  const [page, setPage] = useState(0);
  const limit = 20;

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    let q = supabase.from('transactions')
      .select('id,type,amount,description,date,source,recurring_template_id,categories(name,icon,color)', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * limit, page * limit + limit - 1);

    if (filters.type)       q = q.eq('type', filters.type);
    if (filters.start_date) q = q.gte('date', filters.start_date);
    if (filters.end_date)   q = q.lte('date', filters.end_date);

    const { data, count: total } = await q;
    setTransactions(data || []);
    setCount(total || 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filters, page]);

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Transações</h1>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>{count} registros encontrados</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>
          <Plus size={16}/> Nova
        </button>
      </div>

      {transactions.length > 0 && (
        <div className="grid-stats" style={{ marginBottom: 20 }}>
          {[
            { label: 'Receitas filtradas', value: fmt(totalIncome),  color: '#22c55e', accent: '#22c55e' },
            { label: 'Despesas filtradas', value: fmt(totalExpense), color: '#ef4444', accent: '#ef4444' },
            { label: 'Balanço',            value: fmt(totalIncome - totalExpense), color: totalIncome >= totalExpense ? '#22c55e' : '#ef4444', accent: '#6366f1' },
            { label: 'Transações',         value: String(transactions.length), color: '#6366f1', accent: '#6366f1' },
          ].map(s => (
            <div key={s.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '14px 18px', borderTop: `3px solid ${s.accent}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '14px 18px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['', 'Todos'], ['income', '💰 Receitas'], ['expense', '💸 Despesas']].map(([v, l]) => (
            <button key={v} onClick={() => { setPage(0); setFilters({ ...filters, type: v }); }} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: filters.type === v ? c.text : c.inputBg, color: filters.type === v ? c.surface : c.textMuted }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['start_date', 'end_date'] as const).map(k => (
            <input key={k} type="date" value={filters[k]} onChange={e => { setPage(0); setFilters({ ...filters, [k]: e.target.value }); }} style={{ flex: 1, minWidth: 120, padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${c.border}`, fontSize: 13, color: c.textSecondary, background: c.bg, outline: 'none' }}/>
          ))}
          {(filters.type || filters.start_date || filters.end_date) && (
            <button onClick={() => { setPage(0); setFilters({ type: '', start_date: '', end_date: '' }); }} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', background: '#fef2f2', fontWeight: 500 }}>Limpar</button>
          )}
        </div>
      </div>

      <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 40, color: c.textFaint, fontSize: 14 }}>Carregando...</p>
        ) : transactions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 48, color: c.textFaint, fontSize: 14 }}>Nenhuma transação encontrada.</p>
        ) : (
          <div style={{ padding: '4px 20px' }}>
            {transactions.map((tx, i) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < transactions.length-1 ? `1px solid ${c.bg}` : 'none' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: ((tx.categories as any)?.color||'#6366f1')+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {(tx.categories as any)?.icon || (tx.type==='income'?'💰':'💸')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontWeight: 500, fontSize: 14, color: c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: c.textFaint }}>{(tx.categories as any)?.name||'Sem categoria'}</span>
                    <span style={{ color: c.border }}>·</span>
                    <span style={{ fontSize: 12, color: c.textFaint }}>{new Date(tx.date+'T12:00').toLocaleDateString('pt-BR')}</span>
                    {tx.source==='whatsapp' && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', fontWeight: 600, padding: '1px 7px', borderRadius: 99 }}>💬 WhatsApp</span>}
                  </div>
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: tx.type==='income'?'#16a34a':'#dc2626', flexShrink: 0 }}>
                  {tx.type==='income'?'+':'-'} {fmt(Number(tx.amount))}
                </p>
                <button onClick={() => setEditTx(tx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint, fontSize: 13, padding: '0 4px' }}>✏️</button>
                <button onClick={() => { setConfirmDeleteId(tx.id); setConfirmDeleteTx(tx); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.borderLight, fontSize: 16, padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {count > limit && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${c.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button disabled={page===0} onClick={() => setPage(p=>p-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textSecondary, fontSize: 13, opacity: page===0?0.4:1 }}>← Anterior</button>
            <span style={{ fontSize: 13, color: c.textFaint }}>Página {page+1} de {Math.ceil(count/limit)}</span>
            <button disabled={(page+1)*limit>=count} onClick={() => setPage(p=>p+1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textSecondary, fontSize: 13, opacity: (page+1)*limit>=count?0.4:1 }}>Próxima →</button>
          </div>
        )}
      </div>

      {confirmDeleteId && confirmDeleteTx && (
        confirmDeleteTx.recurring_template_id ? (
          /* Modal especial para transações recorrentes */
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
            <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 420, padding: 28, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: c.text }}>🔄 Transação recorrente</p>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: c.textMuted }}>Esta transação é gerada automaticamente. O que deseja fazer?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  // Deleta só esse mês e marca como skip
                  await supabase.from('transactions').delete().eq('id', confirmDeleteId).eq('user_id', session.user.id);
                  const month = new Date().toISOString().slice(0, 7);
                  await supabase.from('recurring_skips').upsert({ user_id: session.user.id, template_id: confirmDeleteTx.recurring_template_id, month });
                  setConfirmDeleteId(null); setConfirmDeleteTx(null); load();
                }} style={{ padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  🗓️ Excluir só este mês
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: c.textMuted, fontWeight: 400 }}>A recorrência continua nos próximos meses</p>
                </button>
                <button onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  // Deleta a transação e desativa o template
                  await supabase.from('transactions').delete().eq('id', confirmDeleteId).eq('user_id', session.user.id);
                  await supabase.from('recurring_templates').update({ active: false }).eq('id', confirmDeleteTx.recurring_template_id).eq('user_id', session.user.id);
                  setConfirmDeleteId(null); setConfirmDeleteTx(null); load();
                }} style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid #ef4444', background: '#fef2f2', color: '#dc2626', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  🚫 Excluir e parar recorrência
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 400 }}>Não será mais gerada nos próximos meses</p>
                </button>
                <button onClick={() => { setConfirmDeleteId(null); setConfirmDeleteTx(null); }} style={{ padding: '11px', borderRadius: 12, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ConfirmModal
            title="Excluir transação?"
            message="Esta transação será removida permanentemente do seu histórico."
            confirmLabel="Excluir"
            onConfirm={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;
              const { error } = await supabase.from('transactions').delete().eq('id', confirmDeleteId).eq('user_id', session.user.id);
              if (error) { alert('Erro ao excluir: ' + error.message); return; }
              setConfirmDeleteId(null); setConfirmDeleteTx(null); load();
            }}
            onCancel={() => { setConfirmDeleteId(null); setConfirmDeleteTx(null); }}
          />
        )
      )}
      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }}/>}
      {editTx && <AddTransactionModal transaction={editTx} onClose={() => setEditTx(null)} onSuccess={() => { setEditTx(null); load(); }}/>}
    </div>
  );
}
