'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/theme-context';
import {
  Search, Trash2, Shield, User, ChevronDown, ChevronUp,
  RefreshCw, X, Check, AlertTriangle, Download, Ban,
  Send, Bell, Wrench, BarChart2, Users, TrendingUp,
  Mail, Pencil, UserCheck, CreditCard, DollarSign, Clock, XCircle, CheckCircle, Tag,
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

type Tab = 'overview' | 'revenue' | 'users' | 'broadcast' | 'maintenance' | 'pricing';

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
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', phone: '', role: 'user', send_invite: false });
  const [creating, setCreating] = useState(false);
  const [toast, setToast]       = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const [apiError, setApiError] = useState('');

  // Broadcast
  const [broadcastMsg, setBroadcastMsg]   = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);
  const [broadcastSaving, setBroadcastSaving] = useState(false);
  const [broadcastWa, setBroadcastWa]         = useState(false);

  // Maintenance
  const [maintenanceOn, setMaintenanceOn]   = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('Sistema em manutenção. Voltamos em breve!');
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  // Pricing
  const [priceMonthly, setPriceMonthly] = useState('29');
  const [priceAnnual, setPriceAnnual]   = useState('199');
  const [priceSaving, setPriceSaving]   = useState(false);

  // Email
  const [emailTarget, setEmailTarget]   = useState('');
  const [emailType, setEmailType]       = useState('reset_password');
  const [emailSending, setEmailSending] = useState(false);

  // Revenue / invoice
  const [invoiceEmail, setInvoiceEmail]   = useState('');
  const [invoicePlan, setInvoicePlan]     = useState<'monthly' | 'annual'>('monthly');
  const [invoiceSending, setInvoiceSending] = useState(false);

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

      // Load pricing
      const settingsRes = await adminFetch('/api/admin/settings').then(r => r.json());
      if (settingsRes.price_monthly) setPriceMonthly(settingsRes.price_monthly);
      if (settingsRes.price_annual)  setPriceAnnual(settingsRes.price_annual);
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

  async function doCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await adminFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(createForm),
    });
    const body = await res.json();
    if (!res.ok) { showToast('Erro: ' + body.error, 'err'); setCreating(false); return; }
    showToast(`✅ Usuário ${createForm.email} criado!`);
    setShowCreate(false);
    setCreateForm({ email: '', password: '', name: '', phone: '', role: 'user', send_invite: false });
    setCreating(false);
    loadAll();
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
    await adminFetch('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ message: broadcastMsg, type: broadcastType, send_whatsapp: broadcastWa }) });
    setActiveBroadcast(broadcastMsg ? { message: broadcastMsg, type: broadcastType } : null);
    showToast(broadcastMsg ? (broadcastWa ? '✅ Aviso publicado + WhatsApp enviado!' : '✅ Aviso publicado para todos os usuários') : '✅ Aviso removido');
    setBroadcastSaving(false);
  }

  async function savePricing() {
    setPriceSaving(true);
    await Promise.all([
      adminFetch('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'price_monthly', value: priceMonthly }) }),
      adminFetch('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'price_annual',  value: priceAnnual  }) }),
    ]);
    showToast('✅ Preços atualizados! Refletem na landing page e checkout em instantes.');
    setPriceSaving(false);
  }

  async function saveMaintenance() {
    setMaintenanceSaving(true);
    await adminFetch('/api/admin/maintenance', { method: 'POST', body: JSON.stringify({ enabled: maintenanceOn, message: maintenanceMsg }) });
    showToast(maintenanceOn ? '🔧 Modo manutenção ativado' : '✅ Manutenção desativada');
    setMaintenanceSaving(false);
  }

  async function sendInvoiceLink() {
    if (!invoiceEmail) return;
    setInvoiceSending(true);
    // Find user by email
    const target = users.find(u => u.email === invoiceEmail);
    if (!target) { showToast('Usuário não encontrado', 'err'); setInvoiceSending(false); return; }
    // Activate plan directly for now (admin-granted) and send magic link
    await adminFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ id: target.id, plan_status: 'active', plan_type: invoicePlan }) });
    setUsers(prev => prev.map(u => u.id === target.id ? { ...u, plan_status: 'active', plan_type: invoicePlan } : u));
    // Send magic link so user can log in to see their plan
    await adminFetch('/api/admin/email', { method: 'POST', body: JSON.stringify({ email: invoiceEmail, type: 'magic_link' }) });
    showToast(`✅ Plano ${invoicePlan === 'monthly' ? 'Mensal' : 'Anual'} ativado e link enviado para ${invoiceEmail}`);
    setInvoiceEmail('');
    setInvoiceSending(false);
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
    { id: 'revenue',     label: 'Receita',      icon: DollarSign },
    { id: 'users',       label: 'Usuários',     icon: Users },
    { id: 'broadcast',   label: 'Avisos',       icon: Bell },
    { id: 'maintenance', label: 'Manutenção',   icon: Wrench },
    { id: 'pricing',     label: 'Preços',       icon: Tag },
  ];

  // Revenue computed from users list
  const now = new Date();
  const payingUsers    = users.filter(u => u.plan_status === 'active');
  const trialUsers     = users.filter(u => {
    const te = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
    return te ? now < te : false;
  });
  const expiredUsers   = users.filter(u => {
    const te = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
    const trialOk = te ? now < te : false;
    return !trialOk && u.plan_status !== 'active';
  });
  const cancelledUsers = users.filter(u => u.plan_status === 'cancelled');
  const monthlyPaying  = payingUsers.filter(u => u.plan_type === 'monthly');
  const annualPaying   = payingUsers.filter(u => u.plan_type === 'annual');
  const mrr = monthlyPaying.length * 29 + annualPaying.length * (199 / 12);
  const arr = mrr * 12;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: c.text, margin: '0 0 4px' }}>Painel Administrativo</h1>
        <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Gerencie usuários, envie avisos e controle o sistema</p>
      </div>

      {/* Tabs */}
      <div style={{ overflowX: 'auto', marginBottom: 28, WebkitOverflowScrolling: 'touch' as any }}>
        <div style={{ display: 'flex', gap: 4, background: c.inputBg, borderRadius: 12, padding: 4, width: 'max-content', minWidth: '100%' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, border: 'none', background: active ? c.surface : 'transparent', color: active ? c.text : c.textFaint, fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', boxShadow: active ? c.shadow : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                <Icon size={15}/>{t.label}
              </button>
            );
          })}
        </div>
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
          {/* ── OVERVIEW / RELATÓRIOS ── */}
          {tab === 'overview' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Linha 1 — KPIs de assinatura */}
              <div>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💳 Assinaturas</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
                  {[
                    { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: 'Receita mensal recorrente', color: '#22c55e' },
                    { label: 'ARR', value: `R$ ${arr.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: 'Projeção anual', color: '#6366f1' },
                    { label: 'Pagantes', value: String(payingUsers.length), sub: `${monthlyPaying.length} mensal · ${annualPaying.length} anual`, color: '#22c55e' },
                    { label: 'Em Trial', value: String(trialUsers.length), sub: 'Período de teste ativo', color: '#f59e0b' },
                    { label: 'Pendentes', value: String(expiredUsers.length), sub: 'Trial expirado, sem plano', color: '#ef4444' },
                    { label: 'Cancelados', value: String(cancelledUsers.length), sub: 'Assinatura cancelada', color: '#94a3b8' },
                  ].map(k => (
                    <div key={k.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.color, borderRadius: '14px 14px 0 0' }}/>
                      <p style={{ margin: '4px 0 6px', fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                      <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</p>
                      <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>{k.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linha 2 — KPIs de usuários */}
              <div>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>👥 Usuários</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
                  {[
                    { label: 'Total', value: String(stats.totalUsers), sub: 'Cadastros na plataforma', color: '#6366f1' },
                    { label: 'Ativos (7d)', value: String(stats.activeWeek), sub: 'Login nos últimos 7 dias', color: '#22c55e' },
                    { label: 'Conversão', value: stats.totalUsers > 0 ? `${((payingUsers.length / stats.totalUsers) * 100).toFixed(1)}%` : '0%', sub: 'Trial → Pagante', color: '#f97316' },
                    { label: 'Churn', value: stats.totalUsers > 0 ? `${((cancelledUsers.length / Math.max(payingUsers.length + cancelledUsers.length, 1)) * 100).toFixed(1)}%` : '0%', sub: 'Cancelamentos / total pago', color: '#ef4444' },
                  ].map(k => (
                    <div key={k.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.color, borderRadius: '14px 14px 0 0' }}/>
                      <p style={{ margin: '4px 0 6px', fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                      <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</p>
                      <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>{k.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico novos usuários */}
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: c.text }}>📈 Novos Cadastros — últimos 30 dias</p>
                    <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>Usuários registrados por dia</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#6366f1' }}>{stats.newUsersPerDay.reduce((s: number, d: any) => s + d.count, 0)}</p>
                    <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>no período</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.newUsersPerDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.borderLight}/>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: c.textFaint }} axisLine={false} tickLine={false} tickFormatter={d => dayjs(d).format('DD/MM')} interval={4}/>
                    <YAxis tick={{ fontSize: 10, fill: c.textFaint }} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, color: c.text, fontSize: 12 }} formatter={(v: any) => [v, 'Novos usuários']} labelFormatter={l => dayjs(l).format('DD/MM/YYYY')}/>
                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#gU)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Grid: distribuição de planos + últimas atividades */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>

                {/* Distribuição de planos */}
                <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 24 }}>
                  <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 15, color: c.text }}>🥧 Distribuição de Planos</p>
                  {[
                    { label: 'Pagantes mensal', count: monthlyPaying.length, total: users.length, color: '#22c55e', value: `R$ ${(monthlyPaying.length * 29).toLocaleString('pt-BR')}/mês` },
                    { label: 'Pagantes anual', count: annualPaying.length, total: users.length, color: '#6366f1', value: `R$ ${(annualPaying.length * 199).toLocaleString('pt-BR')}/ano` },
                    { label: 'Em trial', count: trialUsers.length, total: users.length, color: '#f59e0b', value: `${trialUsers.length} usuários` },
                    { label: 'Pendentes', count: expiredUsers.length, total: users.length, color: '#ef4444', value: 'Sem plano ativo' },
                  ].map(item => {
                    const pct = users.length > 0 ? (item.count / users.length) * 100 : 0;
                    return (
                      <div key={item.label} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }}/>
                            <span style={{ fontSize: 13, color: c.text }}>{item.label}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{item.count}</span>
                            <span style={{ fontSize: 11, color: c.textFaint, marginLeft: 4 }}>({pct.toFixed(0)}%)</span>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: c.borderLight }}>
                          <div style={{ height: '100%', borderRadius: 99, background: item.color, width: `${pct}%`, transition: 'width 0.5s' }}/>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: c.textFaint, textAlign: 'right' }}>{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Clientes recentes */}
                <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 24 }}>
                  <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 15, color: c.text }}>🆕 Últimos Cadastros</p>
                  {[...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6).map((u, i, arr) => {
                    const te = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
                    const inTrial = te ? new Date() < te : false;
                    const ps = u.plan_status === 'active' ? { label: 'Pago', color: '#22c55e' } : inTrial ? { label: 'Trial', color: '#f59e0b' } : { label: 'Expirado', color: '#ef4444' };
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < arr.length - 1 ? `1px solid ${c.borderLight}` : 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                          {(u.name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email}</p>
                          <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>{dayjs(u.created_at).format('DD/MM/YYYY')}</p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: ps.color + '20', color: ps.color, flexShrink: 0 }}>{ps.label}</span>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Clientes que precisam de atenção */}
              {expiredUsers.length > 0 && (
                <div style={{ background: c.surface, borderRadius: 16, border: `1px solid #ef444430`, padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: c.text }}>⚠️ Atenção — Clientes sem plano ativo ({expiredUsers.length})</p>
                      <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>Trial expirado — oportunidade de conversão</p>
                    </div>
                    <button onClick={() => setTab('revenue')} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#22c55e', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Ver na aba Receita →
                    </button>
                  </div>
                  {expiredUsers.slice(0, 4).map((u, i) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < Math.min(expiredUsers.length, 4) - 1 ? `1px solid ${c.borderLight}` : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}/>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, color: c.text }}>{u.name || u.email}</span>
                        {u.name && <span style={{ fontSize: 11, color: c.textFaint, marginLeft: 8 }}>{u.email}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: '#f87171' }}>Trial encerrou {u.trial_ends_at ? dayjs(u.trial_ends_at).fromNow() : ''}</span>
                      <button onClick={() => { setInvoiceEmail(u.email); setInvoicePlan('monthly'); setTab('revenue'); }} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#22c55e20', color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Ativar
                      </button>
                    </div>
                  ))}
                  {expiredUsers.length > 4 && <p style={{ margin: '10px 0 0', fontSize: 12, color: c.textFaint, textAlign: 'center' }}>+{expiredUsers.length - 4} mais na aba Receita</p>}
                </div>
              )}

            </div>
          )}

          {/* ── REVENUE ── */}
          {tab === 'revenue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
                {[
                  { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <TrendingUp size={18} color="#22c55e"/>, color: '#22c55e', sub: 'Receita mensal recorrente' },
                  { label: 'ARR', value: `R$ ${arr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign size={18} color="#6366f1"/>, color: '#6366f1', sub: 'Receita anual projetada' },
                  { label: 'Pagantes', value: payingUsers.length, icon: <CheckCircle size={18} color="#22c55e"/>, color: '#22c55e', sub: `${monthlyPaying.length} mensal · ${annualPaying.length} anual` },
                  { label: 'Em Trial', value: trialUsers.length, icon: <Clock size={18} color="#f59e0b"/>, color: '#f59e0b', sub: 'Período de teste' },
                  { label: 'Expirados', value: expiredUsers.length, icon: <XCircle size={18} color="#ef4444"/>, color: '#ef4444', sub: 'Trial vencido, sem plano' },
                  { label: 'Cancelados', value: cancelledUsers.length, icon: <Ban size={18} color="#94a3b8"/>, color: '#94a3b8', sub: 'Assinatura cancelada' },
                ].map(k => (
                  <div key={k.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '18px 20px', borderTop: `3px solid ${k.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
                      {k.icon}
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: c.text }}>{k.value}</p>
                    <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Send invoice / activate plan */}
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 24 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: c.text }}>📨 Enviar Fatura / Ativar Plano</p>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: c.textFaint }}>Ativa o plano do usuário manualmente e envia um link de acesso por e-mail.</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2, minWidth: 220 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>E-mail do cliente</label>
                    <input
                      value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)}
                      placeholder="cliente@email.com" list="users-datalist"
                      style={{ ...inputStyle, width: '100%' }}
                    />
                    <datalist id="users-datalist">
                      {users.map(u => <option key={u.id} value={u.email}/>)}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Plano</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['monthly', 'annual'] as const).map(p => (
                        <button key={p} onClick={() => setInvoicePlan(p)} style={{ padding: '10px 16px', borderRadius: 10, border: `2px solid ${invoicePlan === p ? '#22c55e' : c.border}`, background: invoicePlan === p ? '#052e1620' : 'transparent', color: invoicePlan === p ? '#22c55e' : c.textMuted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          {p === 'monthly' ? '📅 Mensal R$29' : '📆 Anual R$199'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={sendInvoiceLink} disabled={invoiceSending || !invoiceEmail} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: invoiceSending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(34,197,94,0.3)', whiteSpace: 'nowrap' }}>
                    {invoiceSending ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Send size={14}/>}
                    Ativar e Enviar Link
                  </button>
                </div>
              </div>

              {/* Paying clients table */}
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: c.text }}>✅ Clientes Pagantes ({payingUsers.length})</p>
                  <button onClick={() => {
                    const headers = ['Email', 'Plano', 'Status', 'Expira em'];
                    const rows = payingUsers.map(u => [u.email, u.plan_type || '', u.plan_status, u.plan_expires_at ? dayjs(u.plan_expires_at).format('DD/MM/YYYY') : '']);
                    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
                    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
                    a.download = 'clientes-pagantes.csv'; a.click();
                  }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                    <Download size={13}/>Exportar CSV
                  </button>
                </div>
                {payingUsers.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: 40, color: c.textFaint }}>Nenhum cliente pagante ainda</p>
                ) : (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px 110px', padding: '10px 20px', background: c.inputBg, borderBottom: `1px solid ${c.border}`, minWidth: 620 }}>
                      {['Cliente', 'Plano', 'Valor/mês', 'Expira em', 'Ações'].map(h => (
                        <span key={h} style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                      ))}
                    </div>
                    {payingUsers.map((u, i) => (
                      <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px 110px', padding: '13px 20px', borderBottom: i < payingUsers.length - 1 ? `1px solid ${c.borderLight}` : 'none', alignItems: 'center', minWidth: 620 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text }}>{u.name || u.email}</p>
                          {u.name && <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>{u.email}</p>}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: u.plan_type === 'annual' ? '#052e1640' : '#1e293b', color: u.plan_type === 'annual' ? '#4ade80' : '#94a3b8', width: 'fit-content' }}>
                          {u.plan_type === 'monthly' ? '📅 Mensal' : '📆 Anual'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                          R$ {u.plan_type === 'monthly' ? '29,00' : (199/12).toFixed(2).replace('.', ',')}
                        </span>
                        <span style={{ fontSize: 12, color: c.textSecondary }}>
                          {u.plan_expires_at ? dayjs(u.plan_expires_at).format('DD/MM/YYYY') : '—'}
                        </span>
                        <button onClick={() => { setInvoiceEmail(u.email); setInvoicePlan(u.plan_type || 'monthly'); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          <Mail size={11}/>Reenviar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending (trial expired, no plan) */}
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: c.text }}>⏰ Clientes Pendentes ({expiredUsers.length})</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: c.textFaint }}>Trial expirado — ainda não assinaram</p>
                </div>
                {expiredUsers.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: 40, color: c.textFaint }}>Nenhum pendente 🎉</p>
                ) : (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px', padding: '10px 20px', background: c.inputBg, borderBottom: `1px solid ${c.border}`, minWidth: 420 }}>
                      {['Cliente', 'Trial encerrado em', 'Cobrar'].map(h => (
                        <span key={h} style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                      ))}
                    </div>
                    {expiredUsers.map((u, i) => (
                      <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px', padding: '13px 20px', borderBottom: i < expiredUsers.length - 1 ? `1px solid ${c.borderLight}` : 'none', alignItems: 'center', minWidth: 420 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text }}>{u.name || u.email}</p>
                          {u.name && <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>{u.email}</p>}
                        </div>
                        <span style={{ fontSize: 12, color: '#f87171' }}>
                          {u.trial_ends_at ? dayjs(u.trial_ends_at).format('DD/MM/YYYY') : '—'}
                        </span>
                        <button onClick={() => { setInvoiceEmail(u.email); setInvoicePlan('monthly'); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#22c55e20', color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          <Send size={11}/>Ativar plano
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div>
              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                  <Users size={15}/> + Novo Usuário
                </button>
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
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 90px 130px 100px', padding: '12px 20px', borderBottom: `1px solid ${c.border}`, background: c.inputBg, minWidth: 700 }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 90px 130px 100px', padding: '14px 20px', alignItems: 'center', cursor: 'pointer', minWidth: 700 }} onClick={() => { if (expanded === user.id) setExpanded(null); else loadDetail(user.id); }}>

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
                            {/* Plan badge */}
                            {(() => {
                              const now = new Date();
                              const trialEnds = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
                              const inTrial = trialEnds ? now < trialEnds : false;
                              const ps = user.plan_status;
                              if (ps === 'active') return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>✅ Ativo</span>;
                              if (inTrial) return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fefce8', color: '#ca8a04', fontWeight: 700 }}>⏳ Trial</span>;
                              if (ps === 'cancelled') return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>❌ Cancelado</span>;
                              return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>🔓 Sem plano</span>;
                            })()}
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
                            <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>

                              {/* === ASSINATURA === */}
                              <div style={{ background: c.surface, borderRadius: 12, padding: '16px', border: `1px solid ${c.border}` }}>
                                <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💳 Assinatura</p>

                                {/* Status atual */}
                                {(() => {
                                  const now = new Date();
                                  const trialEnds = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
                                  const inTrial = trialEnds ? now < trialEnds : false;
                                  const trialLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / 86400000)) : 0;
                                  const ps = inTrial ? 'trial' : (user.plan_status || 'none');
                                  const statusLabel: Record<string, { label: string; color: string }> = {
                                    trial:     { label: `Trial — ${trialLeft}d restantes`, color: '#f59e0b' },
                                    active:    { label: 'Ativo',     color: '#22c55e' },
                                    paused:    { label: 'Pausado',   color: '#f59e0b' },
                                    cancelled: { label: 'Cancelado', color: '#ef4444' },
                                    none:      { label: 'Sem plano', color: '#ef4444' },
                                  };
                                  const sc = statusLabel[ps] || statusLabel.none;
                                  return (
                                    <div style={{ marginBottom: 12 }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, background: sc.color + '18', padding: '3px 10px', borderRadius: 99 }}>{sc.label}</span>
                                      {user.plan_expires_at && <p style={{ margin: '6px 0 0', fontSize: 11, color: c.textFaint }}>Expira: {dayjs(user.plan_expires_at).format('DD/MM/YYYY')}</p>}
                                      {inTrial && <p style={{ margin: '6px 0 0', fontSize: 11, color: c.textFaint }}>Trial até: {dayjs(user.trial_ends_at).format('DD/MM/YYYY')}</p>}
                                    </div>
                                  );
                                })()}

                                {/* Tipo de plano */}
                                <p style={{ margin: '0 0 6px', fontSize: 11, color: c.textFaint }}>Tipo de plano</p>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                  {(['monthly', 'annual'] as const).map(pt => (
                                    <button
                                      key={pt}
                                      onClick={async () => {
                                        await adminFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ id: user.id, plan_type: pt }) });
                                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, plan_type: pt } : u));
                                        showToast(`Plano de ${user.email} → ${pt === 'monthly' ? 'Mensal' : 'Anual'}`);
                                      }}
                                      style={{ flex: 1, padding: '7px', borderRadius: 8, border: `2px solid ${user.plan_type === pt ? '#22c55e' : c.border}`, background: user.plan_type === pt ? '#052e1620' : 'transparent', color: user.plan_type === pt ? '#22c55e' : c.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      {pt === 'monthly' ? '📅 Mensal\nR$ 29' : '📆 Anual\nR$ 199'}
                                    </button>
                                  ))}
                                </div>

                                {/* Status override */}
                                <p style={{ margin: '0 0 6px', fontSize: 11, color: c.textFaint }}>Alterar status</p>
                                <select
                                  value={user.plan_status || 'trial'}
                                  onChange={async e => {
                                    const ps = e.target.value;
                                    await adminFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ id: user.id, plan_status: ps }) });
                                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, plan_status: ps } : u));
                                    showToast(`Status de ${user.email} → "${ps}"`);
                                  }}
                                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                >
                                  <option value="trial">⏳ Trial</option>
                                  <option value="active">✅ Ativo</option>
                                  <option value="paused">⏸ Pausado</option>
                                  <option value="cancelled">❌ Cancelado</option>
                                </select>
                              </div>

                              {/* === HISTÓRICO === */}
                              <div style={{ background: c.surface, borderRadius: 12, padding: '16px', border: `1px solid ${c.border}` }}>
                                <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⏱ Histórico</p>
                                <p style={{ margin: '0 0 6px', fontSize: 12, color: c.textSecondary }}>📅 Cadastro: {dayjs(user.created_at).format('DD/MM/YYYY')}</p>
                                <p style={{ margin: '0 0 6px', fontSize: 12, color: c.textSecondary }}>🕐 Último login: {user.last_sign_in_at ? dayjs(user.last_sign_in_at).format('DD/MM/YYYY HH:mm') : 'Nunca'}</p>
                                <p style={{ margin: '0 0 6px', fontSize: 12, color: user.confirmed ? '#22c55e' : '#f97316' }}>{user.confirmed ? '✅ E-mail confirmado' : '⏳ E-mail pendente'}</p>
                                <p style={{ margin: '0 0 6px', fontSize: 12, color: c.textSecondary }}>💸 Transações: {user.transactions}</p>
                                <p style={{ margin: 0, fontSize: 12, color: c.textSecondary }}>🏦 Contas: {d.wallets?.length || 0} · 🎯 Metas: {d.goals?.length || 0}</p>
                              </div>
                            </div>

                            {/* Ações */}
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
                </div>{/* end overflow-x */}
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                    <div onClick={() => setBroadcastWa(v => !v)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${broadcastWa ? '#22c55e' : c.border}`, background: broadcastWa ? '#22c55e' : c.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {broadcastWa && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: c.text, fontWeight: 500 }}>📱 Enviar também pelo WhatsApp para todos os clientes ativos</span>
                  </label>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setBroadcastMsg(''); saveBroadcast(); }} style={{ padding: '11px 20px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Limpar aviso</button>
                    <button onClick={saveBroadcast} disabled={broadcastSaving || !broadcastMsg} style={{ flex: 1, padding: '11px 20px', borderRadius: 10, border: 'none', background: broadcastSaving || !broadcastMsg ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: broadcastSaving || !broadcastMsg ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {broadcastSaving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }}/> : <Send size={15}/>}
                      {broadcastWa ? 'Publicar + Enviar WhatsApp' : 'Publicar para todos'}
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
          {/* ── PRICING ── */}
          {tab === 'pricing' && (
            <div style={{ maxWidth: 560 }}>
              <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 28 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: c.text }}>💰 Preços dos Planos</h2>
                <p style={{ margin: '0 0 28px', fontSize: 13, color: c.textFaint }}>
                  Altere os valores aqui e eles serão refletidos automaticamente na landing page, checkout e plano do cliente.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Mensal */}
                  <div style={{ background: c.inputBg, borderRadius: 14, padding: 20, border: `1px solid ${c.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#6366f120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Tag size={16} color="#6366f1"/>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: c.text }}>Plano Mensal</p>
                        <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>Cobrado todo mês</p>
                      </div>
                    </div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Valor (R$)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: c.textMuted }}>R$</span>
                      <input
                        type="number" min="1" step="1"
                        value={priceMonthly}
                        onChange={e => setPriceMonthly(e.target.value)}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${c.border}`, fontSize: 22, fontWeight: 800, color: c.text, background: c.surface, outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 14, color: c.textFaint }}>/mês</span>
                    </div>
                  </div>

                  {/* Anual */}
                  <div style={{ background: c.inputBg, borderRadius: 14, padding: 20, border: `2px solid #22c55e30` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#22c55e20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Tag size={16} color="#22c55e"/>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: c.text }}>Plano Anual</p>
                        <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>
                          Cobrado uma vez por ano · ≈ R$ {(Number(priceAnnual) / 12).toFixed(2).replace('.', ',')}/mês
                        </p>
                      </div>
                    </div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Valor (R$)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: c.textMuted }}>R$</span>
                      <input
                        type="number" min="1" step="1"
                        value={priceAnnual}
                        onChange={e => setPriceAnnual(e.target.value)}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${c.border}`, fontSize: 22, fontWeight: 800, color: c.text, background: c.surface, outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 14, color: c.textFaint }}>/ano</span>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: 12, color: '#4ade80' }}>
                      Economia: R$ {(Number(priceMonthly) * 12 - Number(priceAnnual)).toFixed(2).replace('.', ',')} em relação ao mensal
                    </p>
                  </div>

                  <button onClick={savePricing} disabled={priceSaving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: priceSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                    {priceSaving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }}/> : <Tag size={15}/>}
                    {priceSaving ? 'Salvando...' : 'Salvar preços'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create user modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
          <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>Criar Novo Usuário</h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: c.textFaint }}>O usuário será criado diretamente no Supabase</p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint }}><X size={20}/></button>
            </div>
            <form onSubmit={doCreateUser} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Send invite toggle */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setCreateForm(f => ({ ...f, send_invite: false }))} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${!createForm.send_invite ? '#6366f1' : c.border}`, background: !createForm.send_invite ? '#eef2ff' : c.surface, color: !createForm.send_invite ? '#6366f1' : c.textMuted, fontSize: 13, fontWeight: !createForm.send_invite ? 700 : 400, cursor: 'pointer' }}>
                  🔑 Criar com senha
                </button>
                <button type="button" onClick={() => setCreateForm(f => ({ ...f, send_invite: true }))} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${createForm.send_invite ? '#6366f1' : c.border}`, background: createForm.send_invite ? '#eef2ff' : c.surface, color: createForm.send_invite ? '#6366f1' : c.textMuted, fontSize: 13, fontWeight: createForm.send_invite ? 700 : 400, cursor: 'pointer' }}>
                  ✉️ Enviar convite
                </button>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>E-mail *</label>
                <input required type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@exemplo.com" style={{ ...inputStyle, width: '100%' }}/>
              </div>

              {!createForm.send_invite && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Senha</label>
                  <input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Deixe em branco para senha aleatória" style={{ ...inputStyle, width: '100%' }}/>
                  <p style={{ margin: '5px 0 0', fontSize: 11, color: c.textFaint }}>Se deixar em branco, o usuário precisará redefinir a senha.</p>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Nome (opcional)</label>
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" style={{ ...inputStyle, width: '100%' }}/>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>📱 WhatsApp (opcional)</label>
                <input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ex: 62 99999-9999 (com DDD)" type="tel" style={{ ...inputStyle, width: '100%' }}/>
                <p style={{ margin: '5px 0 0', fontSize: 11, color: c.textFaint }}>Necessário para receber mensagens via WhatsApp.</p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Role</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'user', l: '👤 Usuário' }, { v: 'admin', l: '🛡️ Admin' }].map(r => (
                    <button key={r.v} type="button" onClick={() => setCreateForm(f => ({ ...f, role: r.v }))} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${createForm.role === r.v ? '#6366f1' : c.border}`, background: createForm.role === r.v ? '#eef2ff' : c.surface, color: createForm.role === r.v ? '#6366f1' : c.textMuted, fontSize: 13, fontWeight: createForm.role === r.v ? 700 : 400, cursor: 'pointer' }}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>

              {createForm.send_invite && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1e40af' }}>
                  ✉️ Um e-mail de convite será enviado para <strong>{createForm.email || 'o usuário'}</strong>. Ele poderá definir a própria senha ao aceitar.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={creating || !createForm.email} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: creating || !createForm.email ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: creating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {creating ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }}/>Criando...</> : createForm.send_invite ? <>✉️ Enviar convite</> : <><UserCheck size={15}/>Criar usuário</>}
                </button>
              </div>
            </form>
          </div>
        </div>
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
