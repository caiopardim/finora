'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  LayoutDashboard, ArrowLeftRight, Tag, Target,
  BarChart2, Settings, LogOut, ChevronRight, Bell, Receipt, AlertTriangle, Clock, Sun, Moon, CalendarDays, Wallet,
} from 'lucide-react';
import GlobalSearch from '@/components/ui/GlobalSearch';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import { useTheme } from '@/lib/theme-context';

const NAV = [
  { href: '/dashboard',              label: 'Início',       icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações',   icon: ArrowLeftRight   },
  { href: '/dashboard/bills',        label: 'Contas',       icon: Receipt          },
  { href: '/dashboard/categories',   label: 'Categorias',   icon: Tag              },
  { href: '/dashboard/goals',        label: 'Metas',        icon: Target           },
  { href: '/dashboard/budget',       label: 'Orçamento',    icon: Wallet           },
  { href: '/dashboard/agenda',       label: 'Agenda',       icon: CalendarDays     },
  { href: '/dashboard/reports',      label: 'Relatórios',   icon: BarChart2        },
  { href: '/dashboard/settings',     label: 'Config.',      icon: Settings         },
];

const NAV_MOBILE = [
  { href: '/dashboard',              label: 'Início',       icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações',   icon: ArrowLeftRight   },
  { href: '/dashboard/bills',        label: 'Contas',       icon: Receipt          },
  { href: '/dashboard/budget',       label: 'Orçamento',    icon: Wallet           },
  { href: '/dashboard/agenda',       label: 'Agenda',       icon: CalendarDays     },
  { href: '/dashboard/goals',        label: 'Metas',        icon: Target           },
  { href: '/dashboard/settings',     label: 'Config.',      icon: Settings         },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDark, c, toggleTheme } = useTheme();
  const [user, setUser] = useState<{ email?: string; name?: string; avatar_url?: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth/login'); return; }
      supabase.from('profiles').select('name,avatar_url').eq('id', session.user.id).single()
        .then(({ data: p }) => setUser({ email: session.user.email, name: p?.name, avatar_url: p?.avatar_url }));
      const today = dayjs();
      const in7 = today.add(7, 'day').format('YYYY-MM-DD');
      supabase.from('bills').select('id,description,amount,due_date')
        .eq('user_id', session.user.id).eq('paid', false)
        .lte('due_date', in7)
        .order('due_date', { ascending: true })
        .then(({ data }) => setAlerts(data || []));
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
        <div style={{ position: 'absolute', top: 44, right: 0, width: 300, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Notificações</p>
            {alerts.length > 0 && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{alerts.length} contas</span>}
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, margin: '0 0 6px' }}>🎉</p>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Nenhuma conta vencendo!</p>
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {alerts.map((bill, i) => {
                const due = dayjs(bill.due_date);
                const diff = due.diff(today, 'day');
                const overdue = diff < 0;
                return (
                  <Link key={bill.id} href="/dashboard/bills" onClick={() => setShowAlerts(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < alerts.length - 1 ? '1px solid #f8fafc' : 'none', textDecoration: 'none', background: overdue ? '#fff5f5' : '#fff' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: overdue ? '#fef2f2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {overdue ? <AlertTriangle size={16} color="#dc2626"/> : <Clock size={16} color="#d97706"/>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.description}</p>
                      <p style={{ margin: 0, fontSize: 11, color: overdue ? '#dc2626' : '#d97706', fontWeight: 500 }}>
                        {overdue ? `Venceu há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff} dia${diff !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: overdue ? '#dc2626' : '#0f172a', flexShrink: 0 }}>{formatCurrency(Number(bill.amount))}</p>
                  </Link>
                );
              })}
            </div>
          )}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9' }}>
            <Link href="/dashboard/bills" onClick={() => setShowAlerts(false)} style={{ display: 'block', textAlign: 'center', fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Ver todas as contas →</Link>
          </div>
        </div>
      )}
    </div>
  );

  const Avatar = () => (
    <Link href="/dashboard/settings" style={{ display: 'block', borderRadius: '50%', cursor: 'pointer', textDecoration: 'none' }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>{initial}</div>
      }
    </Link>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: c.bg, fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.2s' }}>
        {/* Mobile topbar */}
        <header style={{ background: isDark ? '#020617' : '#0f172a', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💰</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Finora</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8 }}>
              {isDark ? <Sun size={16} color="#fbbf24"/> : <Moon size={16} color="#94a3b8"/>}
            </button>
            <BellButton dark/>
            <Avatar/>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '20px 16px', paddingBottom: 90, overflowY: 'auto' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Finora</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>Finanças pelo WhatsApp</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
