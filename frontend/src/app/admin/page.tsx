'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/theme-context';
import { Search, Trash2, Shield, User, ChevronDown, ChevronUp, RefreshCw, X, Check, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
dayjs.extend(relativeTime);
dayjs.locale('pt-br');

async function adminFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
}

export default function AdminPage() {
  const { c } = useTheme();
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [detail, setDetail]       = useState<Record<string, any>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [toast, setToast]         = useState('');

  async function load() {
    setLoading(true);
    const res = await adminFetch('/api/admin/users');
    if (!res.ok) { setLoading(false); return; }
    const { users: u } = await res.json();
    setUsers(u || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadDetail(userId: string) {
    if (detail[userId]) { setExpanded(userId); return; }
    setLoadingDetail(userId);
    const res = await adminFetch(`/api/admin/users/${userId}`);
    if (res.ok) {
      const d = await res.json();
      setDetail(prev => ({ ...prev, [userId]: d }));
    }
    setLoadingDetail(null);
    setExpanded(userId);
  }

  function toggleExpand(userId: string) {
    if (expanded === userId) { setExpanded(null); return; }
    loadDetail(userId);
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const res = await adminFetch(`/api/admin/users?id=${confirmDelete.id}`, { method: 'DELETE' });
    const body = await res.json();
    if (!res.ok) { showToast('❌ Erro: ' + body.error); setDeleting(false); return; }
    showToast(`✅ Usuário ${confirmDelete.email} removido`);
    setConfirmDelete(null);
    setDeleting(false);
    load();
  }

  async function toggleRole(user: any) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setRoleLoading(user.id);
    const res = await adminFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ id: user.id, role: newRole }) });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      showToast(`✅ ${user.email} agora é ${newRole === 'admin' ? 'Administrador' : 'Usuário'}`);
    }
    setRoleLoading(null);
  }

  const filtered = users.filter(u =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers    = users.length;
  const activeToday   = users.filter(u => u.last_sign_in_at && dayjs(u.last_sign_in_at).isAfter(dayjs().subtract(1, 'day'))).length;
  const totalTx       = users.reduce((s, u) => s + u.transactions, 0);
  const adminCount    = users.filter(u => u.role === 'admin').length;

  const inputStyle: React.CSSProperties = { padding:'10px 14px', borderRadius:10, border:`1.5px solid ${c.border}`, fontSize:14, color:c.text, background:c.input, outline:'none', boxSizing:'border-box' as const };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: c.text, margin: '0 0 4px' }}>Gerenciar Usuários</h1>
        <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Visualize, promova e remova contas do Finora</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total de usuários', value: totalUsers, icon: '👥', color: '#6366f1' },
          { label: 'Ativos hoje',       value: activeToday, icon: '🟢', color: '#22c55e' },
          { label: 'Transações total',  value: totalTx,    icon: '💸', color: '#f97316' },
          { label: 'Administradores',   value: adminCount, icon: '🛡️',  color: '#3b82f6' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '16px 20px', borderTop: `3px solid ${kpi.color}` }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.icon} {kpi.label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: c.text }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search + refresh */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.textFaint, pointerEvents: 'none' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por email ou nome..." style={{ ...inputStyle, width: '100%', paddingLeft: 38 }}/>
        </div>
        <button onClick={load} style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: c.textMuted, fontSize: 13, fontWeight: 500 }}>
          <RefreshCw size={14}/> Atualizar
        </button>
      </div>

      {/* Table */}
      <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 120px 90px', padding: '12px 20px', borderBottom: `1px solid ${c.border}`, background: c.inputBg }}>
          {['Usuário', 'Último acesso', 'Transações', 'Faturas', 'Role', 'Ações'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: 48, color: c.textFaint }}>Carregando usuários...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 48, color: c.textFaint }}>Nenhum usuário encontrado</p>
        ) : filtered.map((user, i) => {
          const isExpanded = expanded === user.id;
          const d = detail[user.id];
          const isLoadingThis = loadingDetail === user.id;

          return (
            <div key={user.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${c.borderLight}` : 'none' }}>
              {/* Main row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 120px 90px', padding: '14px 20px', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleExpand(user.id)}>
                {/* User info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: user.avatar_url ? 'transparent' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                    {user.avatar_url ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/> : (user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name || '—'}
                      {!user.confirmed && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#fef9c3', color: '#854d0e' }}>não confirmado</span>}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: c.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  </div>
                </div>

                {/* Last sign in */}
                <span style={{ fontSize: 12, color: c.textFaint }}>
                  {user.last_sign_in_at ? dayjs(user.last_sign_in_at).fromNow() : 'Nunca'}
                </span>

                {/* Transactions */}
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{user.transactions}</span>

                {/* Bills */}
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{user.bills}</span>

                {/* Role badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: user.role === 'admin' ? '#eff6ff' : c.inputBg, color: user.role === 'admin' ? '#3b82f6' : c.textMuted }}>
                    {user.role === 'admin' ? '🛡️ Admin' : '👤 Usuário'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleExpand(user.id)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: c.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textMuted }}>
                    {isLoadingThis ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }}/> : isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
                  <button onClick={() => setConfirmDelete(user)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} color="#ef4444"/>
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && d && (
                <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${c.borderLight}`, background: c.inputBg }}>
                  <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

                    {/* Monthly stats */}
                    <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}` }}>
                      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>📊 Este mês</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div><p style={{ margin:'0 0 2px', fontSize:11, color:c.textFaint }}>Receitas</p><p style={{ margin:0, fontWeight:700, color:'#22c55e', fontSize:15 }}>{formatCurrency(d.monthIncome)}</p></div>
                        <div><p style={{ margin:'0 0 2px', fontSize:11, color:c.textFaint }}>Despesas</p><p style={{ margin:0, fontWeight:700, color:'#ef4444', fontSize:15 }}>{formatCurrency(d.monthExpense)}</p></div>
                      </div>
                    </div>

                    {/* Wallets */}
                    <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}` }}>
                      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>🏦 Contas ({d.wallets.length})</p>
                      {d.wallets.length === 0 ? <p style={{ margin:0, fontSize:12, color:c.textFaint }}>Nenhuma conta</p> :
                        d.wallets.slice(0,3).map((w: any) => <p key={w.name} style={{ margin:'0 0 4px', fontSize:13, color:c.textSecondary }}>{w.icon} {w.name}</p>)}
                    </div>

                    {/* Goals */}
                    <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}` }}>
                      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>🎯 Metas ({d.goals.length})</p>
                      {d.goals.length === 0 ? <p style={{ margin:0, fontSize:12, color:c.textFaint }}>Sem metas</p> :
                        d.goals.slice(0,3).map((g: any) => (
                          <div key={g.name} style={{ marginBottom:6 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:12, color:c.textSecondary }}>{g.name}</span>
                              <span style={{ fontSize:11, color:c.textFaint }}>{Math.round(Number(g.current_amount)/Number(g.target_amount)*100)}%</span>
                            </div>
                            <div style={{ background:c.inputBg, borderRadius:99, height:4 }}>
                              <div style={{ height:'100%', borderRadius:99, width:`${Math.min(Number(g.current_amount)/Number(g.target_amount)*100,100)}%`, background:'#22c55e' }}/>
                            </div>
                          </div>
                        ))}
                    </div>

                  </div>

                  {/* Recent transactions */}
                  {d.recentTransactions.length > 0 && (
                    <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}`, marginTop: 14 }}>
                      <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>💸 Últimas transações</p>
                      {d.recentTransactions.slice(0, 5).map((t: any, i: number) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:8, marginBottom:8, borderBottom:i<4?`1px solid ${c.borderLight}`:'none' }}>
                          <span style={{ fontSize:16 }}>{t.type==='income'?'💰':'💸'}</span>
                          <div style={{ flex:1 }}>
                            <p style={{ margin:0, fontSize:13, color:c.textSecondary }}>{t.description}</p>
                            <p style={{ margin:0, fontSize:11, color:c.textFaint }}>{t.date} · {(t.categories as any)?.name || 'Sem categoria'}</p>
                          </div>
                          <span style={{ fontWeight:700, fontSize:13, color:t.type==='income'?'#22c55e':'#ef4444' }}>
                            {t.type==='income'?'+':'-'}{formatCurrency(Number(t.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Role toggle */}
                  <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                    <button onClick={() => toggleRole(user)} disabled={!!roleLoading} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:`1.5px solid ${user.role==='admin'?'#ef4444':'#3b82f6'}`, background:'transparent', color:user.role==='admin'?'#ef4444':'#3b82f6', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      {roleLoading === user.id ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> : user.role === 'admin' ? <><User size={14}/>Remover admin</> : <><Shield size={14}/>Tornar admin</>}
                    </button>
                    <button onClick={() => setConfirmDelete(user)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      <Trash2 size={14}/> Excluir conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }}>
          <div style={{ background:c.surface, borderRadius:20, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', border:`1px solid ${c.border}`, padding:28 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <AlertTriangle size={24} color="#dc2626"/>
            </div>
            <h2 style={{ textAlign:'center', margin:'0 0 8px', fontSize:18, fontWeight:700, color:c.text }}>Excluir usuário?</h2>
            <p style={{ textAlign:'center', margin:'0 0 8px', fontSize:14, color:c.textMuted }}>
              <strong style={{ color:c.text }}>{confirmDelete.email}</strong>
            </p>
            <p style={{ textAlign:'center', margin:'0 0 24px', fontSize:13, color:'#dc2626' }}>
              ⚠️ Todos os dados deste usuário serão permanentemente removidos.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} style={{ flex:1, padding:'12px', borderRadius:12, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:14, fontWeight:500, cursor:'pointer' }}>Cancelar</button>
              <button onClick={doDelete} disabled={deleting} style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:deleting?'#94a3b8':'#dc2626', color:'#fff', fontSize:14, fontWeight:700, cursor:deleting?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {deleting ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/>Excluindo...</> : <><Trash2 size={14}/>Excluir</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:c.surface, border:`1px solid ${c.border}`, borderRadius:12, padding:'12px 20px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', fontSize:14, fontWeight:500, color:c.text, zIndex:400 }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
