'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, TrendingDown, Upload, X, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { useTheme } from '@/lib/theme-context';

function fmt(v: number) { return formatCurrency(v); }
function fmtK(v: number) { return v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`; }

// ──────────────── Calendar Picker ────────────────
const CELL = 44;
const DAYS_LABEL = ['D','S','T','Q','Q','S','S'];

function CalendarPicker({ start, end, onApply, onClose }: {
  start: string; end: string;
  onApply: (s: string, e: string) => void;
  onClose: () => void;
}) {
  const { c, isDark } = useTheme();
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selStart, setSelStart]   = useState(start || '');
  const [selEnd, setSelEnd]       = useState(end || '');
  const [hovered, setHovered]     = useState('');

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();

  function toStr(d: Date) { return d.toISOString().split('T')[0]; }

  function handleDay(day: number) {
    const ds = toStr(new Date(viewYear, viewMonth, day));
    if (!selStart || (selStart && selEnd)) { setSelStart(ds); setSelEnd(''); }
    else {
      if (ds < selStart) { setSelEnd(selStart); setSelStart(ds); }
      else setSelEnd(ds);
    }
  }

  function inRange(ds: string) {
    const s = selStart, e = selEnd || hovered;
    if (!s) return false;
    const lo = s < e ? s : e, hi = s < e ? e : s;
    return ds > lo && ds < hi;
  }
  function isStart(ds: string) { return ds === selStart; }
  function isEnd(ds: string)   { return ds === (selEnd || ''); }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }} onClick={onClose}>
      <div style={{ background:c.surface, borderRadius:20, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', border:`1px solid ${c.border}`, width: 320 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <button onClick={prevMonth} style={{ background:'none', border:'none', cursor:'pointer', color:c.textMuted, padding:6, borderRadius:8 }}><ChevronLeft size={18}/></button>
          <span style={{ fontSize:14, fontWeight:600, color:c.text, textTransform:'capitalize' }}>{monthName}</span>
          <button onClick={nextMonth} style={{ background:'none', border:'none', cursor:'pointer', color:c.textMuted, padding:6, borderRadius:8 }}><ChevronRight size={18}/></button>
        </div>

        {/* Day labels */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(7,${CELL}px)`, marginBottom:4 }}>
          {DAYS_LABEL.map((d,i) => (
            <div key={i} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:c.textFaint, paddingBottom:6 }}>{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(7,${CELL}px)` }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx}/>;
            const ds = toStr(new Date(viewYear, viewMonth, day));
            const start_ = isStart(ds), end_ = isEnd(ds) && !!selEnd, range = inRange(ds);
            const selected = start_ || end_;
            const isToday = ds === toStr(today);
            return (
              <div key={idx} style={{ position:'relative', height:CELL, display:'flex', alignItems:'center', justifyContent:'center' }}
                onMouseEnter={() => { if (selStart && !selEnd) setHovered(ds); }}
                onMouseLeave={() => setHovered('')}
              >
                {(range || (start_ && selEnd) || end_) && (
                  <div style={{ position:'absolute', top:6, bottom:6,
                    left: start_ ? '50%' : 0,
                    right: end_ ? '50%' : 0,
                    background:'rgba(99,102,241,0.15)' }}/>
                )}
                <div onClick={() => handleDay(day)} style={{ position:'relative', zIndex:1, width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:13, fontWeight: selected ? 700 : 400,
                  background: selected ? '#6366f1' : 'transparent',
                  color: selected ? '#fff' : isToday ? '#6366f1' : c.text,
                  border: isToday && !selected ? `1.5px solid #6366f1` : 'none',
                }}>
                  {day}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected range display */}
        {(selStart || selEnd) && (
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <div style={{ flex:1, background:c.inputBg, borderRadius:10, padding:'8px 12px', border:`1px solid ${selStart ? '#6366f1' : c.border}` }}>
              <p style={{ margin:0, fontSize:10, color:c.textFaint, fontWeight:600 }}>DE</p>
              <p style={{ margin:0, fontSize:13, color:selStart ? c.text : c.textFaint }}>{selStart ? new Date(selStart+'T12:00').toLocaleDateString('pt-BR') : '—'}</p>
            </div>
            <div style={{ flex:1, background:c.inputBg, borderRadius:10, padding:'8px 12px', border:`1px solid ${selEnd ? '#6366f1' : c.border}` }}>
              <p style={{ margin:0, fontSize:10, color:c.textFaint, fontWeight:600 }}>ATÉ</p>
              <p style={{ margin:0, fontSize:13, color:selEnd ? c.text : c.textFaint }}>{selEnd ? new Date(selEnd+'T12:00').toLocaleDateString('pt-BR') : '—'}</p>
            </div>
          </div>
        )}

        <button
          disabled={!selStart || !selEnd}
          onClick={() => onApply(selStart, selEnd)}
          style={{ marginTop:16, width:'100%', padding:'12px', borderRadius:12, border:'none', background: selStart && selEnd ? '#6366f1' : c.inputBg, color: selStart && selEnd ? '#fff' : c.textFaint, fontSize:14, fontWeight:600, cursor: selStart && selEnd ? 'pointer' : 'not-allowed' }}
        >
          Aplicar filtro
        </button>
      </div>
    </div>
  );
}

