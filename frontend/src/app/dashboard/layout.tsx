'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  LayoutDashboard, ArrowLeftRight, Tag, Target,
  BarChart2, Settings, LogOut, ChevronRight, Bell, Receipt, AlertTriangle, Clock, Sun, Moon, CalendarDays, Wallet, LandmarkIcon, RefreshCw, Shield, CreditCard,
} from 'lucide-react';
import GlobalSearch from '@/components/ui/GlobalSearch';
import PaywallGuard from '@/components/PaywallGuard';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import { useTheme } from '@/lib/theme-context';

const NAV = [
  { href: '/dashboard',              label: 'Início',       icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações',   icon: ArrowLeftRight   },
  { href: '/dashboard/wallets',      label: 'Contas',       icon: Wallet           },
  { href: '/dashboard/bills',        label: 'Faturas',      icon: Receipt          },
  { href: '/dashboard/categories',   label: 'Categorias',   icon: Tag              },
  { href: '/dashboard/goals',        label: 'Metas',        icon: Target           },
  { href: '/dashboard/budget',       label: 'Orçamento',    icon: LandmarkIcon     },
  { href: '/dashboard/agenda',       label: 'Agenda',       icon: CalendarDays     },
  { href: '/dashboard/recurring',     label: 'Recorrentes',  icon: RefreshCw        },
  { href: '/dashboard/reports',      label: 'Relatórios',   icon: BarChart2        },
  { href: '/dashboard/settings',     label: 'Config.',      icon: Settings         },
  { href: '/dashboard/plano',        label: 'Meu Plano',    icon: CreditCard       },
];

const NAV_MOBILE = [
  { href: '/dashboard',              label: 'Início',       icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações',   icon: ArrowLeftRight   },
  { href: '/dashboard/wallets',      label: 'Contas',       icon: Wallet           },
  { href: '/dashboard/bills',        label: 'Faturas',      icon: Receipt          },
  { href: '/dashboard/budget',       label: 'Orçamento',    icon: LandmarkIcon     },
  { href: '/dashboard/settings',     label: 'Config.',      icon: Settings         },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDark, c, toggleTheme } = useTheme();
  const [user, setUser] = useState<{ email?: string; name?: string; avatar_url?: string; isAdmin?: boolean } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [broadcast, setBroadcast] = useState<{ message: string; type: string } | null>(null);
  const [maintenance, setMaintenance] = useState<{ message: string } | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth/login'); return; }
      supabase.from('profiles').select('name,avatar_url,onboarded,role').eq('id', session.user.id).single()
        .then(({ data: p }) => {
          setUser({ email: session.user.email, name: p?.name, avatar_url: p?.avatar_url, isAdmin: p?.role === 'admin' });
          if (p && p.onboarded === false && !window.location.pathname.includes('/onboarding')) {
            router.replace('/dashboard/onboarding');
          }
        });
      const today = dayjs();
      const in7 = today.add(7, 'day').format('YYYY-MM-DD');
      const uid = session.user.id;
      const monthStart = today.startOf('month').format('YYYY-MM-DD');
      const monthEnd   = today.endOf('month').format('YYYY-MM-DD');

      const [billsRes, txRes, catsRes, profileRes] = await Promise.all([
        supabase.from('bills').select('id,description,amount,due_date').eq('user_id', uid).eq('paid', false).lte('due_date', in7).order('due_date', { ascending: true }),
        supabase.from('transactions').select('type,amount,category_id').eq('user_id', uid).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('categories').select('id,name,icon,color,budget_limit,budget_limit_type,budget_limit_pct').eq('user_id', uid).not('budget_limit', 'is', null),
        supabase.from('profiles').select('budget_mode,budget_pct,budget_fixed').eq('id', uid).maybeSingle(),
      ]);

      const txs     = txRes.data || [];
      const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

      // Spend per category
      const catSpend: Record<string, number> = {};
      for (const t of txs.filter(t => t.type === 'expense')) {
        const k = t.category_id || 'none';
        catSpend[k] = (catSpend[k] || 0) + Number(t.amount);
      }

      // Budget alerts (>80% used)
      const budgetAlerts: any[] = [];

      // Global budget
      const prof = profileRes.data;
      let globalLimit = 0;
      if (prof?.budget_mode === 'percent' && prof.budget_pct) globalLimit = income * prof.budget_pct / 100;
      else if (prof?.budget_mode === 'fixed' && prof.budget_fixed) globalLimit = Number(prof.budget_fixed);
      if (globalLimit > 0) {
        const pct = expense / globalLimit * 100;
        if (pct >= 80) budgetAlerts.push({ type: 'global', pct: Math.round(pct), over: expense > globalLimit, spent: expense, limit: globalLimit });
      }

      // Per-category budget
      for (const cat of (catsRes.data || [])) {
        const spent = catSpend[cat.id] || 0;
        let limit = 0;
        if (cat.budget_limit_type === 'percent' && cat.budget_limit_pct) limit = income * cat.budget_limit_pct / 100;
        else if (cat.budget_limit) limit = Number(cat.budget_limit);
        if (limit > 0) {
          const pct = spent / limit * 100;
          if (pct >= 80) budgetAlerts.push({ type: 'category', id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, pct: Math.round(pct), over: spent > limit, spent, limit });
        }
      }

      setAlerts([...(billsRes.data || []).map(b => ({ ...b, alertType: 'bill' })), ...budgetAlerts.map(a => ({ ...a, alertType: 'budget' }))]);

      // Fetch broadcast + maintenance
      fetch('/api/admin/broadcast').then(r => r.json()).then(d => setBroadcast(d.broadcast));
      fetch('/api/admin/maintenance').then(r => r.json()).then(d => setMaintenance(d.maintenance));
    });
  }, [router, pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuário';
  const initial = displayName[0]?.toUpperCase() || 'U';

  const today = dayjs();
  const BellButton = ({ dark }: { dark?: boolean }) => (
    <div ref={alertRef} style={{ position: 'relative' }}>
      <button onClick={() => setShowAlerts(v => !v)} style={{ position: 'relative', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: dark ? 'transparent' : '#f1f5f9' }}>
        <Bell size={20} color={dark ? '#94a3b8' : '#64748b'}/>
        {alerts.length > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 99, background: '#ef4444', border: `2px solid ${dark ? '#0f172a' : '#fff'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', padding: '0 3px' }}>
            {alerts.length}
          </span>
        )}
      </button>

      {showAlerts && (
        <div style={{ position: 'absolute', top: 44, right: 0, width: 320, background: c.surface, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: `1px solid ${c.border}`, zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: c.text }}>Notificações</p>
            {alerts.length > 0 && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{alerts.length}</span>}
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, margin: '0 0 6px' }}>🎉</p>
              <p style={{ margin: 0, fontSize: 13, color: c.textFaint }}>Tudo em ordem!</p>
            </div>
          ) : (
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {alerts.map((alert, i) => {
                const isLast = i === alerts.length - 1;
                const borderStyle = isLast ? 'none' : `1px solid ${c.borderLight}`;

                if (alert.alertType === 'bill') {
                  const diff = dayjs(alert.due_date).diff(today, 'day');
                  const overdue = diff < 0;
                  return (
                    <Link key={alert.id} href="/dashboard/bills" onClick={() => setShowAlerts(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: borderStyle, textDecoration: 'none', background: 'transparent' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: overdue ? '#fef2f2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {overdue ? <AlertTriangle size={16} color="#dc2626"/> : <Clock size={16} color="#d97706"/>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.description}</p>
                        <p style={{ margin: 0, fontSize: 11, color: overdue ? '#dc2626' : '#d97706', fontWeight: 500 }}>
                          {overdue ? `Conta vencida há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff} dia${diff !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: overdue ? '#dc2626' : c.text, flexShrink: 0 }}>{formatCurrency(Number(alert.amount))}</p>
                    </Link>
                  );
                }

                // Budget alert
                const color = alert.over ? '#dc2626' : '#f97316';
                const bg    = alert.over ? '#fef2f2' : '#fff7ed';
                return (
                  <Link key={alert.type === 'global' ? 'global' : alert.id} href="/dashboard/budget" onClick={() => setShowAlerts(false)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: borderStyle, textDecoration: 'none', background: 'transparent' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                      {alert.type === 'global' ? '💰' : alert.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: c.text }}>
                        {alert.type === 'global' ? 'Orçamento global' : alert.name}
                      </p>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color, fontWeight: 500 }}>
                        {alert.over ? `⚠️ Limite ultrapassado! (+${formatCurrency(alert.spent - alert.limit)})` : `${alert.pct}% do limite usado — quase no teto!`}
                      </p>
                      <div style={{ background: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(alert.pct, 100)}%`, background: alert.over ? '#ef4444' : '#f97316' }}/>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${c.borderLight}`, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/dashboard/bills" onClick={() => setShowAlerts(false)} style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Ver contas →</Link>
            <span style={{ color: c.borderLight }}>|</span>
            <Link href="/dashboard/budget" onClick={() => setShowAlerts(false)} style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>Ver orçamento →</Link>
          </div>
        </div>
      )}
    </div>
  );

  const Avatar = () => (
    <Link href={user?.isAdmin ? '/admin' : '/dashboard/settings'} style={{ display: 'block', borderRadius: '50%', cursor: 'pointer', textDecoration: 'none', position: 'relative' }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>{initial}</div>
      }
      {user?.isAdmin && (
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#6366f1', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={7} color="#fff"/>
        </div>
      )}
    </Link>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: c.bg, fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.2s' }}>
        {/* Mobile topbar */}
        <header style={{ background: isDark ? '#020617' : '#0f172a', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 28 }}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8 }}>
              {isDark ? <Sun size={16} color="#fbbf24"/> : <Moon size={16} color="#94a3b8"/>}
            </button>
            <BellButton dark/>
            <Avatar/>
          </div>
        </header>

        {maintenance && (
          <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>🔧 {maintenance.message}</div>
        )}
        {broadcast && !maintenance && (
          <div style={{ background: broadcast.type === 'warning' ? '#78350f' : broadcast.type === 'error' ? '#7f1d1d' : '#1e3a5f', color: broadcast.type === 'warning' ? '#fcd34d' : broadcast.type === 'error' ? '#fca5a5' : '#93c5fd', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>
            {broadcast.type === 'warning' ? '⚠️' : broadcast.type === 'error' ? '🚨' : 'ℹ️'} {broadcast.message}
          </div>
        )}
        {/* Page content */}
        <main style={{ flex: 1, padding: '20px 16px', paddingBottom: 90, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          {children}
        </main>

        {/* Bottom nav */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: c.surface, borderTop: `1px solid ${c.border}`,
          display: 'flex', zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV_MOBILE.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 4px 8px', textDecoration: 'none', gap: 3,
                color: active ? '#22c55e' : c.textFaint,
                borderTop: active ? '2px solid #22c55e' : '2px solid transparent',
              }}>
                <Icon size={19}/>
                <span style={{ fontSize: 9, fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.2s' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, minHeight: '100vh', flexShrink: 0, background: c.sidebar, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${c.sidebarBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 32 }}/>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: active ? 'rgba(34,197,94,0.14)' : 'transparent', color: active ? '#22c55e' : '#94a3b8', fontWeight: active ? 600 : 400, fontSize: 14, transition: 'all 0.15s' }}>
                <Icon size={17}/>
                {label}
                {active && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }}/>}
              </Link>
            );
          })}

          {user?.isAdmin && (
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontWeight: 600, fontSize: 14, marginTop: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
              <Shield size={17}/>
              Painel Admin
              <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#6366f1', color: '#fff', fontWeight: 700 }}>ADM</span>
            </Link>
          )}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: `1px solid ${c.sidebarBorder}` }}>
          <button onClick={toggleTheme} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: isDark ? '#fbbf24' : '#94a3b8', fontSize: 13, marginBottom: 6 }}>
            {isDark ? <Sun size={15}/> : <Moon size={15}/>}
            {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: 13, marginBottom: 10 }}>
            <LogOut size={15}/> Sair
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px' }}>
            <Avatar/>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ background: c.topbar, borderBottom: `1px solid ${c.topbarBorder}`, padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, transition: 'background 0.2s' }}>
          <div style={{ flex: 1 }}>
            <GlobalSearch/>
          </div>
          <BellButton/>
        </header>
        {maintenance && (
          <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 32px', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
            🔧 <span>{maintenance.message}</span>
          </div>
        )}
        {broadcast && !maintenance && (
          <div style={{ background: broadcast.type === 'warning' ? '#78350f' : broadcast.type === 'error' ? '#7f1d1d' : '#1e3a5f', color: broadcast.type === 'warning' ? '#fcd34d' : broadcast.type === 'error' ? '#fca5a5' : '#93c5fd', padding: '10px 32px', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
            {broadcast.type === 'warning' ? '⚠️' : broadcast.type === 'error' ? '🚨' : 'ℹ️'} <span>{broadcast.message}</span>
          </div>
        )}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}><PaywallGuard>{children}</PaywallGuard></main>
      </div>
    </div>
  );
}
