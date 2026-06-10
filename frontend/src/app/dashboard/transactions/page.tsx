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
  const [monthStats, setMonthStats] = useState({ income: 0, expense: 0 });
  const limit = 20;

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Fetch full month totals (independent of filters/pagination)
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];
    const { data: monthTxs } = await supabase.from('transactions')
      .select('type,amount').eq('user_id', session.user.id)
      .gte('date', monthStart).lte('date', monthEnd);
    const mIncome  = (monthTxs||[]).filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const mExpense = (monthTxs||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    setMonthStats({ income: mIncome, expense: mExpense });

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

      {/* Resumo do mês vigente — sempre visível */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        {[
          { label: `Receitas de ${new Date().toLocaleString('pt-BR',{month:'long'})}`, value: fmt(monthStats.income),  color: '#22c55e', accent: '#22c55e' },
          { label: `Despesas de ${new Date().toLocaleString('pt-BR',{month:'long'})}`, value: fmt(monthStats.expense), color: '#ef4444', accent: '#ef4444' },
          { label: 'Balanço do mês', value: fmt(monthStats.income - monthStats.expense), color: monthStats.income >= monthStats.expense ? '#22c55e' : '#ef4444', accent: '#6366f1' },
          { label: 'Transações', value: String(count), color: '#6366f1', accent: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '14px 18px', borderTop: `3px solid ${s.accent}` }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '14px 18px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Tipo */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['', 'Todos'], ['income', '💰 Receitas'], ['expense', '💸 Despesas']].map(([v, l]) => (
            <button key={v} onClick={() => { setPage(0); setFilters({ ...filters, type: v }); }} style={{ padding: '7px 16px', borderRadius: 8, border: filters.type === v ? '1.5px solid #6366f1' : `1.5px solid ${c.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: filters.type === v ? '#6366f115' : 'transparent', color: filters.type === v ? '#6366f1' : c.textMuted, transition: 'all 0.15s' }}>{l}</button>
          ))}
        </div>

        {/* Atalhos de período */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label: 'Este mês', fn: () => { const n = new Date(); setFilters(f => ({ ...f, start_date: `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, end_date: new Date(n.getFullYear(), n.getMonth()+1, 0).toISOString().split('T')[0] })); setPage(0); } },
            { label: 'Mês passado', fn: () => { const n = new Date(); const m = new Date(n.getFullYear(), n.getMonth()-1, 1); setFilters(f => ({ ...f, start_date: `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-01`, end_date: new Date(m.getFullYear(), m.getMonth()+1, 0).toISOString().split('T')[0] })); setPage(0); } },
            { label: 'Últimos 7 dias', fn: () => { const n = new Date(); const s = new Date(n.getTime() - 6*86400000); setFilters(f => ({ ...f, start_date: s.toISOString().split('T')[0], end_date: n.toISOString().split('T')[0] })); setPage(0); } },
            { label: 'Este ano', fn: () => { const n = new Date(); setFilters(f => ({ ...f, start_date: `${n.getFullYear()}-01-01`, end_date: `${n.getFullYear()}-12-31` })); setPage(0); } },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${c.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: c.textMuted, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.color = '#6366f1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.textMuted; }}
            >{label}</button>
          ))}
        </div>

        {/* Datas customizadas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.inputBg, borderRadius: 10, padding: '6px 10px', border: `1.5px solid ${(filters.start_date || filters.end_date) ? '#6366f1' : c.border}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15 }}>📅</span>
          <input type="date" value={filters.start_date} onChange={e => { setPage(0); setFilters({ ...filters, start_date: e.target.value }); }}
            style={{ flex: 1, minWidth: 120, border: 'none', background: 'transparent', fontSize: 13, color: filters.start_date ? c.text : c.textFaint, outline: 'none', cursor: 'pointer' }}/>
          <span style={{ color: c.textFaint, fontSize: 13, fontWeight: 500 }}>→</span>
          <input type="date" value={filters.end_date} onChange={e => { setPage(0); setFilters({ ...filters, end_date: e.target.value }); }}
            style={{ flex: 1, minWidth: 120, border: 'none', background: 'transparent', fontSize: 13, color: filters.end_date ? c.text : c.textFaint, outline: 'none', cursor: 'pointer' }}/>
          {(filters.type || filters.start_date || filters.end_date) && (
            <button onClick={() => { setPage(0); setFilters({ type: '', start_date: '', end_date: '' }); }} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, color: '#ef4444', background: '#fef2f2', fontWeight: 600 }}>✕</button>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: c.textFaint }}>{(tx.categories as any)?.name||'Sem categoria'}</span>
                    <span style={{ color: c.border }}>·</span>
                    <span style={{ fontSize: 12, color: c.textFaint }}>{new Date(tx.date+'T12:00').toLocaleDateString('pt-BR')}</span>
                    {tx.source==='whatsapp' && <span style={{ fontSize: 11 }}>💬</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: tx.type==='income'?'#16a34a':'#dc2626' }}>
                    {tx.type==='income'?'+':'-'} {fmt(Number(tx.amount))}
                  </p>
                  <button onClick={() => setEditTx(tx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint, fontSize: 13, padding: '0 2px' }}>✏️</button>
                  <button onClick={() => { setConfirmDeleteId(tx.id); setConfirmDeleteTx(tx); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.borderLight, fontSize: 16, padding: '0 2px' }}>✕</button>
                </div>
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
          /* Modal para transações recorrentes */
          <ConfirmModal
            title="Excluir transação recorrente?"
            message="A transação será removida e a recorrência cancelada. Ela não será mais gerada automaticamente."
            confirmLabel="Excluir e cancelar"
            onConfirm={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;
              await supabase.from('transactions').delete().eq('id', confirmDeleteId).eq('user_id', session.user.id);
              await supabase.from('recurring_templates').update({ active: false }).eq('id', confirmDeleteTx.recurring_template_id).eq('user_id', session.user.id);
              setConfirmDeleteId(null); setConfirmDeleteTx(null); load();
            }}
            onCancel={() => { setConfirmDeleteId(null); setConfirmDeleteTx(null); }}
          />
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
