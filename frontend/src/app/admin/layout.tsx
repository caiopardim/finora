'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useTheme } from '@/lib/theme-context';
import { Shield, Users, LogOut, Sun, Moon } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { c, isDark, toggleTheme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth/login'); return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (p?.role !== 'admin') { router.replace('/dashboard'); return; }
      setChecking(false);
    });
  }, [router]);

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <p style={{ color: '#64748b', fontSize: 14 }}>Verificando permissões...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @media (max-width: 767px) {
          .admin-sidebar { display: none !important; }
          .admin-topbar  { display: flex !important; }
          .admin-main    { padding: 16px !important; padding-top: 72px !important; }
          .admin-mobile-menu { display: flex !important; }
        }
        @media (min-width: 768px) {
          .admin-topbar  { display: none !important; }
          .admin-mobile-menu { display: none !important; }
        }
      `}</style>

      {/* Sidebar — desktop only */}
      <aside className="admin-sidebar" style={{ width: 220, background: '#0f172a', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={17} color="#fff"/>
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Admin</p>
              <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>Finora</p>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', color: '#94a3b8', fontSize: 14 }}>
            <Users size={16}/> Usuários
          </Link>
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 13 }}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>} {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, textDecoration: 'none', color: '#64748b', fontSize: 13 }}>
            <LogOut size={14}/> Voltar ao app
          </Link>
        </div>
      </aside>

      {/* Topbar — mobile only */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <div className="admin-topbar" style={{ background: '#0f172a', padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color="#fff"/>
            </div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Admin Finora</p>
          </div>
          <button onClick={() => setMenuOpen(v => !v)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {menuOpen ? '✕ Fechar' : '☰ Menu'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="admin-mobile-menu" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', flexDirection: 'column', padding: '8px 12px 12px' }}>
            <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', color: '#94a3b8', fontSize: 14 }}>
              <Users size={16}/> Usuários
            </Link>
            <button onClick={() => { toggleTheme(); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 14, textAlign: 'left' }}>
              {isDark ? <Sun size={14}/> : <Moon size={14}/>} {isDark ? 'Modo Claro' : 'Modo Escuro'}
            </button>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 9, textDecoration: 'none', color: '#64748b', fontSize: 14 }}>
              <LogOut size={14}/> Voltar ao app
            </Link>
          </div>
        )}
      </div>

      <main className="admin-main" style={{ flex: 1, padding: '32px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
