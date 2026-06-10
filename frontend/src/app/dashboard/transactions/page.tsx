'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import AddTransactionModal from '@/components/ui/AddTransactionModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

function fmt(v: number) { return formatCurrency(v); }

function CalendarPicker({ onApply, onClose, initialStart, initialEnd, c, isDark }: {
  onApply: (start: string, end: string) => void;
  onClose: () => void;
  initialStart: string;
  initialEnd: string;
  c: any;
  isDark: boolean;
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    const d = initialStart ? new Date(initialStart + 'T12:00') : today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [start, setStart] = useState(initialStart);
  const [end, setEnd]     = useState(initialEnd);
  const [hovered, setHovered] = useState('');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function toYMD(d: Date) { return d.toISOString().split('T')[0]; }
  function fromYMD(s: string) { return new Date(s + 'T12:00'); }

  function handleDay(day: number) {
    const d = toYMD(new Date(year, month, day));
    if (!start || (start && end)) { setStart(d); setEnd(''); }
    else if (d < start) { setEnd(start); setStart(d); }
    else { setEnd(d); }
  }

  function isStart(d: string) { return d === start; }
  function isEnd(d: string) { return d === end; }
  function isInRange(d: string) {
    const s = start, e = end || hovered;
    if (!s || !e) return false;
    const [lo, hi] = s <= e ? [s, e] : [e, s];
    return d > lo && d < hi;
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const CELL = 44;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 16 }} onClick={onClose}>
      <div style={{ background: isDark ? '#0f172a' : '#fff', borderRadius: 20, width: '100%', maxWidth: 400, padding: '24px 24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>Selecione o período</h3>
          <button onClick={onClose} style={{ background: isDark ? '#1e293b' : '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textFaint }}><X size={16}/></button>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: isDark ? '#1e293b' : '#f1f5f9', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text }}><ChevronLeft size={17}/></button>
          <span style={{ fontWeight: 700, fontSize: 15, color: c.text, textTransform: 'capitalize' }}>{monthNames[month]} {year}</span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: isDark ? '#1e293b' : '#f1f5f9', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text }}><ChevronRight size={17}/></button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${CELL}px)`, justifyContent: 'center', marginBottom: 4 }}>
          {['D','S','T','Q','Q','S','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: c.textFaint, height: 32, lineHeight: '32px' }}>{d}</div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${CELL}px)`, justifyContent: 'center' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} style={{ height: CELL }}/>;
            const d = toYMD(new Date(year, month, day));
            const isS = isStart(d);
            const isE = isEnd(d);
            const sel = isS || isE;
            const inRange = isInRange(d);
            const isToday = d === toYMD(today);
            const col = i % 7;
            const isFirstCol = col === 0;
            const isLastCol = col === 6;
            return (
              <div key={i}
                onClick={() => handleDay(day)}
                onMouseEnter={() => { if (start && !end) setHovered(d); }}
                onMouseLeave={() => setHovered('')}
                style={{ height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative',
                  background: inRange ? '#22c55e22' : 'transparent',
                  borderRadius: (isS && !isE) ? '99px 0 0 99px' : (!isS && isE) ? '0 99px 99px 0' : (isS && isE) ? 99 : (inRange && isFirstCol) ? '99px 0 0 99px' : (inRange && isLastCol) ? '0 99px 99px 0' : 0,
                }}>
                <div style={{ width: 36, height: 36, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel ? '#22c55e' : 'transparent', color: sel ? '#fff' : isToday ? '#22c55e' : c.text, fontWeight: sel ? 700 : isToday ? 600 : 400, fontSize: 14, transition: 'background 0.1s' }}>
                  {day}
                </div>
              </div>
            );
          })}
        </div>

        {/* Apply */}
        <button
          disabled={!start || !end}
          onClick={() => { if (start && end) onApply(start, end); }}
          style={{ marginTop: 22, width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: start && end ? 'pointer' : 'default', fontSize: 15, fontWeight: 700, background: start && end ? '#22c55e' : isDark ? '#1e293b' : '#e2e8f0', color: start && end ? '#fff' : c.textFaint, transition: 'all 0.2s' }}>
          Aplicar filtro
        </button>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { c, isDark } = useTheme();
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
  const [periodPreset, setPeriodPreset] = useState('mes');
  const [showCalendar, setShowCalendar] = useState(false);
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
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

      <div style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, marginBottom: 20, overflow: 'hidden' }}>
        {/* Tipo */}
        <div style={{ display: 'flex', gap: 6, padding: '14px 18px 10px' }}>
          {[['', 'Todos'], ['income', '💰 Receitas'], ['expense', '💸 Despesas']].map(([v, l]) => (
            <button key={v} onClick={() => { setPage(0); setFilters({ ...filters, type: v }); }} style={{ padding: '7px 16px', borderRadius: 8, border: filters.type === v ? '1.5px solid #6366f1' : `1.5px solid ${c.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: filters.type === v ? '#6366f115' : 'transparent', color: filters.type === v ? '#6366f1' : c.textMuted }}>{l}</button>
          ))}
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: c.border, margin: '0 18px' }}/>

        {/* Pills de período com scroll nativo */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '10px 18px 14px' } as any}>
          {[
            { id: 'hoje',   label: 'Hoje',         fn: () => { const t = new Date().toISOString().split('T')[0]; setFilters(f => ({ ...f, start_date: t, end_date: t })); } },
            { id: '7d',     label: '7 dias',        fn: () => { const n = new Date(); setFilters(f => ({ ...f, start_date: new Date(n.getTime()-6*86400000).toISOString().split('T')[0], end_date: n.toISOString().split('T')[0] })); } },
            { id: '30d',    label: '30 dias',       fn: () => { const n = new Date(); setFilters(f => ({ ...f, start_date: new Date(n.getTime()-29*86400000).toISOString().split('T')[0], end_date: n.toISOString().split('T')[0] })); } },
            { id: 'mes',    label: 'Este mês',      fn: () => { const n = new Date(); setFilters(f => ({ ...f, start_date: `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, end_date: new Date(n.getFullYear(), n.getMonth()+1, 0).toISOString().split('T')[0] })); } },
            { id: 'custom', label: 'Personalizado', fn: () => setShowCalendar(true) },
          ].map(({ id, label, fn }) => {
            const active = periodPreset === id;
            return (
              <button key={id} onClick={() => { setPeriodPreset(id); setPage(0); fn(); }} style={{ padding: '6px 16px', borderRadius: 99, border: active ? '1.5px solid #22c55e' : `1.5px solid ${c.border}`, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, background: active ? '#22c55e18' : 'transparent', color: active ? '#22c55e' : c.textMuted, transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap' }}>{label}</button>
            );
          })}
        </div>

        {/* Período personalizado selecionado */}
        {periodPreset === 'custom' && filters.start_date && filters.end_date && (
          <button onClick={() => setShowCalendar(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#22c55e10', border: 'none', borderTop: `1px solid #22c55e33`, padding: '10px 18px', cursor: 'pointer', width: '100%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#22c55e' }}>
              {new Date(filters.start_date+'T12:00').toLocaleDateString('pt-BR')} → {new Date(filters.end_date+'T12:00').toLocaleDateString('pt-BR')}
            </span>
          </button>
        )}
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '0 2px', opacity: 0.7 }}>✕</button>
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

      {showCalendar && (
        <CalendarPicker
          c={c} isDark={isDark}
          initialStart={filters.start_date}
          initialEnd={filters.end_date}
          onClose={() => setShowCalendar(false)}
          onApply={(start, end) => { setFilters(f => ({ ...f, start_date: start, end_date: end })); setPage(0); setShowCalendar(false); }}
        />
      )}

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
