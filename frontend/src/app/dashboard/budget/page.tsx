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
  const [editingCat, setEditingCat]   = useState<string | null>(null);
  const [editRaw, setEditRaw]         = useState('');
  const [editCatMode, setEditCatMode] = useState<'fixed' | 'percent'>('fixed');
  const [editCatPct, setEditCatPct]   = useState('');
  const [savingCat, setSavingCat]     = useState(false);

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
    const isP = cat.budget_limit_type === 'percent';
    setEditCatMode(isP ? 'percent' : 'fixed');
    setEditCatPct(isP && cat.budget_limit_pct ? String(cat.budget_limit_pct) : '');
    setEditRaw(!isP && cat.budget_limit ? toRawDigits(cat.budget_limit) : '');
  }

  async function saveCat(id: string) {
    setSavingCat(true);
    if (editCatMode === 'percent') {
      const p = Number(editCatPct);
      const effectiveLimit = p > 0 ? income * p / 100 : null;
      await supabase.from('categories').update({ budget_limit_type: 'percent', budget_limit_pct: p || null, budget_limit: effectiveLimit }).eq('id', id);
      setCats(prev => prev.map(c => c.id === id ? { ...c, budget_limit_type: 'percent', budget_limit_pct: p || null, budget_limit: effectiveLimit } : c));
    } else {
      const val = parseDisplay(fmtDisplay(editRaw));
      await supabase.from('categories').update({ budget_limit_type: 'fixed', budget_limit_pct: null, budget_limit: val || null }).eq('id', id);
      setCats(prev => prev.map(c => c.id === id ? { ...c, budget_limit_type: 'fixed', budget_limit_pct: null, budget_limit: val || null } : c));
    }
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

      {/* Progress this month — based on category budgets */}
      {(() => {
        const totalBudget = cats.reduce((s, c) => s + Number(c.budget_limit || 0), 0);
        if (totalBudget === 0) return null;
        const pct_ = Math.round(expense / totalBudget * 100);
        const over = expense > totalBudget;
        const remaining_ = Math.max(totalBudget - expense, 0);
        return (
          <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${over ? '#fca5a5' : c.border}`, padding: 24, marginBottom: 20, boxShadow: c.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: c.text }}>📊 Progresso do Mês</p>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 99, background: over ? '#fee2e2' : pct_ > 80 ? '#fff7ed' : '#dcfce7', color: over ? '#dc2626' : pct_ > 80 ? '#ea580c' : '#16a34a' }}>
                {pct_}% usado
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Orçamento', value: formatCurrency(totalBudget), color: c.text },
                { label: 'Gasto',     value: formatCurrency(expense),     color: over ? '#ef4444' : '#f97316' },
                { label: over ? 'Excedido' : 'Restante', value: over ? `+${formatCurrency(expense - totalBudget)}` : formatCurrency(remaining_), color: over ? '#ef4444' : '#22c55e' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: c.inputBg, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, color: c.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 'clamp(12px, 3vw, 17px)' as any, fontWeight: 700, color, wordBreak: 'break-all' }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: c.inputBg, borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(pct_, 100)}%`, background: over ? 'linear-gradient(90deg,#ef4444,#dc2626)' : pct_ > 80 ? 'linear-gradient(90deg,#f97316,#ea580c)' : 'linear-gradient(90deg,#22c55e,#16a34a)', transition: 'width 0.6s' }}/>
            </div>
            {over && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                <AlertTriangle size={14} color="#dc2626"/>
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Você ultrapassou o limite em {formatCurrency(expense - totalBudget)}</span>
              </div>
            )}
          </div>
        );
      })()}

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
              const effectiveLimit = cat.budget_limit_type === 'percent' && cat.budget_limit_pct
                ? income * cat.budget_limit_pct / 100
                : cat.budget_limit || 0;
              const limit   = effectiveLimit;
              const pctUsed = limit ? Math.min(spent / limit * 100, 100) : 0;
              const over    = limit && spent > limit;
              const limitLabel = cat.budget_limit_type === 'percent' && cat.budget_limit_pct
                ? `${cat.budget_limit_pct}% da renda (${formatCurrency(effectiveLimit)})`
                : formatCurrency(limit);
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
                                {limit ? ` / ${limitLabel}` : ''}
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
                        <div style={{ marginTop: 10 }}>
                          {/* Mode toggle */}
                          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            {([['fixed','Valor fixo'], ['percent','% da renda']] as const).map(([m, label]) => (
                              <button key={m} onClick={() => setEditCatMode(m)} style={{ flex: 1, padding: '7px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: editCatMode === m ? cat.color : c.inputBg, color: editCatMode === m ? '#fff' : c.textMuted }}>
                                {label}
                              </button>
                            ))}
                          </div>

                          {editCatMode === 'fixed' ? (
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: c.textMuted }}>R$</span>
                              <input autoFocus type="text" inputMode="numeric" value={fmtDisplay(editRaw)} onChange={e => setEditRaw(e.target.value.replace(/\D/g, ''))} placeholder="0,00" style={{ ...inputStyle, paddingLeft: 32, fontSize: 13, padding: '8px 10px 8px 32px' }}/>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                                {['5','10','15','20','25','30'].map(p => (
                                  <button key={p} onClick={() => setEditCatPct(p)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: editCatPct === p ? cat.color : c.inputBg, color: editCatPct === p ? '#fff' : c.textMuted }}>{p}%</button>
                                ))}
                              </div>
                              <div style={{ position: 'relative' }}>
                                <input type="number" min="1" max="100" value={editCatPct} onChange={e => setEditCatPct(e.target.value)} placeholder="%" style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }}/>
                              </div>
                              {editCatPct && income > 0 && (
                                <p style={{ margin: '6px 0 0', fontSize: 12, color: c.textFaint }}>
                                  = {formatCurrency(income * Number(editCatPct) / 100)} de {formatCurrency(income)} de renda
                                </p>
                              )}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button onClick={() => saveCat(cat.id)} disabled={savingCat} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <Check size={13}/> Salvar
                            </button>
                            <button onClick={() => setEditingCat(null)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: c.inputBg, color: c.textMuted, fontSize: 13, cursor: 'pointer' }}>
                              <X size={13}/>
                            </button>
                          </div>
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