// ──────────────── CSV Import ────────────────
type CsvRow = { date: string; description: string; amount: number; type: 'income' | 'expense' };

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const idxDate  = headers.findIndex(h => h.includes('data') || h.includes('date'));
  const idxDesc  = headers.findIndex(h => h.includes('descri') || h.includes('desc') || h.includes('memo'));
  const idxAmt   = headers.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value'));
  const idxType  = headers.findIndex(h => h.includes('tipo') || h.includes('type'));
  if (idxDate < 0 || idxAmt < 0) return [];
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const rawDate = cols[idxDate] || '';
    let date = rawDate;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('/');
      date = `${y}-${m}-${d}`;
    }
    const rawAmt = (cols[idxAmt] || '0').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const amount = Math.abs(parseFloat(rawAmt) || 0);
    if (!amount) continue;
    let type: 'income' | 'expense' = 'expense';
    if (idxType >= 0) {
      const t = (cols[idxType] || '').toLowerCase();
      if (t.includes('receita') || t.includes('income') || t.includes('entrada') || t.includes('crédito') || t.includes('credito')) type = 'income';
    } else if (parseFloat(rawAmt) > 0) {
      type = 'income';
    }
    rows.push({ date, description: cols[idxDesc] || 'Importado', amount, type });
  }
  return rows;
}

