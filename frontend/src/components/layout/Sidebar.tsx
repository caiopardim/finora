'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ArrowLeftRight, Tag, Target,
  BarChart2, Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard',              label: 'Visão Geral',   icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações',    icon: ArrowLeftRight   },
  { href: '/dashboard/categories',   label: 'Categorias',    icon: Tag              },
  { href: '/dashboard/goals',        label: 'Metas',         icon: Target           },
  { href: '/dashboard/reports',      label: 'Relatórios',    icon: BarChart2        },
  { href: '/dashboard/settings',     label: 'Configurações', icon: Settings         },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<{ email?: string; name?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from('profiles').select('name,avatar_url').eq('id', data.user.id).single().then(({ data: p }) => {
        setUser({ email: data.user!.email, name: p?.name, avatar_url: p?.avatar_url });
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) return;
        supabase.from('profiles').select('name,avatar_url').eq('id', data.user.id).single().then(({ data: p }) => {
          setUser({ email: data.user!.email, name: p?.name, avatar_url: p?.avatar_url });
        });
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuário';
  const initial = displayName[0]?.toUpperCase() || 'U';

  return (
    <aside style={{
      width: 240, minHeight: '100vh', flexShrink: 0,
      background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>💰</div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Finora</p>
            <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>Finanças pelo WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
              background: active ? 'rgba(34,197,94,0.14)' : 'transparent',
              color: active ? '#22c55e' : '#94a3b8',
              fontWeight: active ? 600 : 400, fontSize: 14, transition: 'all 0.15s',
            }}>
              <Icon size={17} />
              {label}
              {active && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={handleLogout} style={{
          display: 'flex', width: '100%', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', color: '#64748b', fontSize: 13, marginBottom: 10,
          transition: 'color 0.15s',
        }}>
          <LogOut size={15} /> Sair
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px' }}>
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="avatar"
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>{initial}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </p>
            <p style={{ color: '#475569', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
