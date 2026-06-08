'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { Plus, ArrowUpRight, ArrowDownRight, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import AddTransactionModal from '@/components/ui/AddTransactionModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import dayjs from 'dayjs';
import { useTheme } from '@/lib/theme-context';

function fmt(v: number) { return formatCurrency(v); }
function fmtK(v: number) { return v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`; }

export default function DashboardPage() {
  const { c, isDark } = useTheme();
  const [data, setData]         = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    // Auto-generate recurring transactions
    import('@/lib/recurring').then(({ checkRecurring }) => checkRecurring(uid)).catch(() => {});

    const now         = dayjs();
    const monthStart  = now.startOf('month').format('YYYY-MM-DD');
    const monthEnd    = now.endOf('month').format('YYYY-MM-DD');
    const today       = now.format('YYYY-MM-DD');
    const weekStart   = now.startOf('week').format('YYYY-MM-DD');
    const weekEnd7    = now.add(7, 'day').format('YYYY-MM-DD');
    const lastStart   = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const lastEnd     = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
    const sixMonthsAgo = now.subtract(5, 'month').startOf('month').format('YYYY-MM-DD');
    const dayOfMonth  = now.date();
    const daysInMonth = now.daysInMonth();

    const [txMonth, txLast, txToday, txWeek, txHistory, txRecent, catTx, bills, profileRes] = await Promise.all([
      supabase.from('transactions').select('type,amount').eq('user_id', uid).gte('date', monthStart).lte('date', monthEnd),
      supabase.from('transactions').select('type,amount').eq('user_id', uid).gte('date', lastStart).lte('date', lastEnd),
      supabase.from('transactions').select('id,type,amount').eq('user_id', uid).eq('date', today),
      supabase.from('transactions').select('type,amount,date').eq('user_id', uid).gte('date', weekStart).lte('date', today),
      supabase.from('transactions').select('type,amount,date').eq('user_id', uid).gte('date', sixMonthsAgo),
      supabase.from('transactions').select('id,type,amount,description,date,source,categories(name,icon,color)').eq('user_id', uid).order('date', { ascending: false }).limit(8),
      supabase.from('transactions').select('category_id,amount,categories(id,name,icon,color,budget_limit)').eq('user_id', uid).eq('type', 'expense').gte('date', monthStart).lte('date', monthEnd),
      supabase.from('bills').select('*').eq('user_id', uid).eq('paid', false).lte('due_date', weekEnd7).order('due_date', { ascending: true }),
      supabase.from('profiles').select('budget_mode,budget_pct,budget_fixed,name').eq('id', uid).maybeSingle(),
    ]);

    const income  = (txMonth.data||[]).filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const expense = (txMonth.data||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    const lIncome  = (txLast.data||[]).filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const lExpense = (txLast.data||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);

    // Weekly summary
    const weekIncome  = (txWeek.data||[]).filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const weekExpense = (txWeek.data||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);

    // Month forecast (linear projection)
    const dailyRate   = expense / dayOfMonth;
    const forecast    = dailyRate * daysInMonth;
    const forecastPct = income > 0 ? Math.round(forecast / income * 100) : 0;

    // Budget usage by category
    const catMap: Record<string, any> = {};
    for (const t of (catTx.data||[])) {
      const ct  = (t as any).categories;
      const key = t.category_id || 'none';
      if (!catMap[key]) catMap[key] = { name: ct?.name||'Sem cat', icon: ct?.icon||'📦', color: ct?.color||'#6366f1', budget: ct?.budget_limit||null, spent: 0 };
      catMap[key].spent += Number(t.amount);
    }
    const pieData    = Object.values(catMap).sort((a:any,b:any)=>b.spent-a.spent).slice(0,6);
    const budgetData = Object.values(catMap).filter((c:any)=>c.budget).sort((a:any,b:any)=>b.spent/b.budget-a.spent/a.budget);

    // Monthly history bar chart
    const histMap: Record<string, {income:number,expense:number}> = {};
    for (const t of (txHistory.data||[])) {
      const mo = dayjs(t.date).format('YYYY-MM');
      if (!histMap[mo]) histMap[mo] = {income:0,expense:0};
      histMap[mo][t.type as 'income'|'expense'] += Number(t.amount);
    }

    // Net worth evolution (cumulative balance)
    let cumulative = 0;
    const wealthData = Object.entries(histMap).sort(([a],[b])=>a.localeCompare(b)).map(([mo,v])=>{
      cumulative += v.income - v.expense;
      return { m: dayjs(mo).format('MMM'), Patrimônio: cumulative, Receitas: v.income, Despesas: v.expense };
    });

    // Global budget from profile
    const prof = profileRes.data;
    let globalLimit = 0;
    if (prof?.budget_mode === 'percent' && prof.budget_pct) globalLimit = income * prof.budget_pct / 100;
    else if (prof?.budget_mode === 'fixed' && prof.budget_fixed) globalLimit = Number(prof.budget_fixed);
    const globalPct  = globalLimit > 0 ? Math.round(expense / globalLimit * 100) : 0;
    const globalOver = globalLimit > 0 && expense > globalLimit;

    setData({
      income, expense, balance: income - expense,
      lIncome, lExpense,
      todayCount: (txToday.data||[]).length,
      todayExpense: (txToday.data||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0),
      weekIncome, weekExpense,
      forecast, forecastPct,
      pieData, wealthData, budgetData,
      bills: bills.data||[],
      globalLimit, globalPct, globalOver,
      userName: prof?.name || session.user.email?.split('@')[0] || 'Cliente',
    });
    setTransactions(txRecent.data||[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ color: c.textFaint, fontSize: 14, margin: '0 0 2px' }}>
            {new Date().toLocaleString('pt-BR',{weekday:'long', day:'numeric', month:'long'})}
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: 0 }}>
            Bem-vindo, {data.userName?.split(' ')[0]} 👋
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:11, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(34,197,94,0.3)' }}>
          <Plus size={16}/> Nova Transação
        </button>
      </div>

      {/* Main stats */}
      <div className="grid-stats">
        <StatCard title="Saldo do Mês"  value={fmt(data.balance)} icon="💳" accent="#6366f1"
          badge={data.balance >= 0 ? '✓ positivo' : '⚠ negativo'} badgeGreen={data.balance >= 0} />
        <StatCard title="Receitas"      value={fmt(data.income)}  icon="💰" accent="#22c55e"
          badge={data.lIncome ? `${data.income >= data.lIncome ? '+' : ''}${Math.round((data.income-data.lIncome)/data.lIncome*100)}% vs mês ant.` : undefined}
          badgeGreen={data.income >= data.lIncome} />
        <StatCard title="Despesas"      value={fmt(data.expense)} icon="💸" accent="#ef4444"
          badge={data.lExpense ? `${Math.round((data.expense-data.lExpense)/data.lExpense*100)}% vs mês ant.` : undefined}
          badgeGreen={data.expense <= data.lExpense} />
        <StatCard title="Hoje"          value={fmt(data.todayExpense)} icon="📅" accent="#f97316"
          badge={`${data.todayCount} transaç${data.todayCount===1?'ão':'ões'}`} badgeGreen />
      </div>

      {/* Global budget bar */}
      {data.globalLimit > 0 && (
        <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${data.globalOver ? '#fca5a5' : c.border}`, padding: '16px 20px', marginBottom: 16, boxShadow: c.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>💰</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: c.textSecondary }}>Orçamento do Mês</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: c.textMuted }}>{fmt(data.expense)} / {fmt(data.globalLimit)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: data.globalOver ? '#fee2e2' : data.globalPct > 80 ? '#fff7ed' : '#dcfce7', color: data.globalOver ? '#dc2626' : data.globalPct > 80 ? '#ea580c' : '#16a34a' }}>
                {data.globalPct}%
              </span>
              <Link href="/dashboard/budget" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Editar →</Link>
            </div>
          </div>
          <div style={{ background: c.inputBg, borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(data.globalPct, 100)}%`, background: data.globalOver ? '#ef4444' : data.globalPct > 80 ? '#f97316' : '#22c55e', transition: 'width 0.6s' }}/>
          </div>
          {data.globalOver && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>⚠️ Limite ultrapassado em {fmt(data.expense - data.globalLimit)}</p>}
        </div>
      )}

      {/* Weekly + Forecast row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        {/* Weekly summary */}
        <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, padding:'18px 20px', boxShadow:c.shadow }}>
          <p style={{ margin:'0 0 14px', fontWeight:700, fontSize:14, color:c.textSecondary }}>📅 Resumo da Semana</p>
          <div style={{ display:'flex', gap:16 }}>
            <div style={{ flex:1 }}>
              <p style={{ margin:'0 0 3px', fontSize:11, color:c.textFaint, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Entradas</p>
              <p style={{ margin:0, fontSize:18, fontWeight:700, color:'#22c55e' }}>{fmt(data.weekIncome)}</p>
            </div>
            <div style={{ width:1, background:c.borderLight }}/>
            <div style={{ flex:1 }}>
              <p style={{ margin:'0 0 3px', fontSize:11, color:c.textFaint, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Saídas</p>
              <p style={{ margin:0, fontSize:18, fontWeight:700, color:'#ef4444' }}>{fmt(data.weekExpense)}</p>
            </div>
            <div style={{ width:1, background:c.borderLight }}/>
            <div style={{ flex:1 }}>
              <p style={{ margin:'0 0 3px', fontSize:11, color:c.textFaint, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Saldo</p>
              <p style={{ margin:0, fontSize:18, fontWeight:700, color:data.weekIncome-data.weekExpense>=0?'#6366f1':'#ef4444' }}>{fmt(data.weekIncome-data.weekExpense)}</p>
            </div>
          </div>
        </div>

        {/* Month forecast */}
        <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, padding:'18px 20px', boxShadow:c.shadow }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:14, color:c.textSecondary }}>🔮 Previsão do Mês</p>
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:data.forecastPct>100?'#fee2e2':'#dcfce7', color:data.forecastPct>100?'#dc2626':'#16a34a' }}>
              {data.forecastPct}% da receita
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <p style={{ margin:'0 0 2px', fontSize:11, color:c.textFaint }}>Projeção de gastos</p>
              <p style={{ margin:0, fontSize:20, fontWeight:700, color:data.forecastPct>100?'#ef4444':c.text }}>{fmt(data.forecast)}</p>
            </div>
            <p style={{ margin:0, fontSize:13, color:c.textFaint }}>Receita: {fmt(data.income)}</p>
          </div>
          <div style={{ background:c.inputBg, borderRadius:99, height:7, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, width:`${Math.min(data.forecastPct,100)}%`, background:data.forecastPct>100?'#ef4444':data.forecastPct>80?'#f97316':'#22c55e', transition:'width 0.5s' }}/>
          </div>
        </div>
      </div>

      {/* Bills alert */}
      {data.bills.length > 0 && (
        <div style={{ background:c.surface, border:`1px solid ${isDark?'#854d0e':'#fde68a'}`, borderRadius:16, marginBottom:20, overflow:'hidden' }}>
          <div style={{ background:isDark?'rgba(120,53,15,0.3)':'linear-gradient(135deg,#fffbeb,#fef3c7)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>⏰</span>
              <div>
                <p style={{ margin:0, fontWeight:700, color:isDark?'#fbbf24':'#92400e', fontSize:14 }}>
                  {data.bills.length} {data.bills.length===1?'conta pendente':'contas pendentes'} esta semana
                </p>
                <p style={{ margin:0, color:isDark?'#f59e0b':'#b45309', fontSize:12 }}>
                  Total: {fmt(data.bills.reduce((s:number,b:any)=>s+Number(b.amount),0))}
                </p>
              </div>
            </div>
            <Link href="/dashboard/bills" style={{ fontSize:12, fontWeight:600, color:isDark?'#fbbf24':'#92400e', textDecoration:'none', background:isDark?'rgba(251,191,36,0.15)':'#fde68a', padding:'5px 12px', borderRadius:8 }}>
              Ver todas →
            </Link>
          </div>
          <div style={{ padding:'4px 0' }}>
            {data.bills.map((b:any, i:number) => {
              const diff    = dayjs(b.due_date).diff(dayjs(),'day');
              const overdue = diff < 0;
              return (
                <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:i<data.bills.length-1?`1px solid ${c.borderLight}`:'none' }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:overdue?'#fef2f2':'#fffbeb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {overdue ? <AlertTriangle size={14} color="#dc2626"/> : <Clock size={14} color="#d97706"/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:'0 0 1px', fontSize:13, fontWeight:600, color:c.textSecondary, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.description}</p>
                    <p style={{ margin:0, fontSize:11, color:overdue?'#dc2626':'#d97706', fontWeight:500 }}>
                      {overdue ? `Venceu há ${Math.abs(diff)} dia${Math.abs(diff)!==1?'s':''}` : diff===0?'Vence hoje!':`Vence em ${diff} dia${diff!==1?'s':''}`}
                    </p>
                  </div>
                  <p style={{ margin:0, fontWeight:700, fontSize:13, color:overdue?'#dc2626':c.text, flexShrink:0 }}>{fmt(Number(b.amount))}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget alerts */}
      {data.budgetData.length > 0 && (
        <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, padding:'18px 20px', marginBottom:20, boxShadow:c.shadow }}>
          <p style={{ margin:'0 0 14px', fontWeight:700, fontSize:14, color:c.textSecondary }}>🎯 Orçamento por Categoria</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {data.budgetData.map((cat:any) => {
              const pct  = Math.min(cat.spent / cat.budget * 100, 100);
              const over = cat.spent > cat.budget;
              return (
                <div key={cat.name}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, color:c.textSecondary, fontWeight:500 }}>{cat.icon} {cat.name}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:over?'#ef4444':c.textMuted }}>
                      {fmt(cat.spent)} / {fmt(cat.budget)} {over && '🔴'}
                    </span>
                  </div>
                  <div style={{ background:c.inputBg, borderRadius:99, height:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, background:over?'#ef4444':pct>80?'#f97316':cat.color, transition:'width 0.5s' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid-charts">
        <Card title="Receitas vs Despesas" subtitle="Últimos 6 meses">
          {data.wealthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.wealthData} barGap={4} margin={{ top:4, right:4, left:10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.borderLight}/>
                <XAxis dataKey="m" tick={{ fontSize:12, fill:c.textFaint }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:c.textFaint }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{ borderRadius:10, border:`1px solid ${c.border}`, fontSize:13, background:c.surface, color:c.text }}/>
                <Bar dataKey="Receitas" fill="#22c55e" radius={[5,5,0,0]}/>
                <Bar dataKey="Despesas" fill="#f87171" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Registre transações para ver o gráfico"/>}
        </Card>

        <Card title="Por Categoria" subtitle="Mês atual">
          {data.pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="spent" nameKey="name">
                    {data.pieData.map((e:any, i:number) => <Cell key={i} fill={e.color||'#6366f1'}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{ borderRadius:10, border:`1px solid ${c.border}`, fontSize:13, background:c.surface, color:c.text }}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 12px' }}>
                {data.pieData.map((e:any) => (
                  <div key={e.name} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:e.color||'#6366f1' }}/>
                    <span style={{ fontSize:11, color:c.textFaint }}>{e.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty text="Nenhum dado ainda"/>}
        </Card>
      </div>

      {/* Wealth evolution */}
      {data.wealthData.length > 1 && (
        <Card title="Evolução do Patrimônio" subtitle="Saldo acumulado últimos 6 meses">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.wealthData} margin={{ top:4, right:4, left:10, bottom:0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.borderLight}/>
              <XAxis dataKey="m" tick={{ fontSize:12, fill:c.textFaint }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:c.textFaint }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
              <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{ borderRadius:10, border:`1px solid ${c.border}`, fontSize:13, background:c.surface, color:c.text }}/>
              <Area type="monotone" dataKey="Patrimônio" stroke="#6366f1" strokeWidth={2.5} fill="url(#gP)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Recent transactions */}
      <Card title="Últimas Transações" subtitle={`${transactions.length} registros`} action={
        <a href="/dashboard/transactions" style={{ color:'#22c55e', fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
          Ver todas <ArrowUpRight size={14}/>
        </a>
      }>
        {transactions.length ? <TxList txs={transactions} onRefresh={load}/> : <Empty text="Nenhuma transação ainda. Clique em Nova Transação!"/>}
      </Card>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }}/>}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────

function Card({ title, subtitle, action, children }: any) {
  const { c } = useTheme();
  return (
    <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, boxShadow:c.shadow, overflow:'hidden', marginBottom:20 }}>
      {title && (
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${c.borderLight}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ margin:0, fontWeight:600, fontSize:15, color:c.textSecondary }}>{title}</p>
            {subtitle && <p style={{ margin:0, fontSize:12, color:c.textFaint, marginTop:1 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding:'16px 20px' }}>{children}</div>
    </div>
  );
}

function StatCard({ title, value, icon, accent, badge, badgeGreen }: any) {
  const { c } = useTheme();
  return (
    <div style={{ background:c.surface, borderRadius:16, border:`1px solid ${c.border}`, boxShadow:c.shadow, padding:20, borderTop:`3px solid ${accent}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ margin:0, fontSize:11, fontWeight:600, color:c.textFaint, letterSpacing:'0.06em', textTransform:'uppercase' }}>{title}</p>
        <div style={{ width:34, height:34, borderRadius:9, background:accent+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{icon}</div>
      </div>
      <p style={{ margin:'0 0 10px', fontSize:22, fontWeight:700, color:c.text }}>{value}</p>
      {badge && (
        <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:badgeGreen?'#dcfce7':'#fee2e2', color:badgeGreen?'#16a34a':'#dc2626' }}>{badge}</span>
      )}
    </div>
  );
}

