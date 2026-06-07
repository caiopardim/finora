'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import dayjs from 'dayjs';
import { useTheme } from '@/lib/theme-context';

function fmt(v: number) { return formatCurrency(v); }
function fmtK(v: number) { return v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`; }

export default function ReportsPage() {
  const { c } = useTheme();
  const [data, setData]     = useState<any>(null);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;

    const now        = dayjs();
    const monthStart = now.startOf('month').format('YYYY-MM-DD');
    const monthEnd   = now.endOf('month').format('YYYY-MM-DD');
    const lastStart  = now.subtract(1,'month').startOf('month').format('YYYY-MM-DD');
    const lastEnd    = now.subtract(1,'month').endOf('month').format('YYYY-MM-DD');
    const yearStart  = now.startOf('year').format('YYYY-MM-DD');
    const histStart  = now.subtract(months-1,'month').startOf('month').format('YYYY-MM-DD');
    const weekEnd    = now.add(7,'day').format('YYYY-MM-DD');
    const today      = now.format('YYYY-MM-DD');

    const [txMonth, txLast, txYear, txHist, catMonth, bills] = await Promise.all([
      supabase.from('transactions').select('type,amount').eq('user_id',uid).gte('date',monthStart).lte('date',monthEnd),
      supabase.from('transactions').select('type,amount').eq('user_id',uid).gte('date',lastStart).lte('date',lastEnd),
      supabase.from('transactions').select('type,amount').eq('user_id',uid).gte('date',yearStart),
      supabase.from('transactions').select('type,amount,date').eq('user_id',uid).gte('date',histStart),
      supabase.from('transactions').select('category_id,amount,categories(id,name,icon,color,budget_limit)').eq('user_id',uid).eq('type','expense').gte('date',monthStart).lte('date',monthEnd),
      supabase.from('bills').select('*').eq('user_id',uid).eq('paid',false).lte('due_date',weekEnd).gte('due_date',today),
    ]);

    const sum = (rows: any[], type: string) => (rows||[]).filter(t=>t.type===type).reduce((s,t)=>s+Number(t.amount),0);

    const mIncome  = sum(txMonth.data||[], 'income');
    const mExpense = sum(txMonth.data||[], 'expense');
    const lIncome  = sum(txLast.data||[], 'income');
    const lExpense = sum(txLast.data||[], 'expense');
    const yIncome  = sum(txYear.data||[], 'income');

    // category breakdown
    const catMap: Record<string,any> = {};
    for (const t of (catMonth.data||[])) {
      const ct = (t as any).categories;
      const key = t.category_id || 'none';
      if (!catMap[key]) catMap[key] = { category_id: key, category_name: ct?.name||'Sem cat', icon: ct?.icon||'📦', color: ct?.color||'#6366f1', budget_limit: ct?.budget_limit||null, total: 0 };
      catMap[key].total += Number(t.amount);
    }
    const categories = Object.values(catMap).sort((a:any,b:any)=>b.total-a.total);

    // monthly history
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

  useEffect(() => { load(); }, [months]);

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

  if (loading) return <p style={{ textAlign:'center', color: c.textFaint, padding:80 }}>Carregando...</p>;

  const m = data.currentMonth;
  const l = data.lastMonth;

  const kpis = [
    { label:'Receitas (mês)',  value:m.income,  prev:l.income,  good:(d:number)=>d>0 },
    { label:'Despesas (mês)',  value:m.expense, prev:l.expense, good:(d:number)=>d<0 },
    { label:'Saldo (mês)',     value:m.balance, prev:l.balance, good:(d:number)=>d>0 },
    { label:'Receitas (ano)',  value:data.year.income, prev:null, good:()=>true },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Relatórios</h1>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Análise detalhada das suas finanças</p>
        </div>
        <button onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textSecondary, fontSize:13, fontWeight:500, cursor:'pointer' }}>
          <Download size={15}/> Exportar CSV
        </button>
      </div>

      {/* Period toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[3,6,12].map(m_ => (
          <button key={m_} onClick={() => setMonths(m_)} style={{ padding:'8px 20px', borderRadius:9, border:months===m_?'none':`1.5px solid ${c.border}`, background:months===m_?c.text:c.surface, color:months===m_?c.surface:c.textMuted, fontSize:13, fontWeight:500, cursor:'pointer' }}>
            {m_} meses
          </button>
        ))}
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
          <p style={{ margin:'0 0 16px', fontSize:12, color:c.textFaint }}>{months} meses</p>
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
                <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{ borderRadius:10, border:`1px solid ${c.border}`, fontSize:13, background:c.surface, color:c.text }}/>
                <Area type="monotone" dataKey="Receitas" stroke="#22c55e" strokeWidth={2} fill="url(#gR)"/>
                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#gD)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <p style={{ textAlign:'center', color:c.textFaint, padding:40, fontSize:13 }}>Sem dados no período</p>}
        </div>

        <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, padding:'20px', boxShadow:c.shadow }}>
          <p style={{ margin:'0 0 16px', fontWeight:600, fontSize:15, color:c.textSecondary }}>Gastos por Categoria</p>
          {data.categories.length === 0
            ? <p style={{ textAlign:'center', color:c.textFaint, padding:20, fontSize:13 }}>Sem despesas este mês</p>
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

      {/* Bills due */}
      {data.billsDueThisWeek.length > 0 && (
        <div style={{ background:c.surface, borderRadius:16, border:'1px solid #fde68a', boxShadow:c.shadow, overflow:'hidden' }}>
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
