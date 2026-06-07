'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/theme-context';
import {
  Search, Trash2, Shield, User, ChevronDown, ChevronUp,
  RefreshCw, X, Check, AlertTriangle, Download, Ban,
  Send, Bell, Wrench, BarChart2, Users, TrendingUp,
  Mail, Pencil, UserCheck,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
dayjs.extend(relativeTime);
dayjs.locale('pt-br');

async function adminFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, ...(opts.headers || {}) },
  });
}

type Tab = 'overview' | 'users' | 'broadcast' | 'maintenance';

export default function AdminPage() {
  const { c, isDark } = useTheme();
  const [tab, setTab]           = useState<Tab>('overview');
  const [users, setUsers]       = useState<any[]>([]);
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'blocked'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail]     = useState<Record<string, any>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast]       = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const [apiError, setApiError] = useState('');

  // Broadcast
  const [broadcastMsg, setBroadcastMsg]   = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);
  const [broadcastSaving, setBroadcastSaving] = useState(false);

  // Maintenance
  const [maintenanceOn, setMaintenanceOn]   = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('Sistema em manutenção. Voltamos em breve!');
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  // Email
  const [emailTarget, setEmailTarget]   = useState('');
  const [emailType, setEmailType]       = useState('reset_password');
  const [emailSending, setEmailSending] = useState(false);

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadAll() {
    setLoading(true);
    setApiError('');
    try {
      const [usersRes, statsRes, broadcastRes, maintenanceRes] = await Promise.all([
        adminFetch('/api/admin/users').then(r => r.json()),
        adminFetch('/api/admin/stats').then(r => r.json()),
        adminFetch('/api/admin/broadcast').then(r => r.json()),
        adminFetch('/api/admin/maintenance').then(r => r.json()),
      ]);

      if (usersRes.error)  { setApiError('Erro na API: ' + usersRes.error); setLoading(false); return; }
      if (statsRes.error)  { setApiError('Erro em stats: ' + statsRes.error); setLoading(false); return; }

      setUsers(usersRes.users || []);
      setStats(statsRes);
      setActiveBroadcast(broadcastRes.broadcast);
      if (broadcastRes.broadcast) { setBroadcastMsg(broadcastRes.broadcast.message); setBroadcastType(broadcastRes.broadcast.type); }
      if (maintenanceRes.maintenance) { setMaintenanceOn(true); setMaintenanceMsg(maintenanceRes.maintenance.message); }
    } catch (err: any) {
      setApiError('Falha ao conectar com a API: ' + (err?.message || String(err)));
    }
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  async function loadDetail(userId: string) {
    if (detail[userId]) { setExpanded(userId); return; }
    setLoadingDetail(userId);
    const res = await adminFetch(`/api/admin/users/${userId}`);
    if (res.ok) { const d = await res.json(); setDetail(prev => ({ ...prev, [userId]: d })); }
    setLoadingDetail(null);
    setExpanded(userId);
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const res = await adminFetch(`/api/admin/users?id=${confirmDelete.id}`, { method: 'DELETE' });
    const body = await res.json();
    if (!res.ok) { showToast('Erro: ' + body.error, 'err'); setDeleting(false); return; }
    showToast(`✅ ${confirmDelete.email} removido`);
    setConfirmDelete(null); setDeleting(false);
    loadAll();
  }

  async function toggleRole(user: any) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await adminFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ id: user.id, role: newRole }) });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    showToast(`✅ ${user.email} → ${newRole === 'admin' ? 'Admin' : 'Usuário'}`);
  }

  async function toggleBlock(user: any) {
    const blocked = !user.blocked;
    await adminFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ id: user.id, blocked }) });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, blocked } : u));
    showToast(blocked ? `🔒 ${user.email} bloqueado` : `✅ ${user.email} desbloqueado`);
  }

  async function saveEditName() {
    if (!editingUser) return;
    await adminFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ id: editingUser.id, name: editName }) });
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editName } : u));
    showToast('✅ Nome atualizado');
    setEditingUser(null);
  }

  async function sendEmail() {
    if (!emailTarget) return;
    setEmailSending(true);
    const res = await adminFetch('/api/admin/email', { method: 'POST', body: JSON.stringify({ email: emailTarget, type: emailType }) });
    const body = await res.json();
    if (!res.ok) showToast('Erro: ' + body.error, 'err');
    else showToast('✅ ' + body.message);
    setEmailSending(false);
  }

  async function saveBroadcast() {
    setBroadcastSaving(true);
    await adminFetch('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ message: broadcastMsg, type: broadcastType }) });
    setActiveBroadcast(broadcastMsg ? { message: broadcastMsg, type: broadcastType } : null);
    showToast(broadcastMsg ? '✅ Aviso publicado para todos os usuários' : '✅ Aviso removido');
    setBroadcastSaving(false);
  }

  async function saveMaintenance() {
    setMaintenanceSaving(true);
    await adminFetch('/api/admin/maintenance', { method: 'POST', body: JSON.stringify({ enabled: maintenanceOn, message: maintenanceMsg }) });
    showToast(maintenanceOn ? '🔧 Modo manutenção ativado' : '✅ Manutenção desativada');
    setMaintenanceSaving(false);
  }

  function exportCSV() {
    const headers = ['Email', 'Nome', 'Role', 'Transações', 'Faturas', 'Último acesso', 'Cadastro'];
    const rows = users.map(u => [
      u.email, u.name || '', u.role,
      u.transactions, u.bills,
      u.last_sign_in_at ? dayjs(u.last_sign_in_at).format('DD/MM/YYYY HH:mm') : 'Nunca',
      dayjs(u.created_at).format('DD/MM/YYYY'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `finora-users-${dayjs().format('YYYY-MM-DD')}.csv`; a.click();
  }

  const filtered = users.filter(u => {
    const matchSearch = (u.email || '').toLowerCase().includes(search.toLowerCase()) || (u.name || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' ? true : roleFilter === 'blocked' ? u.blocked : u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const inputStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${c.border}`, fontSize: 14, color: c.text, background: c.input, outline: 'none', boxSizing: 'border-box' as const };
  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',    label: 'Visão Geral',  icon: BarChart2 },
    { id: 'users',       label: 'Usuários',     icon: Users },
    { id: 'broadcast',   label: 'Avisos',       icon: Bell },
    { id: 'maintenance', label: 'Manutenção',   icon: Wrench },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: c.text, margin: '0 0 4px' }}>Painel Administrativo</h1>
        <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Gerencie usuários, envie avisos e controle o sistema</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: c.inputBg, borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', background: active ? c.surface : 'transparent', color: active ? c.text : c.textFaint, fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', boxShadow: active ? c.shadow : 'none', transition: 'all 0.15s' }}>
              <Icon size={15}/>{t.label}
            </button>
          );
        })}
      </div>

      {apiError ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '24px 28px', maxWidth: 600 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 15, color: '#dc2626' }}>❌ Erro ao carregar o painel</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#ef4444', fontFamily: 'monospace' }}>{apiError}</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#7f1d1d' }}>
            Verifique se a variável <code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>SUPABASE_SERVICE_KEY</code> está configurada nas variáveis de ambiente da Vercel.
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#991b1b' }}>
            Vercel → projeto → Settings → Environment Variables → adicione <strong>SUPABASE_SERVICE_KEY</strong> com a service role key do Supabase (Project Settings → API → service_role).
          </p>
          <button onClick={loadAll} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <RefreshCw size={14}/> Tentar novamente
          </button>
        </div>
      ) : loading ? <p style={{ textAlign: 'center', padding: 80, color: c.textFaint }}>Carregando...</p> : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
                {[
                  { label: 'Usuários', value: stats.totalUsers, icon: '👥', color: '#6366f1' },
                  { label: 'Ativos 7 dias', value: stats.activeWeek, icon: '🟢', color: '#22c55e' },
                  { label: 'Transações', value: stats.totalTx.toLocaleString('pt-BR'), icon: '💸', color: '#f97316' },
                  { label: 'Receitas totais', value: formatCurrency(stats.totalIncome), icon: '📈', color: '#22c55e' },
                  { label: 'Despesas totais', value: formatCurrency(stats.totalExpense), icon: '📉', color: '#ef4444' },
                  { label: 'Saldo geral', value: formatCurrency(stats.totalIncome - stats.totalExpense), icon: '💰', color: stats.totalIncome >= stats.totalExpense ? '#22c55e' : '#ef4444' },
                ].map(k => (
                  <div key={k.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '16px 20px', borderTop: `3px solid ${k.color}` }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.icon} {k.label}</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: c.text }}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* New users chart */}
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 24 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: c.text }}>Novos Usuários — últimos 30 dias</p>
                <p style={{ margin: '0 0 20px', fontSize: 12, color: c.textFaint }}>Cadastros por dia</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.newUsersPerDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.borderLight}/>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: c.textFaint }} axisLine={false} tickLine={false} tickFormatter={d => dayjs(d).format('DD/MM')} interval={4}/>
                    <YAxis tick={{ fontSize: 10, fill: c.textFaint }} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, color: c.text, fontSize: 12 }} formatter={(v: any) => [v, 'Novos usuários']}/>
                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#gU)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Ranking */}
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 24 }}>
                <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 15, color: c.text }}>🏆 Usuários Mais Ativos</p>
                {stats.ranking.map((r: any, i: number) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < stats.ranking.length - 1 ? `1px solid ${c.borderLight}` : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#fef9c3' : i === 1 ? '#f1f5f9' : i === 2 ? '#fff7ed' : c.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: i === 0 ? '#ca8a04' : i === 1 ? '#64748b' : i === 2 ? '#c2410c' : c.textFaint }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.text }}>{r.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{r.count}</p>
                      <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>transações</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div>
              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.textFaint, pointerEvents: 'none' }}/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar email ou nome..." style={{ ...inputStyle, width: '100%', paddingLeft: 36 }}/>
                </div>
                {/* Role filter */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['all','admin','user','blocked'] as const).map(f => (
                    <button key={f} onClick={() => setRoleFilter(f)} style={{ padding: '9px 14px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: roleFilter === f ? c.text : c.inputBg, color: roleFilter === f ? c.surface : c.textMuted }}>
                      {f === 'all' ? 'Todos' : f === 'admin' ? '🛡️ Admin' : f === 'user' ? '👤 Usuário' : '🔒 Bloqueado'}
                    </button>
                  ))}
                </div>
                <button onClick={loadAll} style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${c.border}`, background: c.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: c.textMuted, fontSize: 13 }}>
                  <RefreshCw size={14}/>
                </button>
                <button onClick={exportCSV} style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${c.border}`, background: c.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: c.textMuted, fontSize: 13, fontWeight: 500 }}>
                  <Download size={14}/> Exportar CSV
                </button>
              </div>

              {/* Send email panel */}
              <div style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Enviar e-mail para usuário</label>
                  <input value={emailTarget} onChange={e => setEmailTarget(e.target.value)} placeholder="email@exemplo.com" style={{ ...inputStyle, width: '100%' }}/>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Tipo</label>
                  <select value={emailType} onChange={e => setEmailType(e.target.value)} style={inputStyle}>
                    <option value="reset_password">Redefinir senha</option>
                    <option value="magic_link">Magic link</option>
                  </select>
                </div>
                <button onClick={sendEmail} disabled={emailSending || !emailTarget} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                  {emailSending ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Mail size={14}/>}
                  Enviar
                </button>
              </div>

              {/* Table */}
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 90px 130px 100px', padding: '12px 20px', borderBottom: `1px solid ${c.border}`, background: c.inputBg }}>
                  {['Usuário', 'Último acesso', 'Transações', 'Faturas', 'Status', 'Ações'].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>

                {filtered.length === 0 ? <p style={{ textAlign: 'center', padding: 40, color: c.textFaint }}>Nenhum usuário</p> :
                  filtered.map((user, i) => {
                    const isExpanded = expanded === user.id;
                    const d = detail[user.id];
                    return (
                      <div key={user.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${c.borderLight}` : 'none', opacity: user.blocked ? 0.6 : 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 90px 130px 100px', padding: '14px 20px', alignItems: 'center', cursor: 'pointer' }} onClick={() => { if (expanded === user.id) setExpanded(null); else loadDetail(user.id); }}>

                          {/* User */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: user.avatar_url ? 'transparent' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                              {user.avatar_url ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/> : (user.name || user.email || 'U')[0].toUpperCase()}
                              {user.blocked && <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ban size={14} color="#fff"/></div>}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: '0 0 1px', fontWeight: 600, fontSize: 13, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || '—'}</p>
                              <p style={{ margin: 0, fontSize: 11, color: c.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                            </div>
                          </div>

                          <span style={{ fontSize: 12, color: c.textFaint }}>{user.last_sign_in_at ? dayjs(user.last_sign_in_at).fromNow() : 'Nunca'}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{user.transactions}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{user.bills}</span>

                          {/* Status */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {user.blocked
                              ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>🔒 Bloqueado</span>
                              : user.role === 'admin'
                                ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#eff6ff', color: '#3b82f6', fontWeight: 700 }}>🛡️ Admin</span>
                                : <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: c.inputBg, color: c.textMuted, fontWeight: 600 }}>👤 Usuário</span>}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditingUser(user); setEditName(user.name || ''); }} title="Editar nome" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={11} color="#3b82f6"/></button>
                            <button onClick={() => toggleBlock(user)} title={user.blocked ? 'Desbloquear' : 'Bloquear'} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: user.blocked ? '#f0fdf4' : '#fff7ed', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {user.blocked ? <UserCheck size={11} color="#16a34a"/> : <Ban size={11} color="#f97316"/>}
                            </button>
                            <button onClick={() => setConfirmDelete(user)} title="Excluir" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={11} color="#ef4444"/></button>
                            <button onClick={() => { if (expanded === user.id) setExpanded(null); else loadDetail(user.id); }} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: c.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textMuted }}>
                              {loadingDetail === user.id ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }}/> : isExpanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                            </button>
                          </div>
                        </div>

                        {/* Expanded */}
                        {isExpanded && d && (
                          <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${c.borderLight}`, background: c.inputBg }}>
                            <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                              <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}` }}>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>📊 Este mês</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <div><p style={{ margin: '0 0 1px', fontSize: 10, color: c.textFaint }}>Receitas</p><p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{formatCurrency(d.monthIncome)}</p></div>
                                  <div><p style={{ margin: '0 0 1px', fontSize: 10, color: c.textFaint }}>Despesas</p><p style={{ margin: 0, fontWeight: 700, color: '#ef4444', fontSize: 14 }}>{formatCurrency(d.monthExpense)}</p></div>
                                </div>
                              </div>
                              <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}` }}>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>🏦 Contas ({d.wallets.length})</p>
                                {d.wallets.slice(0, 3).map((w: any) => <p key={w.name} style={{ margin: '0 0 3px', fontSize: 12, color: c.textSecondary }}>{w.icon} {w.name}</p>)}
                                {!d.wallets.length && <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>Nenhuma</p>}
                              </div>
                              <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}` }}>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>🎯 Metas ({d.goals.length})</p>
                                {d.goals.slice(0, 3).map((g: any) => <p key={g.name} style={{ margin: '0 0 3px', fontSize: 12, color: c.textSecondary }}>{g.name}</p>)}
                                {!d.goals.length && <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>Nenhuma</p>}
                              </div>
                              <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}` }}>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>⏱ Histórico</p>
                                <p style={{ margin: '0 0 3px', fontSize: 12, color: c.textSecondary }}>Cadastro: {dayjs(user.created_at).format('DD/MM/YYYY')}</p>
                                <p style={{ margin: '0 0 3px', fontSize: 12, color: c.textSecondary }}>Último login: {user.last_sign_in_at ? dayjs(user.last_sign_in_at).format('DD/MM/YYYY HH:mm') : 'Nunca'}</p>
                                <p style={{ margin: 0, fontSize: 12, color: user.confirmed ? '#22c55e' : '#f97316' }}>{user.confirmed ? '✅ E-mail confirmado' : '⏳ E-mail pendente'}</p>
                              </div>
                            </div>

                            {d.recentTransactions?.length > 0 && (
                              <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.border}`, marginTop: 12 }}>
                                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase' }}>💸 Últimas transações</p>
                                {d.recentTransactions.slice(0, 5).map((t: any, ti: number) => (
                                  <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: ti < 4 ? `1px solid ${c.borderLight}` : 'none' }}>
                                    <span>{t.type === 'income' ? '💰' : '💸'}</span>
                                    <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 12, color: c.textSecondary }}>{t.description}</p><p style={{ margin: 0, fontSize: 10, color: c.textFaint }}>{t.date}</p></div>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>{t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                              <button onClick={() => toggleRole(user)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${user.role === 'admin' ? '#ef4444' : '#3b82f6'}`, background: 'transparent', color: user.role === 'admin' ? '#ef4444' : '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                {user.role === 'admin' ? <><User size={13}/>Remover admin</> : <><Shield size={13}/>Tornar admin</>}
                              </button>
                              <button onClick={() => toggleBlock(user)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${user.blocked ? '#22c55e' : '#f97316'}`, background: 'transparent', color: user.blocked ? '#22c55e' : '#f97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                {user.blocked ? <><UserCheck size={13}/>Desbloquear</> : <><Ban size={13}/>Bloquear</>}
                              </button>
                              <button onClick={() => { setEmailTarget(user.email); setTab('users'); }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                <Mail size={13}/>Enviar e-mail
                              </button>
                              <button onClick={() => setConfirmDelete(user)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                <Trash2 size={13}/>Excluir conta
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── BROADCAST ── */}
          {tab === 'broadcast' && (
            <div style={{ maxWidth: 680 }}>
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 28 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: c.text }}>📢 Aviso Global</h2>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: c.textFaint }}>Aparece para todos os usuários logados como um banner no topo do dashboard.</p>

                {activeBroadcast && (
                  <div style={{ background: activeBroadcast.type === 'warning' ? '#fffbeb' : activeBroadcast.type === 'error' ? '#fef2f2' : '#eff6ff', border: `1px solid ${activeBroadcast.type === 'warning' ? '#fde68a' : activeBroadcast.type === 'error' ? '#fecaca' : '#bfdbfe'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: c.text }}>{activeBroadcast.type === 'warning' ? '⚠️' : activeBroadcast.type === 'error' ? '🚨' : 'ℹ️'} {activeBroadcast.message}</span>
                    <button onClick={() => { setBroadcastMsg(''); saveBroadcast(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint }}><X size={16}/></button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Tipo do aviso</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 'info', l: 'ℹ️ Info', bg: '#eff6ff', color: '#3b82f6' }, { v: 'warning', l: '⚠️ Aviso', bg: '#fffbeb', color: '#d97706' }, { v: 'error', l: '🚨 Urgente', bg: '#fef2f2', color: '#dc2626' }].map(t => (
                        <button key={t.v} onClick={() => setBroadcastType(t.v)} style={{ padding: '8px 16px', borderRadius: 9, border: `2px solid ${broadcastType === t.v ? t.color : c.border}`, background: broadcastType === t.v ? t.bg : c.surface, color: broadcastType === t.v ? t.color : c.textMuted, fontSize: 13, fontWeight: broadcastType === t.v ? 700 : 400, cursor: 'pointer' }}>
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Mensagem</label>
                    <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Ex: Realizaremos manutenção às 22h hoje..." rows={3} style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}/>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setBroadcastMsg(''); saveBroadcast(); }} style={{ padding: '11px 20px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Limpar aviso</button>
                    <button onClick={saveBroadcast} disabled={broadcastSaving} style={{ flex: 1, padding: '11px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {broadcastSaving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }}/> : <Send size={15}/>}
                      Publicar para todos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MAINTENANCE ── */}
          {tab === 'maintenance' && (
            <div style={{ maxWidth: 680 }}>
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 28 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: c.text }}>🔧 Banner de Manutenção</h2>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: c.textFaint }}>Quando ativado, aparece um banner vermelho de manutenção para todos os usuários.</p>

                {/* Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 12, border: `2px solid ${maintenanceOn ? '#ef4444' : c.border}`, background: maintenanceOn ? '#fef2f2' : c.inputBg, marginBottom: 20 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: maintenanceOn ? '#dc2626' : c.text }}>
                      {maintenanceOn ? '🔴 Manutenção ATIVA' : '🟢 Sistema normal'}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: maintenanceOn ? '#ef4444' : c.textFaint }}>
                      {maintenanceOn ? 'Banner vermelho visível para todos os usuários' : 'Nenhum banner de manutenção exibido'}
                    </p>
                  </div>
                  <button onClick={() => setMaintenanceOn(v => !v)} style={{ width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: maintenanceOn ? '#ef4444' : c.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 4, left: maintenanceOn ? 28 : 4, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}/>
                  </button>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Mensagem de manutenção</label>
                  <textarea value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)} rows={2} style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}/>
                </div>

                <button onClick={saveMaintenance} disabled={maintenanceSaving} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: maintenanceOn ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {maintenanceSaving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }}/> : <Wrench size={15}/>}
                  {maintenanceOn ? 'Ativar banner de manutenção' : 'Desativar manutenção'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit name modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
          <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 380, padding: 28, border: `1px solid ${c.border}` }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: c.text }}>Editar nome</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: c.textFaint }}>{editingUser.email}</p>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome do usuário" style={{ ...inputStyle, width: '100%', marginBottom: 16 }} autoFocus onKeyDown={e => e.key === 'Enter' && saveEditName()}/>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveEditName} style={{ flex: 1, padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={15}/>Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
          <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${c.border}`, padding: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} color="#dc2626"/>
            </div>
            <h2 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: c.text }}>Excluir usuário?</h2>
            <p style={{ textAlign: 'center', margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: c.text }}>{confirmDelete.email}</p>
            <p style={{ textAlign: 'center', margin: '0 0 24px', fontSize: 13, color: '#dc2626' }}>⚠️ Todos os dados serão permanentemente removidos.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={doDelete} disabled={deleting} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Trash2 size={14}/>}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toastType === 'err' ? '#fef2f2' : c.surface, border: `1px solid ${toastType === 'err' ? '#fecaca' : c.border}`, borderRadius: 12, padding: '12px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 14, fontWeight: 500, color: toastType === 'err' ? '#dc2626' : c.text, zIndex: 400 }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