function TxList({ txs, onRefresh }: { txs: any[]; onRefresh: () => void }) {
  const { c } = useTheme();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editTx, setEditTx]       = useState<any | null>(null);

  async function doDelete() {
    if (!confirmId) return;
    await supabase.from('transactions').delete().eq('id', confirmId);
    setConfirmId(null);
    onRefresh();
  }

  return (
    <div>
      {confirmId && <ConfirmModal title="Excluir transação?" message="Esta transação será removida permanentemente." confirmLabel="Excluir" onConfirm={doDelete} onCancel={() => setConfirmId(null)}/>}
      {editTx && <AddTransactionModal transaction={editTx} onClose={() => setEditTx(null)} onSuccess={() => { setEditTx(null); onRefresh(); }}/>}
      {txs.map((tx:any, i:number) => (
        <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 0', borderBottom:i<txs.length-1?`1px solid ${c.borderLight}`:'none' }}>
          <div style={{ width:40, height:40, borderRadius:12, background:((tx.categories as any)?.color||'#6366f1')+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
            {(tx.categories as any)?.icon || (tx.type==='income'?'💰':'💸')}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:'0 0 2px', fontWeight:500, fontSize:14, color:c.textSecondary, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description}</p>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:c.textFaint }}>{(tx.categories as any)?.name||'Sem categoria'}</span>
              <span style={{ fontSize:11, color:c.border }}>·</span>
              <span style={{ fontSize:12, color:c.textFaint }}>{new Date(tx.date+'T12:00').toLocaleDateString('pt-BR')}</span>
              {tx.source==='whatsapp' && <span style={{ fontSize:10, background:'#dcfce7', color:'#15803d', fontWeight:600, padding:'1px 6px', borderRadius:99 }}>💬</span>}
            </div>
          </div>
          <p style={{ margin:0, fontWeight:700, fontSize:15, color:tx.type==='income'?'#16a34a':'#dc2626', flexShrink:0 }}>
            {tx.type==='income'?'+':'-'} {fmt(Number(tx.amount))}
          </p>
          <button onClick={() => setEditTx(tx)} style={{ background:'none', border:'none', cursor:'pointer', color:c.textFaint, padding:4, fontSize:13 }}>✏️</button>
          <button onClick={() => setConfirmId(tx.id)} style={{ background:'none', border:'none', cursor:'pointer', color:c.border, padding:4 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  const { c } = useTheme();
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:c.textFaint, fontSize:14 }}>Carregando...</div>;
}
function Empty({ text }: { text: string }) {
  const { c } = useTheme();
  return <p style={{ textAlign:'center', color:c.textFaint, fontSize:14, padding:'24px 0', margin:0 }}>{text}</p>;
}
