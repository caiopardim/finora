'use client';

import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, Tag, Target, BarChart2,
  Settings, Plus, Trash2, TrendingUp, TrendingDown, Check,
  Download, Bell, Search, ChevronRight, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtShort(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v}`;
}

// ── Mock data ──────────────────────────────────────────────────────────────

const TRANSACTIONS = [
  { id:'1', type:'income',  amount:4500,  description:'Salário mensal',     date:'10/05',  cat:'Salário',      icon:'💼', color:'#10b981', src:'web'       },
  { id:'2', type:'income',  amount:800,   description:'Projeto freelance',  date:'15/05',  cat:'Freelance',    icon:'💻', color:'#6366f1', src:'whatsapp'  },
  { id:'3', type:'expense', amount:1200,  description:'Aluguel',            date:'01/06',  cat:'Moradia',      icon:'🏠', color:'#eab308', src:'web'       },
  { id:'4', type:'expense', amount:85,    description:'Supermercado',       date:'02/06',  cat:'Alimentação',  icon:'🍔', color:'#ef4444', src:'whatsapp'  },
  { id:'5', type:'expense', amount:45,    description:'Combustível',        date:'03/06',  cat:'Transporte',   icon:'🚗', color:'#f97316', src:'whatsapp'  },
  { id:'6', type:'expense', amount:32,    description:'Almoço restaurante', date:'04/06',  cat:'Alimentação',  icon:'🍔', color:'#ef4444', src:'whatsapp'  },
  { id:'7', type:'expense', amount:250,   description:'Plano de saúde',     date:'04/06',  cat:'Saúde',        icon:'💊', color:'#22c55e', src:'web'       },
  { id:'8', type:'expense', amount:18.50, description:'Café da manhã',      date:'05/06',  cat:'Alimentação',  icon:'🍔', color:'#ef4444', src:'whatsapp'  },
];

const CATEGORIES = [
  { name:'Alimentação',  icon:'🍔', color:'#ef4444', type:'expense', budget:800,  spent:650  },
  { name:'Transporte',   icon:'🚗', color:'#f97316', type:'expense', budget:400,  spent:340  },
  { name:'Moradia',      icon:'🏠', color:'#eab308', type:'expense', budget:1200, spent:1200 },
  { name:'Saúde',        icon:'💊', color:'#22c55e', type:'expense', budget:300,  spent:250  },
  { name:'Lazer',        icon:'🎮', color:'#3b82f6', type:'expense', budget:200,  spent:180  },
  { name:'Internet',     icon:'📱', color:'#06b6d4', type:'expense', budget:100,  spent:99   },
  { name:'Vestuário',    icon:'👕', color:'#ec4899', type:'expense', budget:null, spent:171  },
  { name:'Salário',      icon:'💼', color:'#10b981', type:'income',  budget:null, spent:null },
  { name:'Freelance',    icon:'💻', color:'#6366f1', type:'income',  budget:null, spent:null },
];

const GOALS = [
  { name:'Reserva de emergência', target:10000, current:2500,  deadline:'Dez/26', icon:'🏦', color:'#6366f1' },
  { name:'Viagem nas férias',      target:5000,  current:800,   deadline:'Set/26', icon:'✈️', color:'#f97316' },
  { name:'Notebook novo',          target:3500,  current:3500,  deadline:null,     icon:'💻', color:'#10b981' },
];

const HISTORY = [
  { m:'Jan', r:4200, d:3100 }, { m:'Fev', r:4800, d:2900 },
  { m:'Mar', r:5000, d:3300 }, { m:'Abr', r:4600, d:2800 },
  { m:'Mai', r:4800, d:3100 }, { m:'Jun', r:5300, d:2890 },
];

const PIE_DATA = [
  { name:'Alimentação', value:650,  color:'#ef4444' },
  { name:'Moradia',     value:1200, color:'#eab308' },
  { name:'Transporte',  value:340,  color:'#f97316' },
  { name:'Saúde',       value:250,  color:'#22c55e' },
  { name:'Lazer',       value:180,  color:'#3b82f6' },
  { name:'Outros',      value:270,  color:'#8b5cf6' },
];

const BILLS = [
  { desc:'Internet Fibra', amount:99.90,  due:'07/06' },
  { desc:'Streaming',      amount:39.90,  due:'09/06' },
  { desc:'Energia',        amount:180.00, due:'12/06' },
];

const NAV = [
  { id:'overview',     label:'Visão Geral',   icon:LayoutDashboard },
  { id:'transactions', label:'Transações',    icon:ArrowLeftRight   },
  { id:'categories',   label:'Categorias',    icon:Tag              },
  { id:'goals',        label:'Metas',         icon:Target           },
  { id:'reports',      label:'Relatórios',    icon:BarChart2        },
  { id:'settings',     label:'Configurações', icon:Settings         },
];

// ── Root ───────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const [active, setActive] = useState('overview');

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f8fafc', fontFamily:'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width:240, minHeight:'100vh', background:'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)',
        display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh',
      }}>
        {/* Logo */}
        <div style={{ padding:'28px 20px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#22c55e,#16a34a)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            }}>💰</div>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0 }}>Finora</p>
              <p style={{ color:'#64748b', fontSize:11, margin:0 }}>Mais controle, menos planilhas</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2 }}>
          {NAV.map(({ id, label, icon:Icon }) => {
            const isActive = active === id;
            return (
              <button key={id} onClick={() => setActive(id)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
                border:'none', cursor:'pointer', textAlign:'left', width:'100%', transition:'all 0.15s',
                background: isActive ? 'rgba(34,197,94,0.15)' : 'transparent',
                color: isActive ? '#22c55e' : '#94a3b8',
                fontWeight: isActive ? 600 : 400, fontSize:14,
              }}>
                <Icon size={17} />
                {label}
                {isActive && <ChevronRight size={14} style={{ marginLeft:'auto', opacity:0.6 }} />}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:600,
            }}>C</div>
            <div>
              <p style={{ color:'#e2e8f0', fontSize:13, fontWeight:500, margin:0 }}>Caio Pardim</p>
              <p style={{ color:'#475569', fontSize:11, margin:0 }}>caio@email.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Topbar */}
        <header style={{
          background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'14px 32px',
          display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:10,
        }}>
          <div style={{
            flex:1, display:'flex', alignItems:'center', gap:10, background:'#f1f5f9',
            borderRadius:10, padding:'8px 14px',
          }}>
            <Search size={16} color="#94a3b8" />
            <span style={{ color:'#94a3b8', fontSize:14 }}>Buscar transações...</span>
          </div>
          <div style={{
            position:'relative', width:38, height:38, borderRadius:10, background:'#f1f5f9',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
          }}>
            <Bell size={18} color="#64748b" />
            <span style={{
              position:'absolute', top:8, right:8, width:7, height:7, borderRadius:'50%',
              background:'#ef4444', border:'2px solid #fff',
            }} />
          </div>
        </header>

        {/* Content */}
        <main style={{ flex:1, padding:'32px', overflowY:'auto' }}>
          {active === 'overview'     && <OverviewTab />}
          {active === 'transactions' && <TransactionsTab />}
          {active === 'categories'   && <CategoriesTab />}
          {active === 'goals'        && <GoalsTab />}
          {active === 'reports'      && <ReportsTab />}
          {active === 'settings'     && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      <PageHeader
        title="Visão Geral"
        subtitle="Junho 2026"
        action={<ActionBtn icon={<Plus size={16}/>} label="Nova Transação" />}
      />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard title="Saldo do Mês"  value={fmt(2409.50)} icon="💳" trend={+2409.50} accentColor="#6366f1" />
        <StatCard title="Receitas"       value={fmt(5300)}    icon="💰" trend={+500}     accentColor="#22c55e" />
        <StatCard title="Despesas"       value={fmt(2890.50)} icon="💸" trend={-209.50}  accentColor="#ef4444" invertTrend />
        <StatCard title="Hoje"           value={fmt(50.50)}   icon="📅" subtitle="3 transações" accentColor="#f97316" />
      </div>

      {/* Bills alert */}
      <div style={{
        background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fde68a',
        borderRadius:14, padding:'14px 20px', marginBottom:24, display:'flex', alignItems:'center', gap:12,
      }}>
        <span style={{ fontSize:20 }}>⏰</span>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:600, color:'#92400e', fontSize:14 }}>2 contas vencem esta semana</p>
          <p style={{ margin:0, color:'#b45309', fontSize:13 }}>Internet Fibra (07/06) · Streaming (09/06) · Total: {fmt(139.80)}</p>
        </div>
        <button style={{ background:'#f59e0b', border:'none', borderRadius:8, padding:'6px 14px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Ver contas
        </button>
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20, marginBottom:24 }}>
        <Card title="Receitas vs Despesas" subtitle="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={HISTORY} barGap={4} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="m" tick={{ fontSize:12, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip formatter={(v:number) => fmt(v)} contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:13 }} />
              <Bar dataKey="r" name="Receitas" fill="#22c55e" radius={[5,5,0,0]} />
              <Bar dataKey="d" name="Despesas" fill="#f87171" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Por Categoria" subtitle="Junho 2026">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={88} paddingAngle={3} dataKey="value">
                {PIE_DATA.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v:number) => fmt(v)} contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:4 }}>
            {PIE_DATA.map((e) => (
              <div key={e.name} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:e.color }} />
                <span style={{ fontSize:11, color:'#64748b' }}>{e.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card title="Últimas Transações" subtitle="8 registros" action={<LinkBtn label="Ver todas" />}>
        <TxTable txs={TRANSACTIONS.slice(0, 6)} />
      </Card>
    </div>
  );
}

// ── Transactions ───────────────────────────────────────────────────────────

function TransactionsTab() {
  const [filter, setFilter] = useState('');
  const txs = filter ? TRANSACTIONS.filter((t) => t.type === filter) : TRANSACTIONS;
  return (
    <div style={{ maxWidth:900 }}>
      <PageHeader
        title="Transações"
        subtitle={`${txs.length} registros encontrados`}
        action={<ActionBtn icon={<Plus size={16}/>} label="Nova" />}
      />

      {/* Filter bar */}
      <div style={{
        background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
        padding:'14px 20px', marginBottom:20, display:'flex', gap:10, alignItems:'center',
      }}>
        {[['','Todos','#f1f5f9','#475569'],['income','Receitas','#dcfce7','#16a34a'],['expense','Despesas','#fee2e2','#dc2626']].map(([v,l,bg,color]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
            background: filter === v ? (v===''?'#0f172a':v==='income'?'#22c55e':'#ef4444') : bg,
            color: filter === v ? '#fff' : color,
          }}>{l}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <FilterInput placeholder="Data início" type="date" />
          <FilterInput placeholder="Data fim" type="date" />
        </div>
      </div>

      <Card>
        <TxTable txs={txs} />
      </Card>
    </div>
  );
}

// ── Categories ─────────────────────────────────────────────────────────────

function CategoriesTab() {
  const expenses = CATEGORIES.filter(c => c.type === 'expense');
  const incomes  = CATEGORIES.filter(c => c.type === 'income');
  return (
    <div style={{ maxWidth:900 }}>
      <PageHeader
        title="Categorias"
        subtitle={`${CATEGORIES.length} categorias configuradas`}
        action={<ActionBtn icon={<Plus size={16}/>} label="Nova Categoria" />}
      />
      {[{ title:'Despesas 💸', cats:expenses }, { title:'Receitas 💰', cats:incomes }].map(({ title, cats }) => (
        <div key={title} style={{ marginBottom:28 }}>
          <p style={{ fontSize:12, fontWeight:600, color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>{title}</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
            {cats.map((cat) => {
              const pct = cat.budget && cat.spent ? Math.min(cat.spent / cat.budget * 100, 100) : null;
              const over = cat.budget && cat.spent && cat.spent > cat.budget;
              return (
                <div key={cat.name} style={{
                  background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                  padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                  transition:'box-shadow 0.15s',
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:12, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:22, flexShrink:0,
                    background: cat.color + '18',
                  }}>{cat.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:pct!=null?6:0 }}>
                      <span style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{cat.name}</span>
                      {cat.spent != null && (
                        <span style={{ fontSize:13, fontWeight:600, color: over ? '#ef4444' : '#1e293b' }}>
                          {fmt(cat.spent)}
                          {cat.budget && <span style={{ color:'#94a3b8', fontWeight:400 }}> / {fmt(cat.budget)}</span>}
                        </span>
                      )}
                    </div>
                    {pct != null && (
                      <div style={{ background:'#f1f5f9', borderRadius:99, height:6, overflow:'hidden' }}>
                        <div style={{
                          height:'100%', borderRadius:99,
                          width:`${pct}%`,
                          background: over ? '#ef4444' : cat.color,
                          transition:'width 0.4s',
                        }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:4, marginLeft:4 }}>
                    <IconBtn color="#3b82f6" bg="#eff6ff"><Tag size={13}/></IconBtn>
                    <IconBtn color="#ef4444" bg="#fef2f2"><Trash2 size={13}/></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Goals ──────────────────────────────────────────────────────────────────

function GoalsTab() {
  return (
    <div style={{ maxWidth:900 }}>
      <PageHeader
        title="Metas"
        subtitle="Acompanhe seus objetivos financeiros"
        action={<ActionBtn icon={<Plus size={16}/>} label="Nova Meta" />}
      />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {GOALS.map((goal) => {
          const pct = Math.min(goal.current / goal.target * 100, 100);
          const done = pct >= 100;
          return (
            <div key={goal.name} style={{
              background:'#fff', borderRadius:16, border: done ? `2px solid ${goal.color}40` : '1px solid #e2e8f0',
              padding:24, display:'flex', flexDirection:'column', gap:16,
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div style={{
                  width:48, height:48, borderRadius:14, fontSize:24,
                  background: goal.color + '18', display:'flex', alignItems:'center', justifyContent:'center',
                }}>{goal.icon}</div>
                <button style={{
                  background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 10px',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#475569',
                }}>
                  <TrendingUp size={13} /> Adicionar
                </button>
              </div>

              <div>
                <p style={{ fontWeight:700, fontSize:16, color:'#1e293b', margin:'0 0 2px' }}>{goal.name}</p>
                {goal.deadline && <p style={{ color:'#94a3b8', fontSize:12, margin:0 }}>Prazo: {goal.deadline}</p>}
              </div>

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, color:'#64748b' }}>{fmt(goal.current)}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{fmt(goal.target)}</span>
                </div>
                <div style={{ background:'#f1f5f9', borderRadius:99, height:8, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:99, width:`${pct}%`,
                    background: done ? `linear-gradient(90deg,${goal.color},${goal.color}cc)` : `linear-gradient(90deg,${goal.color}88,${goal.color})`,
                    transition:'width 0.6s',
                  }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:goal.color }}>{pct.toFixed(0)}%</span>
                  {done
                    ? <span style={{ fontSize:12, color:goal.color, fontWeight:600 }}>Meta atingida! 🎉</span>
                    : <span style={{ fontSize:12, color:'#94a3b8' }}>Faltam {fmt(goal.target - goal.current)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{
        marginTop:24, background:'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius:16, padding:'20px 24px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div>
          <p style={{ color:'#94a3b8', fontSize:13, margin:'0 0 4px' }}>Total guardado nas metas</p>
          <p style={{ color:'#fff', fontSize:22, fontWeight:700, margin:0 }}>{fmt(6800)}</p>
        </div>
        <div style={{ display:'flex', gap:24 }}>
          {[['Metas ativas', '3'], ['Concluídas', '1'], ['Em andamento', '2']].map(([l,v]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <p style={{ color:'#22c55e', fontSize:22, fontWeight:700, margin:'0 0 2px' }}>{v}</p>
              <p style={{ color:'#64748b', fontSize:12, margin:0 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Reports ────────────────────────────────────────────────────────────────

function ReportsTab() {
  const [period, setPeriod] = useState(6);
  return (
    <div style={{ maxWidth:1100 }}>
      <PageHeader
        title="Relatórios"
        subtitle="Análise detalhada das suas finanças"
        action={
          <button style={{
            display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10,
            border:'1px solid #e2e8f0', background:'#fff', color:'#475569', fontSize:13, fontWeight:500, cursor:'pointer',
          }}>
            <Download size={15} /> Exportar CSV
          </button>
        }
      />

      {/* Period toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[3,6,12].map((m) => (
          <button key={m} onClick={() => setPeriod(m)} style={{
            padding:'7px 18px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500,
            background: period===m ? '#0f172a' : '#fff',
            color: period===m ? '#fff' : '#64748b',
            border: period===m ? 'none' : '1px solid #e2e8f0',
          }}>{m} meses</button>
        ))}
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Receitas (mês)', value:5300, prev:4800, positive:true  },
          { label:'Despesas (mês)', value:2890, prev:3100, positive:false },
          { label:'Saldo (mês)',    value:2410, prev:1700, positive:true  },
          { label:'Receitas (ano)', value:28700, prev:null, positive:true },
        ].map((item) => {
          const diff = item.prev != null ? item.value - item.prev : null;
          const pct  = diff!=null && item.prev ? Math.abs(diff/item.prev*100).toFixed(1) : null;
          const good = diff!=null && ((diff>0 && item.positive)||(diff<0 && !item.positive));
          return (
            <div key={item.label} style={{
              background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:'18px 20px',
            }}>
              <p style={{ color:'#94a3b8', fontSize:12, fontWeight:500, margin:'0 0 6px', letterSpacing:'0.02em' }}>{item.label}</p>
              <p style={{ color:'#1e293b', fontSize:22, fontWeight:700, margin:0 }}>{fmt(item.value)}</p>
              {pct && (
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:8 }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:3, background: good?'#dcfce7':'#fee2e2',
                    padding:'2px 8px', borderRadius:99,
                  }}>
                    {good ? <TrendingDown size={12} color="#16a34a"/> : <TrendingUp size={12} color="#dc2626"/>}
                    <span style={{ fontSize:11, fontWeight:600, color:good?'#16a34a':'#dc2626' }}>{pct}%</span>
                  </div>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>vs mês ant.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20, marginBottom:24 }}>
        <Card title="Evolução Mensal" subtitle={`${period} meses`}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={HISTORY.slice(-period)} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="rd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="m" tick={{ fontSize:12, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:13 }} />
              <Area type="monotone" dataKey="r" name="Receitas" stroke="#22c55e" strokeWidth={2} fill="url(#gr)" />
              <Area type="monotone" dataKey="d" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#rd)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Gastos por Categoria">
          {PIE_DATA.map((cat) => {
            const pct = cat.value / 2890 * 100;
            return (
              <div key={cat.name} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:13, color:'#475569' }}>{cat.name}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{fmt(cat.value)}</span>
                </div>
                <div style={{ background:'#f1f5f9', borderRadius:99, height:5, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, background:cat.color }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Bills */}
      <Card title="⏰ Contas a Vencer" subtitle="Próximos 30 dias">
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {BILLS.map((b, i) => (
            <div key={b.desc} style={{
              display:'flex', alignItems:'center', gap:16, padding:'12px 0',
              borderBottom: i < BILLS.length-1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <div style={{ width:36, height:36, background:'#fef3c7', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📋</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontWeight:500, color:'#1e293b', fontSize:14 }}>{b.desc}</p>
                <p style={{ margin:0, color:'#94a3b8', fontSize:12 }}>Vence em {b.due}</p>
              </div>
              <p style={{ margin:0, fontWeight:700, color:'#dc2626', fontSize:15 }}>{fmt(b.amount)}</p>
              <button style={{ background:'#22c55e', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:'#fff', fontSize:12, fontWeight:500 }}>
                <Check size={13}/> Pago
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────

function SettingsTab() {
  return (
    <div style={{ maxWidth:600 }}>
      <PageHeader title="Configurações" subtitle="Conta e preferências" />

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Card title="Perfil">
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[['Nome','Caio Pardim'],['E-mail','caio@email.com'],['WhatsApp','+55 11 99999-9999']].map(([label, val]) => (
              <div key={label}>
                <label style={{ fontSize:12, fontWeight:600, color:'#64748b', letterSpacing:'0.03em' }}>{label.toUpperCase()}</label>
                <input defaultValue={val} style={{
                  display:'block', width:'100%', marginTop:6, padding:'10px 14px', borderRadius:10,
                  border:'1.5px solid #e2e8f0', fontSize:14, color:'#1e293b', background:'#fff',
                  outline:'none', boxSizing:'border-box',
                }} />
              </div>
            ))}
            <button style={{
              alignSelf:'flex-start', display:'flex', alignItems:'center', gap:8,
              background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:10,
              padding:'10px 20px', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
            }}>
              <Check size={16}/> Salvar Alterações
            </button>
          </div>
        </Card>

        <Card title="Como usar pelo WhatsApp">
          <div style={{ background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius:12, padding:'16px 20px' }}>
            {['Salve o número do Finora na sua agenda','Envie: "Gastei R$ 50 no mercado"','Consultas: "Quanto gastei este mês?"','Resumo: "Me dê um resumo do dia"'].map((tip, i) => (
              <div key={i} style={{ display:'flex', gap:10, marginBottom: i<3?10:0 }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', background:'#22c55e',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0,
                }}>{i+1}</div>
                <p style={{ margin:0, fontSize:14, color:'#166534' }}>{tip}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, background:'#f8fafc', borderRadius:10, padding:'12px 16px' }}>
            <p style={{ margin:'0 0 6px', fontSize:12, fontWeight:600, color:'#64748b' }}>EXEMPLOS DE MENSAGENS</p>
            {['"Gastei 45 no mercado"','"Recebi 3500 de salário"','"Quanto gastei este mês?"'].map((ex) => (
              <p key={ex} style={{ margin:'4px 0 0', fontSize:13, color:'#1e293b', fontFamily:'monospace', background:'#e2e8f0', display:'inline-block', padding:'2px 8px', borderRadius:6, marginRight:6 }}>{ex}</p>
            ))}
          </div>
        </Card>

        <Card title="Segurança">
          <button style={{ fontSize:14, color:'#6366f1', background:'none', border:'none', cursor:'pointer', fontWeight:500, textDecoration:'underline' }}>
            Redefinir senha por e-mail
          </button>
        </Card>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────

function PageHeader({ title, subtitle, action }: { title:string; subtitle?:string; action?:React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'#0f172a', margin:'0 0 2px' }}>{title}</h1>
        {subtitle && <p style={{ color:'#94a3b8', fontSize:14, margin:0 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ActionBtn({ icon, label }: { icon:React.ReactNode; label:string }) {
  return (
    <button style={{
      display:'flex', alignItems:'center', gap:8,
      background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:11,
      padding:'10px 18px', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
      boxShadow:'0 4px 14px rgba(34,197,94,0.35)',
    }}>
      {icon} {label}
    </button>
  );
}

function LinkBtn({ label }: { label:string }) {
  return (
    <button style={{ background:'none', border:'none', color:'#22c55e', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
      {label} <ArrowUpRight size={14}/>
    </button>
  );
}

function Card({ title, subtitle, action, children }: { title?:string; subtitle?:string; action?:React.ReactNode; children:React.ReactNode }) {
  return (
    <div style={{
      background:'#fff', borderRadius:16, border:'1px solid #e2e8f0',
      boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden', marginBottom:20,
    }}>
      {title && (
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid #f1f5f9',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
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

function StatCard({ title, value, icon, subtitle, trend, accentColor, invertTrend }:
  { title:string; value:string; icon:string; subtitle?:string; trend?:number; accentColor:string; invertTrend?:boolean }) {
  const isPositive = trend != null && (invertTrend ? trend < 0 : trend > 0);
  const pct = trend != null ? Math.abs(trend / (Math.abs(trend) * 12) * 100).toFixed(0) : null;
  return (
    <div style={{
      background:'#fff', borderRadius:16, border:'1px solid #e2e8f0',
      boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:'20px',
      borderTop:`3px solid ${accentColor}`,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#94a3b8', letterSpacing:'0.03em' }}>{title.toUpperCase()}</p>
        <div style={{
          width:36, height:36, borderRadius:10, background:accentColor+'18',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
        }}>{icon}</div>
      </div>
      <p style={{ margin:'0 0 4px', fontSize:24, fontWeight:700, color:'#0f172a' }}>{value}</p>
      {subtitle && <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>{subtitle}</p>}
      {trend != null && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:99,
            background: isPositive?'#dcfce7':'#fee2e2',
          }}>
            {isPositive ? <ArrowUpRight size={12} color="#16a34a"/> : <ArrowDownRight size={12} color="#dc2626"/>}
            <span style={{ fontSize:11, fontWeight:600, color:isPositive?'#16a34a':'#dc2626' }}>8%</span>
          </div>
          <span style={{ fontSize:11, color:'#94a3b8' }}>vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

function TxTable({ txs }: { txs: typeof TRANSACTIONS }) {
  return (
    <div>
      {txs.map((tx, i) => (
        <div key={tx.id} style={{
          display:'flex', alignItems:'center', gap:14, padding:'11px 0',
          borderBottom: i < txs.length-1 ? '1px solid #f8fafc' : 'none',
        }}>
          <div style={{
            width:40, height:40, borderRadius:12, background:tx.color+'18',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0,
          }}>{tx.icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:'0 0 2px', fontWeight:500, fontSize:14, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {tx.description}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{tx.cat}</span>
              <span style={{ fontSize:11, color:'#cbd5e1' }}>·</span>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{tx.date}</span>
              {tx.src === 'whatsapp' && (
                <span style={{
                  fontSize:10, background:'#dcfce7', color:'#15803d', fontWeight:600,
                  padding:'1px 6px', borderRadius:99,
                }}>💬 WhatsApp</span>
              )}
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:15, color: tx.type==='income'?'#16a34a':'#dc2626' }}>
              {tx.type==='income'?'+':'-'} {fmt(tx.amount)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterInput({ placeholder, type }: { placeholder:string; type:string }) {
  return (
    <input type={type} placeholder={placeholder} style={{
      padding:'7px 12px', borderRadius:8, border:'1.5px solid #e2e8f0',
      fontSize:13, color:'#475569', background:'#f8fafc', outline:'none',
    }} />
  );
}

function IconBtn({ children, color, bg }: { children:React.ReactNode; color:string; bg:string }) {
  return (
    <button style={{
      width:30, height:30, borderRadius:8, border:'none', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      background:bg, color,
    }}>{children}</button>
  );
}
