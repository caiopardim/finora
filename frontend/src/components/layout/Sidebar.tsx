'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ArrowLeftRight, Tag, Target,
  BarChart2, Settings, LogOut, ChevronRight,
} from 'lucide-react';

const WA_LINK = `https://wa.me/5562982237323?text=${encodeURIComponent('Olá Finora! Quero começar a organizar meus gastos 🐷')}`;

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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 44 }}/>
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

      {/* WhatsApp CTA */}
      <div style={{ padding: '0 10px 12px' }}>
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 12, textDecoration: 'none',
            background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: '#fff', fontWeight: 600, fontSize: 13,
            boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
            transition: 'opacity 0.15s',
          }}
        >
          {/* WhatsApp SVG icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Falar com a Finora
        </a>
      </div>

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
