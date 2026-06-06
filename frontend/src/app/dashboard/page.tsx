'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Plus, ArrowUpRight, ArrowDownRight, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import AddTransactionModal from '@/components/ui/AddTransactionModal';
import dayjs from 'dayjs';

function fmt(v: number) { return formatCurrency(v); }
function fmtK(v: number) { return v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`; }

export default function DashboardPage() {
  const [data, setData]         = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    const now        = dayjs();
    const monthStart = now.startOf('month').format('YYYY-MM-DD');
    const monthEnd   = now.endOf('month').format('YYYY-MM-DD');
    const today      = now.format('YYYY-MM-DD');
    const weekEnd    = now.add(7, 'day').format('YYYY-MM-DD');
    const lastStart  = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const lastEnd    = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
    const sixMonthsAgo = now.subtract(5, 'month').startOf('month').format('YYYY-MM-DD');

    const [txMonth, txLast, txToday, txHistory, txRecent, cats, bills] = await Promise.all([
      supabase.from('transactions').select('type,amount').eq('user_id', uid).gte('date', monthStart).lte('date', monthEnd),
      supabase.from('transactions').select('type,amount').eq('user_id', uid).gte('date', lastStart).lte('date', lastEnd),
      supabase.from('transactions').select('id,type,amount').eq('user_id', uid).eq('date', today),
      supabase.from('transactions').select('type,amount,date').eq('user_id', uid).gte('date', sixMonthsAgo),
      supabase.from('transactions').select('id,type,amount,description,date,source,categories(name,icon,color)').eq('user_id', uid).order('date', { ascending: false }).limit(8),
      supabase.from('transactions').select('category_id,amount,categories(id,name,icon,color)').eq('user_id', uid).eq('type', 'expense').gte('date', monthStart).lte('date', monthEnd),
      supabase.from('bills').select('*').eq('user_id', uid).eq('paid', false).lte('due_date', weekEnd).order('due_date', { ascending: true }),
    ]);

    // current month totals
    const income  = (txMonth.data||[]).filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const expense = (txMonth.data||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    // last month
    const lIncome  = (txLast.data||[]).filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const lExpense = (txLast.data||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);

    // category spending (pie)
    const catMap: Record<string, any> = {};
    for (const t of (cats.data||[])) {
      const c = (t as any).categories;
      const key = t.category_id || 'none';
      if (!catMap[key]) catMap[key] = { category_name: c?.name||'Sem cat', color: c?.color||'#6366f1', total: 0 };
      catMap[key].total += Number(t.amount);
    }
    const pieData = Object.values(catMap).sort((a:any,b:any)=>b.total-a.total).slice(0,6);

    // monthly history (bar chart)
    const histMap: Record<string, {income:number,expense:number}> = {};
    for (const t of (txHistory.data||[])) {
      const mo = dayjs(t.date).format('YYYY-MM');
      if (!histMap[mo]) histMap[mo] = {income:0,expense:0};
      histMap[mo][t.type as 'income'|'expense'] += Number(t.amount);
    }
    const chartData = Object.entries(histMap).sort(([a],[b])=>a.localeCompare(b)).map(([mo,v])=>({
      m: dayjs(mo).format('MMM'),
      Receitas: v.income,
      Despesas: v.expense,
    }));

    setData({
      income, expense, balance: income - expense,
      lIncome, lExpense,
      todayCount: (txToday.data||[]).length,
      todayExpense: (txToday.data||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0),
      pieData, chartData,
      bills: bills.data||[],
    });
    setTransactions(txRecent.data||[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Visão Geral</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{new Date().toLocaleString('pt-BR',{month:'long',year:'numeric'})}</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none',
          borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
        }}><Plus size={16}/> Nova Transação</button>
      </div>

      {/* Stats */}
      <div className="grid-stats">
        <StatCard title="Saldo do Mês"  value={fmt(data.balance)}      icon="💳" accent="#6366f1" trend={data.balance>=0?'up':'down'} trendLabel="este mês" />
        <StatCard title="Receitas"       value={fmt(data.income)}       icon="💰" accent="#22c55e" trend="up" trendLabel="este mês" />
        <StatCard title="Despesas"       value={fmt(data.expense)}      icon="💸" accent="#ef4444"
          trend={data.expense <= data.lExpense ? 'up' : 'down'}
          trendLabel={data.lExpense ? `${Math.abs(Math.round((data.expense-data.lExpense)/data.lExpense*100))}% vs mês ant.` : 'vs mês ant.'} />
        <StatCard title="Hoje"           value={fmt(data.todayExpense)} icon="📅" accent="#f97316" subtitle={`${data.todayCount} transações`} />
      </div>

      {/* Bills alert */}
      {data.bills.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 16, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⏰</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: 14 }}>
                  {data.bills.length} {data.bills.length === 1 ? 'conta pendente' : 'contas pendentes'} esta semana
                </p>
                <p style={{ margin: 0, color: '#b45309', fontSize: 12 }}>
                  Total: {fmt(data.bills.reduce((s: number, b: any) => s + Number(b.amount), 0))}
                </p>
              </div>
            </div>
            <Link href="/dashboard/bills" style={{ fontSize: 12, fontWeight: 600, color: '#92400e', textDecoration: 'none', background: '#fde68a', padding: '5px 12px', borderRadius: 8 }}>
              Ver todas →
            </Link>
          </div>
          <div style={{ padding: '4px 0' }}>
            {data.bills.map((b: any, i: number) => {
              const due = dayjs(b.due_date);
              const diff = due.diff(dayjs(), 'day');
              const overdue = diff < 0;
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < data.bills.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: overdue ? '#fef2f2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {overdue ? <AlertTriangle size={14} color="#dc2626"/> : <Clock size={14} color="#d97706"/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description}</p>
                    <p style={{ margin: 0, fontSize: 11, color: overdue ? '#dc2626' : '#d97706', fontWeight: 500 }}>
                      {overdue ? `Venceu há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff} dia${diff !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: overdue ? '#dc2626' : '#0f172a', flexShrink: 0 }}>{fmt(Number(b.amount))}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid-charts">
        <Card title="Receitas vs Despesas" subtitle="Últimos 6 meses">
          {data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.chartData} barGap={4} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="m" tick={{ fontSize:12, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip formatter={(v:number) => fmt(v)} contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:13 }} />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[5,5,0,0]} />
                <Bar dataKey="Despesas" fill="#f87171" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Registre transações para ver o gráfico" />}
        </Card>

        <Card title="Por Categoria" subtitle="Mês atual">
          {data.pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="total" nameKey="category_name">
                    {data.pieData.map((e:any, i:number) => <Cell key={i} fill={e.color||'#6366f1'} />)}
                  </Pie>
                  <Tooltip formatter={(v:number) => fmt(v)} contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 12px' }}>
                {data.pieData.map((e:any) => (
                  <div key={e.category_name} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:e.color||'#6366f1' }}/>
                    <span style={{ fontSize:11, color:'#64748b' }}>{e.category_name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty text="Nenhum dado ainda" />}
        </Card>
      </div>

      {/* Recent transactions */}
      <Card title="Últimas Transações" subtitle={`${transactions.length} registros`} action={
        <a href="/dashboard/transactions" style={{ color:'#22c55e', fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
          Ver todas <ArrowUpRight size={14}/>
        </a>
      }>
        {transactions.length ? <TxList txs={transactions} onRefresh={load} /> : <Empty text="Nenhuma transação ainda. Clique em Nova Transação!" />}
      </Card>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────

function Card({ title, subtitle, action, children }: any) {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden', marginBottom:20 }}>
      {title && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ margin:0, fontWeight:600, fontSize:15, color:'#1e293b' }}>{title}</p>
            {subtitle && <p style={{ margin:0, fontSize:12, color:'#94a3b8', marginTop:1 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding:'16px 20px' }}>{children}</div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, accent, trend, trendLabel }: any) {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:20, borderTop:`3px solid ${accent}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase' }}>{title}</p>
        <div style={{ width:34, height:34, borderRadius:9, background:accent+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{icon}</div>
      </div>
      <p style={{ margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#0f172a' }}>{value}</p>
      {subtitle && <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>{subtitle}</p>}
      {trendLabel && (
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:99, background:trend==='up'?'#dcfce7':'#fee2e2' }}>
            {trend==='up' ? <ArrowUpRight size={11} color="#16a34a"/> : <ArrowDownRight size={11} color="#dc2626"/>}
            <span style={{ fontSize:11, fontWeight:600, color:trend==='up'?'#16a34a':'#dc2626' }}>{trendLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TxList({ txs, onRefresh }: { txs: any[]; onRefresh: () => void }) {
  async function del(id: string) {
    if (!confirm('Excluir esta transação?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    onRefresh();
  }
  return (
    <div>
      {txs.map((tx: any, i: number) => (
        <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 0', borderBottom:i<txs.length-1?'1px solid #f8fafc':'none' }}>
          <div style={{ width:40, height:40, borderRadius:12, background:((tx.categories as any)?.color||'#6366f1')+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
            {(tx.categories as any)?.icon || (tx.type==='income'?'💰':'💸')}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:'0 0 2px', fontWeight:500, fontSize:14, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description}</p>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{(tx.categories as any)?.name||'Sem categoria'}</span>
              <span style={{ fontSize:11, color:'#cbd5e1' }}>·</span>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{new Date(tx.date+'T12:00').toLocaleDateString('pt-BR')}</span>
              {tx.source==='whatsapp' && <span style={{ fontSize:10, background:'#dcfce7', color:'#15803d', fontWeight:600, padding:'1px 6px', borderRadius:99 }}>💬 WhatsApp</span>}
            </div>
          </div>
          <p style={{ margin:0, fontWeight:700, fontSize:15, color:tx.type==='income'?'#16a34a':'#dc2626', flexShrink:0 }}>
            {tx.type==='income'?'+':'-'} {fmt(Number(tx.amount))}
          </p>
          <button onClick={() => del(tx.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#cbd5e1', padding:4, display:'flex', alignItems:'center' }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#94a3b8', fontSize:14 }}>Carregando...</div>;
}

function Empty({ text }: { text: string }) {
  return <p style={{ textAlign:'center', color:'#94a3b8', fontSize:14, padding:'24px 0', margin:0 }}>{text}</p>;
}