function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { c } = useTheme();
  const [rows, setRows]     = useState<CsvRow[]>([]);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.length) { setError('Não foi possível ler o arquivo. Verifique o formato.'); return; }
      setError('');
      setRows(parsed);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function doImport() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = rows.map(r => ({ ...r, user_id: user.id, source: 'csv' }));
    const { error: err } = await supabase.from('transactions').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    setDone(true);
    setTimeout(() => { onSuccess(); onClose(); }, 1500);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}>
      <div style={{ background:c.surface, borderRadius:20, width:'100%', maxWidth:540, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', border:`1px solid ${c.border}`, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:`1px solid ${c.borderLight}` }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:c.text }}>Importar Extrato CSV</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:c.textFaint }}><X size={20}/></button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ background: c.inputBg, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:12, color:c.textMuted, lineHeight:1.6 }}>
            <strong>Colunas esperadas:</strong> <code>data</code>, <code>descricao</code>, <code>valor</code>, <code>tipo</code> (receita/despesa)<br/>
            Separador: ponto-e-vírgula (<code>;</code>) ou vírgula (<code>,</code>). Datas: DD/MM/AAAA ou AAAA-MM-DD.
          </div>

          {!rows.length ? (
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:'40px 20px', borderRadius:14, border:`2px dashed ${c.border}`, cursor:'pointer', background:c.inputBg }}>
              <Upload size={32} color={c.textFaint}/>
              <span style={{ fontSize:14, fontWeight:600, color:c.textMuted }}>Clique para selecionar o arquivo CSV</span>
              <span style={{ fontSize:12, color:c.textFaint }}>ou arraste e solte aqui</span>
              <input type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleFile}/>
            </label>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:c.text }}>{rows.length} transações encontradas</p>
                <button onClick={() => setRows([])} style={{ fontSize:12, color:'#ef4444', background:'none', border:'none', cursor:'pointer' }}>Limpar</button>
              </div>
              <div style={{ maxHeight:240, overflowY:'auto', borderRadius:10, border:`1px solid ${c.border}` }}>
                {rows.slice(0,20).map((r, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:i<rows.length-1?`1px solid ${c.borderLight}`:'none' }}>
                    <span style={{ fontSize:18 }}>{r.type==='income'?'💰':'💸'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:13, color:c.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description}</p>
                      <p style={{ margin:0, fontSize:11, color:c.textFaint }}>{r.date}</p>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:r.type==='income'?'#22c55e':'#ef4444', flexShrink:0 }}>{r.type==='income'?'+':'-'}{formatCurrency(r.amount)}</span>
                  </div>
                ))}
                {rows.length > 20 && <p style={{ textAlign:'center', padding:'8px 0', fontSize:12, color:c.textFaint }}>...e mais {rows.length-20} transações</p>}
              </div>
            </>
          )}

          {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', color:'#dc2626', fontSize:13, marginTop:12, display:'flex', gap:8, alignItems:'center' }}><AlertCircle size={14}/>{error}</div>}

          {rows.length > 0 && (
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:12, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:14, fontWeight:500, cursor:'pointer' }}>Cancelar</button>
              <button onClick={doImport} disabled={saving||done} style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:done?'#22c55e':'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', fontSize:14, fontWeight:700, cursor:saving?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {done ? <><Check size={16}/>Importado!</> : saving ? 'Importando...' : <><Upload size={16}/>Importar {rows.length} transações</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────── Main Page ────────────────
type Preset = '3m' | '6m' | '12m' | 'custom';

export default function ReportsPage() {
  const { c } = useTheme();
  const [data, setData]         = useState<any>(null);
  const [preset, setPreset]     = useState<Preset>('6m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [showImport, setShowImport] = useState(false);

  const months = preset === '3m' ? 3 : preset === '12m' ? 12 : 6;

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;

    const now = dayjs();
    let periodStart: string;
    let periodEnd: string;
    let histStart: string;

    if (preset === 'custom' && customStart && customEnd) {
      periodStart = customStart;
      periodEnd   = customEnd;
      histStart   = customStart;
    } else {
      periodStart = now.startOf('month').format('YYYY-MM-DD');
      periodEnd   = now.endOf('month').format('YYYY-MM-DD');
      histStart   = now.subtract(months-1,'month').startOf('month').format('YYYY-MM-DD');
    }

    const lastStart = now.subtract(1,'month').startOf('month').format('YYYY-MM-DD');
    const lastEnd   = now.subtract(1,'month').endOf('month').format('YYYY-MM-DD');
    const yearStart = now.startOf('year').format('YYYY-MM-DD');
    const weekEnd   = now.add(7,'day').format('YYYY-MM-DD');
    const today     = now.format('YYYY-MM-DD');

    const [txMonth, txLast, txYear, txHist, catMonth, bills] = await Promise.all([
      supabase.from('transactions').select('type,amount').eq('user_id',uid).gte('date',periodStart).lte('date',periodEnd),
      supabase.from('transactions').select('type,amount').eq('user_id',uid).gte('date',lastStart).lte('date',lastEnd),
      supabase.from('transactions').select('type,amount').eq('user_id',uid).gte('date',yearStart),
      supabase.from('transactions').select('type,amount,date').eq('user_id',uid).gte('date',histStart).lte('date',periodEnd),
      supabase.from('transactions').select('category_id,amount,categories(id,name,icon,color,budget_limit)').eq('user_id',uid).eq('type','expense').gte('date',periodStart).lte('date',periodEnd),
      supabase.from('bills').select('*').eq('user_id',uid).eq('paid',false).lte('due_date',weekEnd).gte('due_date',today),
    ]);

    const sum = (rows: any[], type: string) => (rows||[]).filter(t=>t.type===type).reduce((s,t)=>s+Number(t.amount),0);

    const mIncome  = sum(txMonth.data||[], 'income');
    const mExpense = sum(txMonth.data||[], 'expense');
    const lIncome  = sum(txLast.data||[], 'income');
    const lExpense = sum(txLast.data||[], 'expense');
    const yIncome  = sum(txYear.data||[], 'income');

    const catMap: Record<string,any> = {};
    for (const t of (catMonth.data||[])) {
      const ct = (t as any).categories;
      const key = t.category_id || 'none';
      if (!catMap[key]) catMap[key] = { category_id: key, category_name: ct?.name||'Sem cat', icon: ct?.icon||'📦', color: ct?.color||'#6366f1', budget_limit: ct?.budget_limit||null, total: 0 };
      catMap[key].total += Number(t.amount);
    }
    const categories = Object.values(catMap).sort((a:any,b:any)=>b.total-a.total);

    const histMap: Record<string,{income:number,expense:number}> = {};
    for (const t of (txHist.data||[])) {
      const mo = dayjs(t.date).format('YYYY-MM');
      if (!histMap[mo]) histMap[mo] = {income:0,expense:0};
      histMap[mo][t.type as 'income'|'expense'] += Number(t.amount);
    }
    const chartData = Object.entries(histMap).sort(([a],[b])=>a.localeCompare(b)).map(([mo,v])=>({
      m: dayjs(mo+'-01').toDate().toLocaleDateString('pt-BR',{month:'short'}),
      Receitas: v.income,
      Despesas: v.expense,
    }));

    setData({
      currentMonth: { income: mIncome, expense: mExpense, balance: mIncome-mExpense },
      lastMonth:    { income: lIncome, expense: lExpense, balance: lIncome-lExpense },
      year:         { income: yIncome },
      categories, chartData,
      billsDueThisWeek: bills.data||[],
    });
    setLoading(false);
  }

  useEffect(() => {
    if (preset === 'custom' && (!customStart || !customEnd)) return;
    load();
  }, [preset, customStart, customEnd]);

  async function exportCSV() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: rows } = await supabase.from('transactions')
      .select('date,type,description,amount,source,categories(name)')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });
    const headers = ['Data','Tipo','Descrição','Categoria','Valor','Origem'];
    const lines = (rows||[]).map((t:any) => [t.date, t.type==='income'?'Receita':'Despesa', t.description, (t.categories as any)?.name||'', t.amount, t.source]);
    const csv = [headers, ...lines].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `finora-${dayjs().format('YYYY-MM')}.csv`;
    a.click();
  }

  // Period label for chart subtitle
  const periodLabel = preset === 'custom' && customStart && customEnd
    ? `${new Date(customStart+'T12:00').toLocaleDateString('pt-BR')} – ${new Date(customEnd+'T12:00').toLocaleDateString('pt-BR')}`
    : `${months} meses`;

  if (loading) return <p style={{ textAlign:'center', color: c.textFaint, padding:80 }}>Carregando...</p>;

  const m = data.currentMonth;
  const l = data.lastMonth;

  const kpiLabel = preset === 'custom' ? 'período' : 'mês';
  const kpis = [
    { label:`Receitas (${kpiLabel})`,  value:m.income,  prev:preset !== 'custom' ? l.income : null,  good:(d:number)=>d>0 },
    { label:`Despesas (${kpiLabel})`,  value:m.expense, prev:preset !== 'custom' ? l.expense : null, good:(d:number)=>d<0 },
    { label:`Saldo (${kpiLabel})`,     value:m.balance, prev:preset !== 'custom' ? l.balance : null, good:(d:number)=>d>0 },
    { label:'Receitas (ano)',  value:data.year.income, prev:null, good:()=>true },
  ];

  const pills: { id: Preset; label: string }[] = [
    { id:'3m',     label:'3 meses' },
    { id:'6m',     label:'6 meses' },
    { id:'12m',    label:'12 meses' },
    { id:'custom', label:'Personalizado' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Relatórios</h1>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Análise detalhada das suas finanças</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => setShowImport(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Upload size={15}/> Importar CSV
          </button>
          <button onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textSecondary, fontSize:13, fontWeight:500, cursor:'pointer' }}>
            <Download size={15}/> Exportar CSV
          </button>
        </div>
      </div>

      {/* Period pills */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {pills.map(p => (
          <button key={p.id}
            onClick={() => { setPreset(p.id); if (p.id === 'custom') setShowCalendar(true); }}
            style={{ padding:'8px 20px', borderRadius:9, border: preset===p.id ? 'none' : `1.5px solid ${c.border}`, background: preset===p.id ? c.text : c.surface, color: preset===p.id ? c.surface : c.textMuted, fontSize:13, fontWeight:500, cursor:'pointer' }}
          >
            {p.label}
          </button>
        ))}
        {/* Custom date chip */}
        {preset === 'custom' && customStart && customEnd && (
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9, background:'rgba(99,102,241,0.12)', border:'1.5px solid #6366f1', fontSize:12, color:'#6366f1', fontWeight:500, cursor:'pointer' }} onClick={() => setShowCalendar(true)}>
            📅 {new Date(customStart+'T12:00').toLocaleDateString('pt-BR')} – {new Date(customEnd+'T12:00').toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid-4col">
        {kpis.map(item => {
          const diff = item.prev != null ? item.value - item.prev : null;
          const pct  = diff!=null && item.prev ? Math.abs(diff/item.prev*100).toFixed(1) : null;
          const good = diff != null && item.good(diff);
          return (
            <div key={item.label} style={{ background:c.surface, borderRadius:14, border:`1px solid ${c.border}`, padding:'18px 20px' }}>
              <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:600, color:c.textFaint, letterSpacing:'0.06em', textTransform:'uppercase' }}>{item.label}</p>
              <p style={{ margin:0, fontSize:22, fontWeight:700, color:c.text }}>{fmt(item.value)}</p>
              {pct && (
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:99, background:good?'#dcfce7':'#fee2e2' }}>
                    {good ? <TrendingDown size={11} color="#16a34a"/> : <TrendingUp size={11} color="#dc2626"/>}
                    <span style={{ fontSize:11, fontWeight:600, color:good?'#16a34a':'#dc2626' }}>{pct}%</span>
                  </div>
                  <span style={{ fontSize:11, color:c.textFaint }}>vs mês ant.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid-charts">
        <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, padding:'20px', boxShadow:c.shadow }}>
          <p style={{ margin:'0 0 4px', fontWeight:600, fontSize:15, color:c.textSecondary }}>Evolução Mensal</p>
          <p style={{ margin:'0 0 16px', fontSize:12, color:c.textFaint }}>{periodLabel}</p>
          {data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.chartData} margin={{ top:4, right:4, left:10, bottom:0 }}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.borderLight}/>
                <XAxis dataKey="m" tick={{ fontSize:12, fill:c.textFaint }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:c.textFaint }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{ borderRadius:10, border:`1px solid ${c.border}`, fontSize:13, background:c.surface, color:c.text }} itemStyle={{ color:c.text }} labelStyle={{ color:c.text }}/>
                <Area type="monotone" dataKey="Receitas" stroke="#22c55e" strokeWidth={2} fill="url(#gR)"/>
                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#gD)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <p style={{ textAlign:'center', color:c.textFaint, padding:40, fontSize:13 }}>Sem dados no período</p>}
        </div>

        <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, padding:'20px', boxShadow:c.shadow }}>
          <p style={{ margin:'0 0 16px', fontWeight:600, fontSize:15, color:c.textSecondary }}>Gastos por Categoria</p>
          {data.categories.length === 0
            ? <p style={{ textAlign:'center', color:c.textFaint, padding:20, fontSize:13 }}>Sem despesas no período</p>
            : data.categories.map((cat:any) => {
              const pct = m.expense > 0 ? cat.total/m.expense*100 : 0;
              const over = cat.budget_limit && cat.total > cat.budget_limit;
              return (
                <div key={cat.category_id} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, color:c.textSecondary }}>{cat.icon} {cat.category_name}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:over?'#ef4444':c.textSecondary }}>{fmt(cat.total)}</span>
                  </div>
                  <div style={{ background:c.inputBg, borderRadius:99, height:5 }}>
                    <div style={{ height:'100%', borderRadius:99, width:`${Math.min(pct,100)}%`, background:over?'#ef4444':cat.color||'#6366f1' }}/>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onSuccess={load}/>}

      {showCalendar && (
        <CalendarPicker
          start={customStart}
          end={customEnd}
          onApply={(s, e) => { setCustomStart(s); setCustomEnd(e); setShowCalendar(false); }}
          onClose={() => { setShowCalendar(false); if (!customStart) setPreset('6m'); }}
        />
      )}

      {/* Bills due */}
      {data.billsDueThisWeek.length > 0 && (
        <div style={{ background:c.surface, borderRadius:16, border:'1px solid #fde68a', boxShadow:c.shadow, overflow:'hidden', marginTop:24 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #fef3c7', background:'#fffbeb' }}>
            <p style={{ margin:0, fontWeight:600, fontSize:15, color:'#92400e' }}>⏰ Contas a Vencer Esta Semana</p>
          </div>
          <div style={{ padding:'4px 20px' }}>
            {data.billsDueThisWeek.map((b:any, i:number) => (
              <div key={b.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 0', borderBottom:i<data.billsDueThisWeek.length-1?`1px solid ${c.bg}`:'none' }}>
                <div style={{ width:36, height:36, background:'#fef3c7', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📋</div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:500, color:c.textSecondary, fontSize:14 }}>{b.description}</p>
                  <p style={{ margin:0, color:c.textFaint, fontSize:12 }}>Vence em {new Date(b.due_date+'T12:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <p style={{ margin:0, fontWeight:700, color:'#dc2626', fontSize:15 }}>{fmt(Number(b.amount))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
