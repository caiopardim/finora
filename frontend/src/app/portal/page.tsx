'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, ShieldCheck, ArrowRight, LogOut } from 'lucide-react';

export default function PortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', session.user.id)
        .single();
      // Só admin vê esta página; os demais vão direto ao dashboard
      if (profile?.role !== 'admin') { router.replace('/dashboard'); return; }
      setName(profile?.name || session.user.email?.split('@')[0] || '');
      setLoading(false);
    })();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Carregando…
      </div>
    );
  }

  const cards = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard size={30} color="#22c55e" />,
      title: 'Dashboard',
      desc: 'Suas finanças, agenda, metas e ferramentas do dia a dia.',
      accent: '#22c55e',
      accentBg: 'rgba(34,197,94,0.1)',
    },
    {
      href: '/admin',
      icon: <ShieldCheck size={30} color="#6366f1" />,
      title: 'Administração',
      desc: 'Painel de gestão: usuários, pagamentos, configurações e métricas.',
      accent: '#6366f1',
      accentBg: 'rgba(99,102,241,0.1)',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#020617,#0f172a)', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <style>{`
        .portal-card { transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
        .portal-card:hover { transform: translateY(-4px); }
      `}</style>

      <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 44, marginBottom: 40 }} />

      <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px', textAlign: 'center', letterSpacing: '-0.5px' }}>
        {name ? `Olá, ${name}!` : 'Bem-vindo!'}
      </h1>
      <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 40px', textAlign: 'center' }}>
        Por onde você quer começar?
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, width: '100%', maxWidth: 720 }}>
        {cards.map((card) => (
          <button
            key={card.href}
            onClick={() => router.push(card.href)}
            className="portal-card"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = card.accent; e.currentTarget.style.boxShadow = `0 12px 32px ${card.accentBg}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
            style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
              padding: '32px 26px', cursor: 'pointer', textAlign: 'left', color: '#fff', display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <div style={{ width: 60, height: 60, borderRadius: 14, background: card.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icon}
            </div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, color: '#f1f5f9' }}>{card.title}</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6 }}>{card.desc}</p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, color: card.accent, fontSize: 14, fontWeight: 600 }}>
              Acessar <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>

      <button onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 36, background: 'none', border: 'none', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        <LogOut size={15} /> Sair
      </button>
    </div>
  );
}
