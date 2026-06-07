'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/theme-context';
import { Check, Pencil, X, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import dayjs from 'dayjs';

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

type BudgetMode = 'percent' | 'fixed';

export default function BudgetPage() {
  const { c, isDark } = useTheme();

  // Global budget
  const [mode, setMode]           = useState<BudgetMode>('percent');
  const [pct, setPct]             = useState('80');   // % of income to spend
  const [fixedRaw, setFixedRaw]   = useState('');     // raw digits for fixed amount
  const [globalSaved, setGlobalSaved] = useState(false);

  // Data
  const [income, setIncome]   = useState(0);
  const [expense, setExpense] = useState(0);
  const [cats, setCats]       = useState<any[]>([]);
  const [catSpend, setCatSpend] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Per-category editing
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editRaw, setEditRaw]       = useState('');
  const [savingCat, setSavingCat]   = useState(false);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid  = session.user.id;
    const now  = dayjs();
    const mStart = now.startOf('month').format('YYYY-MM-DD');
    const mEnd   = now.endOf('month').format('YYYY-MM-DD');

    const [txRes, catRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('type,amount,category_id').eq('user_id', uid).gte('date', mStart).lte('date', mEnd),
      supabase.from('categories').select('*').eq('user_id', uid).order('name'),
      supabase.from('profiles').select('budget_mode,budget_pct,budget_fixed').eq('id', uid).maybeSingle(),
    ]);

    const txs = txRes.data || [];
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    const spend: Record<string, number> = {};
    for (const t of txs.filter(t => t.type === 'expense')) {
      const k = t.category_id || 'none';
      spend[k] = (spend[k] || 0) + Number(t.amount);
    }

    if (profileRes.data) {
      setMode(profileRes.data.budget_mode || 'percent');
      setPct(String(profileRes.data.budget_pct || 80));
      if (profileRes.data.budget_fixed) setFixedRaw(toRawDigits(profileRes.data.budget_fixed));
    }

    setIncome(inc);
    setExpense(exp);
    setCats(catRes.data || []);
    setCatSpend(spend);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Compute global limit
  const globalLimit = mode === 'percent' ? income * (Number(pct) / 100) : parseDisplay(fmtDisplay(fixedRaw));
  const globalPct   = globalLimit > 0 ? Math.round(expense / globalLimit * 100) : 0;
  const globalOver  = expense > globalLimit && globalLimit > 0;
  const remaining   = Math.max(globalLimit - expense, 0);

  async function saveGlobal() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles').update({
      budget_mode:  mode,
      budget_pct:   mode === 'percent' ? Number(pct) : null,
      budget_fixed: mode === 'fixed' ? parseDisplay(fmtDisplay(fixedRaw)) : null,
    }).eq('id', session.user.id);
    setGlobalSaved(true);
    setTimeout(() => setGlobalSaved(false), 2500);
  }

  function openEditCat(cat: any) {
    setEditingCat(cat.id);
    setEditRaw(cat.budget_limit ? toRawDigits(cat.budget_limit) : '');
  }

  async function saveCat(id: string) {
    setSavingCat(true);
    const val = parseDisplay(fmtDisplay(editRaw));
    await supabase.from('categories').update({ budget_limit: val || null }).eq('id', id);
    setCats(prev => prev.map(c => c.id === id ? { ...c, budget_limit: val || null } : c));
    setEditingCat(null);
    setSavingCat(false);
  }

  const expenseCats = cats.filter(c => c.type === 'expense' || c.type === 'both');

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    borderRadius: 10, border: `1.5px solid ${c.border}`,
    fontSize: 14, color: c.text, background: c.input,
    outline: 'none', boxSizing: 'border-box',
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: c.textFaint }}>Carregando...</p>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 4px' }}>Orçamento</h1>
        <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Defina quanto você quer gastar em {dayjs().format('MMMM [de] YYYY')}</p>
      </div>

      {/* Global budget config */}
      <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${c.border}`, padding: 24, marginBottom: 20, boxShadow: c.shadow }}>
        <p style={{ margin: '0 0 18px', fontWeight: 700, fontSize: 16, color: c.text }}>💰 Limite Global de Gastos</p>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([['percent','% da renda'], ['fixed','Valor fixo']] as const).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              background: mode === m ? (isDark ? '#1e293b' : '#0f172a') : c.inputBg,
              color: mode === m ? '#22c55e' : c.textMuted,
              outline: mode === m ? '2px solid #22c55e' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {mode === 'percent' ? (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              % da renda mensal para gastar
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {['20','30','50','70','80','100'].map(p => (
                <button key={p} onClick={() => setPct(p)} style={{
                  padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  background: pct === p ? '#22c55e' : c.inputBg,
                  color: pct === p ? '#fff' : c.textMuted,
                }}>{p}%</button>
              ))}
              <input
                type="number" min="1" max="200" value={pct}
                onChange={e => setPct(e.target.value)}
                style={{ ...inputStyle, width: 80, display: 'inline-block' }}
              />
            </div>
            <div style={{ background: c.inputBg, borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: c.textMuted }}>Receita do mês</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{formatCurrency(income)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: c.textMuted }}>Limite de gastos ({pct}%)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(income * Number(pct) / 100)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Valor máximo de gastos no mês
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: c.textMuted }}>R$</span>
              <input
                type="text" inputMode="numeric"
                value={fmtDisplay(fixedRaw)}
                onChange={e => setFixedRaw(e.target.value.replace(/\D/g, ''))}
                placeholder="0,00"
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
          </div>
        )}

        <button onClick={saveGlobal} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, border: 'none', background: globalSaved ? '#22c55e' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>
          {globalSaved ? <><Check size={15}/> Salvo!</> : 'Salvar orçamento'}
        </button>
      </div>

      {/* Progress this month */}
      {globalLimit > 0 && (
        <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${globalOver ? '#fca5a5' : c.border}`, padding: 24, marginBottom: 20, boxShadow: c.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: c.text }}>📊 Progresso do Mês</p>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 99, background: globalOver ? '#fee2e2' : globalPct > 80 ? '#fff7ed' : '#dcfce7', color: globalOver ? '#dc2626' : globalPct > 80 ? '#ea580c' : '#16a34a' }}>
              {globalPct}% usado
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: c.inputBg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: c.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limite</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: c.text }}>{formatCurrency(globalLimit)}</p>
            </div>
            <div style={{ background: c.inputBg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: c.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gasto</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: globalOver ? '#ef4444' : '#f97316' }}>{formatCurrency(expense)}</p>
            </div>
            <div style={{ background: c.inputBg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: c.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{globalOver ? 'Excedido' : 'Restante'}</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: globalOver ? '#ef4444' : '#22c55e' }}>
                {globalOver ? `+${formatCurrency(expense - globalLimit)}` : formatCurrency(remaining)}
              </p>
            </div>
          </div>

          <div style={{ background: c.inputBg, borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${Math.min(globalPct, 100)}%`,
              background: globalOver ? 'linear-gradient(90deg,#ef4444,#dc2626)' : globalPct > 80 ? 'linear-gradient(90deg,#f97316,#ea580c)' : 'linear-gradient(90deg,#22c55e,#16a34a)',
              transition: 'width 0.6s',
            }}/>
          </div>
          {globalOver && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
              <AlertTriangle size={14} color="#dc2626"/>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Você ultrapassou o limite em {formatCurrency(expense - globalLimit)}</span>
            </div>
          )}
        </div>
      )}

      {/* Per-category budgets */}
      <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${c.border}`, overflow: 'hidden', boxShadow: c.shadow }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 16, color: c.text }}>🏷️ Limite por Categoria</p>
          <p style={{ margin: 0, fontSize: 13, color: c.textFaint }}>Defina quanto pode gastar em cada área este mês</p>
        </div>

        {expenseCats.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 40, color: c.textFaint, fontSize: 14 }}>Nenhuma categoria de despesa cadastrada ainda.</p>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {expenseCats.map((cat, i) => {
              const spent = catSpend[cat.id] || 0;
              const limit = cat.budget_limit;
              const pctUsed = limit ? Math.min(spent / limit * 100, 100) : 0;
              const over    = limit && spent > limit;
              const isEditing = editingCat === cat.id;

              return (
                <div key={cat.id} style={{ padding: '16px 24px', borderBottom: i < expenseCats.length - 1 ? `1px solid ${c.borderLight}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {cat.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: limit ? 6 : 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{cat.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {!isEditing && (
                            <>
                              <span style={{ fontSize: 13, color: over ? '#ef4444' : c.textMuted, fontWeight: 600 }}>
                                {formatCurrency(spent)}
                                {limit ? ` / ${formatCurrency(limit)}` : ''}
                                {over && ' 🔴'}
                              </span>
                              <button onClick={() => openEditCat(cat)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Pencil size={12} color="#3b82f6"/>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Inline edit */}
                      {isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: c.textMuted }}>R$</span>
                            <input
                              autoFocus
                              type="text" inputMode="numeric"
                              value={fmtDisplay(editRaw)}
                              onChange={e => setEditRaw(e.target.value.replace(/\D/g, ''))}
                              placeholder="0,00"
                              style={{ ...inputStyle, paddingLeft: 32, fontSize: 13, padding: '7px 10px 7px 32px' }}
                            />
                          </div>
                          <button onClick={() => saveCat(cat.id)} disabled={savingCat} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} color="#fff"/>
                          </button>
                          <button onClick={() => setEditingCat(null)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: c.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={14} color={c.textMuted}/>
                          </button>
                        </div>
                      )}

                      {/* Progress bar */}
                      {limit && !isEditing && (
                        <div style={{ background: c.inputBg, borderRadius: 99, height: 5, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${pctUsed}%`,
                            background: over ? '#ef4444' : pctUsed > 80 ? '#f97316' : cat.color,
                            transition: 'width 0.5s',
                          }}/>
                        </div>
                      )}

                      {!limit && !isEditing && (
                        <span style={{ fontSize: 12, color: c.textFaint, fontStyle: 'italic' }}>Sem limite definido — clique no lápis para adicionar</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${c.borderLight}`, background: c.inputBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={13} color={c.textFaint}/>
            <span style={{ fontSize: 12, color: c.textFaint }}>Os limites de categoria são independentes do limite global e ficam visíveis no Dashboard.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
