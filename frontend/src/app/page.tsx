'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Check, Star, ArrowRight, Zap, Shield, RefreshCw, ChevronDown, MessageCircle, BarChart3, Target, Bell, TrendingUp } from 'lucide-react';
import { getSettings } from '@/lib/settings';

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: 'up' | 'left' | 'right' | 'none' }) {
  const { ref, visible } = useInView();
  const tx = direction === 'up' ? '0,30px' : direction === 'left' ? '-30px,0' : direction === 'right' ? '30px,0' : '0,0';
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translate(0,0)' : `translate(${tx})`, transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0; const step = target / 40;
    const t = setInterval(() => { start += step; if (start >= target) { setVal(target); clearInterval(t); } else setVal(Math.floor(start)); }, 28);
    return () => clearInterval(t);
  }, [visible, target]);
  return <span ref={ref as any}>{val}{suffix}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: open ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: `1px solid ${open ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`, padding: '20px 24px', cursor: 'pointer', transition: 'all 0.25s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#f1f5f9' }}>{q}</p>
        <ChevronDown size={17} color="#64748b" style={{ flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'none' }}/>
      </div>
      {open && <p style={{ margin: '12px 0 0', fontSize: 14, color: '#64748b', lineHeight: 1.75 }}>{a}</p>}
    </div>
  );
}

/* ── WhatsApp Mockup ── */
function WhatsAppMockup() {
  const messages = [
    { from: 'user', text: 'Gastei 45 reais no mercado' },
    { from: 'bot', text: '✅ Gasto Registrado!\n\n📝 Mercado\n🏷️ Alimentação\n💸 R$ 45,00\n📅 Hoje' },
    { from: 'user', text: 'Quanto gastei esse mês?' },
    { from: 'bot', text: '📊 Junho:\n💸 Gastos: R$ 1.840\n💰 Receitas: R$ 4.200\n✅ Saldo: R$ 2.360' },
  ];
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, overflow: 'hidden', width: '100%', maxWidth: 300, boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.15)' }}>
      <div style={{ background: '#075e54', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/favicon.svg" alt="Finora" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}/>
        <div><p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>Finora IA</p><p style={{ margin: 0, color: '#9de0d8', fontSize: 11 }}>● online agora</p></div>
      </div>
      <div style={{ background: '#111b21', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 260 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ background: m.from === 'user' ? '#005c4b' : '#202c33', borderRadius: m.from === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '8px 12px', maxWidth: '88%', fontSize: 12, color: '#e9edef', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#202c33', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, background: '#2a3942', borderRadius: 99, padding: '8px 14px', fontSize: 12, color: '#8696a0' }}>Mensagem...</div>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard Mockup ── */
function DashboardMockup() {
  const bars = [65, 40, 80, 55, 90, 70, 45];
  const days = ['S','T','Q','Q','S','S','D'];
  return (
    <div style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 360, boxShadow: '0 40px 100px rgba(0,0,0,0.5)', padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#475569', fontWeight: 600 }}>GASTOS — JUNHO</p>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#fff' }}>R$ 1.840<span style={{ fontSize: 14, color: '#475569', fontWeight: 400 }}>,00</span></p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#22c55e' }}>↓ 12% vs mês anterior</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 12 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', background: i === 4 ? '#22c55e' : 'rgba(34,197,94,0.2)', borderRadius: 6, height: `${h}%`, transition: 'height 0.5s ease' }}/>
            <span style={{ fontSize: 9, color: '#334155' }}>{days[i]}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Alimentação', pct: 38, color: '#22c55e' },
          { label: 'Transporte', pct: 22, color: '#6366f1' },
          { label: 'Lazer', pct: 15, color: '#f97316' },
        ].map(c => (
          <div key={c.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 8px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, marginBottom: 6 }}/>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: '#475569' }}>{c.label}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Budget Alert Mockup ── */
function AlertMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 340 }}>
      {[
        { icon: '⚠️', title: 'Orçamento: Alimentação', msg: 'Você já usou 80% do limite de R$ 600,00', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
        { icon: '🚨', title: 'Orçamento: Lazer', msg: 'Limite de R$ 300,00 ultrapassado!', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
        { icon: '✅', title: 'Orçamento: Transporte', msg: 'Você usou 45% do limite — está dentro!', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
      ].map((a, i) => (
        <div key={i} style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 12, backdropFilter: 'blur(10px)' }}>
          <span style={{ fontSize: 24 }}>{a.icon}</span>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{a.title}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{a.msg}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Goals Mockup ── */
function GoalsMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 340 }}>
      {[
        { label: 'Viagem para Europa', current: 4800, goal: 8000, color: '#22c55e' },
        { label: 'Reserva de emergência', current: 12000, goal: 15000, color: '#6366f1' },
        { label: 'Notebook novo', current: 1200, goal: 3500, color: '#f97316' },
      ].map((g, i) => {
        const pct = Math.min(100, Math.round(g.current / g.goal * 100));
        return (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 18px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{g.label}</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: g.color }}>{pct}%</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: g.color, borderRadius: 99, transition: 'width 1s ease' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#475569' }}>R$ {g.current.toLocaleString('pt-BR')}</span>
              <span style={{ fontSize: 12, color: '#334155' }}>de R$ {g.goal.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PLAN_FEATURES = [
  'Acesso pelo WhatsApp com IA',
  'Dashboard completo com gráficos',
  'Transações ilimitadas',
  'Múltiplas carteiras e contas',
  'Metas financeiras',
  'Orçamento por categoria',
  'Faturas e vencimentos',
  'Transações recorrentes',
  'Agenda financeira',
  'Importar extrato CSV',
  'Relatórios e exportação',
  'Modo escuro e personalização',
];

const FAQS = [
  { q: 'Tem garantia?', a: 'Sim! Oferecemos 7 dias de garantia total. Se não ficar satisfeito por qualquer motivo, devolvemos 100% do valor pago, sem burocracia.' },
  { q: 'Funciona com qualquer número de WhatsApp?', a: 'Sim! Basta ter um WhatsApp ativo. Você adiciona o número da Finora e começa a mandar mensagem normalmente.' },
  { q: 'A IA entende mensagens do dia a dia?', a: 'Sim. Você pode escrever como fala: "Gastei 45 no mercado", "Paguei 120 de internet", "Recebi 3.500 de salário". A IA entende tudo.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem burocracia. No plano mensal você cancela quando quiser. No anual, 7 dias de garantia com reembolso total.' },
  { q: 'Meus dados estão seguros?', a: 'Totalmente. Usamos criptografia, servidores em nuvem com backup automático e nunca compartilhamos seus dados com terceiros.' },
  { q: 'Tem limite de transações?', a: 'Não! Transações ilimitadas em todos os planos. Registre quantos gastos e receitas quiser.' },
  { q: 'Como funciona o orçamento por categoria?', a: 'Você define um limite mensal para cada categoria (ex: R$ 600 para alimentação). A Finora te avisa no WhatsApp quando atingir 50%, 80% e 100% do limite.' },
];

export default function Home() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [heroVisible, setHeroVisible] = useState(false);
  const [priceMonthly, setPriceMonthly] = useState(29);
  const [priceAnnual, setPriceAnnual] = useState(199);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    getSettings().then(s => { setPriceMonthly(s.price_monthly); setPriceAnnual(s.price_annual); });
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#020617', color: '#f1f5f9', overflowX: 'hidden' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.6);opacity:0} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes scroll-left { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .btn-primary:hover { box-shadow: 0 0 40px rgba(34,197,94,0.6) !important; transform: translateY(-2px) !important; }
        .btn-primary { transition: all 0.2s ease !important; }
        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: #22c55e !important; }
        @media (max-width: 900px) {
          .hero-grid { flex-direction: column !important; align-items: center !important; }
          .mockup-col { display: flex !important; justify-content: center !important; width: 100% !important; animation: none !important; }
          .hero-title { font-size: 42px !important; letter-spacing: -1px !important; }
          .section-pad { padding: 80px 24px !important; }
          .feature-row { flex-direction: column !important; gap: 48px !important; }
          .feature-row.reverse { flex-direction: column !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .hero-title { font-size: 34px !important; }
          .header-links { display: none !important; }
          .header-inner { padding: 14px 20px !important; }
          .feature-text-title { font-size: 30px !important; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="header-inner" style={{ padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 44 }}/>
        <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="header-links" style={{ display: 'flex', gap: 28, alignItems: 'center', marginRight: 16 }}>
            {['#como-funciona', '#funcionalidades', '#planos'].map((href, i) => (
              <a key={href} href={href} className="nav-link" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                {['Como funciona', 'Funcionalidades', 'Planos'][i]}
              </a>
            ))}
          </div>
          <Link href="/auth/login" style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 14, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>Já sou cliente</Link>
          <Link href="/assinar" className="btn-primary" style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 20px rgba(34,197,94,0.3)', whiteSpace: 'nowrap' }}>Assinar</Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: '130px 48px 100px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 80, justifyContent: 'space-between' }}>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'all 0.7s ease' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 99, padding: '6px 16px', marginBottom: 32 }}>
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }}/>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'pulse-ring 1.8s ease-out infinite' }}/>
                  </span>
                  <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>7 dias de garantia · Cancele quando quiser</span>
                </div>
              </div>

              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 0.7s ease 0.1s' }}>
                <h1 className="hero-title" style={{ fontSize: 64, fontWeight: 800, margin: '0 0 24px', lineHeight: 1.06, letterSpacing: '-2.5px', color: '#fff' }}>
                  Não gerencie mais{' '}
                  <br/>
                  seu dinheiro{' '}
                  <span style={{ backgroundImage: 'linear-gradient(90deg,#22c55e 0%,#4ade80 50%,#22c55e 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>
                    sozinho.
                  </span>
                </h1>
                <p style={{ color: '#64748b', fontSize: 19, margin: '0 0 40px', lineHeight: 1.7, maxWidth: 500 }}>
                  Manda uma mensagem no WhatsApp e eu registro, categorizo e organizo tudo. Seu dinheiro, sob controle — sem planilha, sem esforço.
                </p>
              </div>

              <div style={{ opacity: heroVisible ? 1 : 0, transition: 'all 0.7s ease 0.2s', display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 56 }}>
                <Link href="/assinar" className="btn-primary" style={{ padding: '16px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 32px rgba(34,197,94,0.35)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Começar agora <ArrowRight size={17}/>
                </Link>
                <a href="#como-funciona" style={{ padding: '16px 28px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 15, fontWeight: 500, textDecoration: 'none', backdropFilter: 'blur(10px)' }}>
                  Ver como funciona
                </a>
              </div>

              <div style={{ opacity: heroVisible ? 1 : 0, transition: 'all 0.7s ease 0.3s', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>
                    <Counter target={12} suffix="+"/>
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>funcionalidades</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>
                    R$ {Number(priceMonthly).toFixed(2).replace('.', ',')}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>por mês</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>7 dias</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>de garantia</p>
                </div>
              </div>
            </div>

            <div className="mockup-col" style={{ flexShrink: 0, width: 300, animation: 'float 7s ease-in-out infinite' }}>
              <WhatsAppMockup/>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '28px 48px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', label: 'Dados criptografados' },
            { icon: '🛡️', label: '7 dias de garantia' },
            { icon: '🇧🇷', label: 'Feito no Brasil' },
            { icon: '⚡', label: 'Disponível 24h no WhatsApp' },
            { icon: '❌', label: 'Sem planilha' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature 1: WhatsApp ── */}
      <section id="como-funciona" className="section-pad" style={{ padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.06) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="feature-row" style={{ display: 'flex', alignItems: 'center', gap: 100 }}>
            <FadeIn direction="left">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.1)', borderRadius: 99, padding: '6px 14px', marginBottom: 24 }}>
                  <MessageCircle size={14} color="#22c55e"/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>WhatsApp</span>
                </div>
                <h2 className="feature-text-title" style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
                  Chega de abrir app<br/>pra registrar gasto.
                </h2>
                <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.75, margin: '0 0 32px', maxWidth: 460 }}>
                  Fala comigo no WhatsApp do jeito que você fala com qualquer amigo. Eu entendo a linguagem natural e registro tudo automaticamente.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    '"Gastei 45 reais no mercado"',
                    '"Paguei 120 de internet"',
                    '"Recebi 3.500 de salário"',
                  ].map((ex, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }}/>
                      <span style={{ fontSize: 15, color: '#94a3b8', fontStyle: 'italic' }}>{ex}</span>
                    </div>
                  ))}
                </div>
                <Link href="/assinar" className="btn-primary" style={{ marginTop: 36, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 24px rgba(34,197,94,0.3)' }}>
                  Registrar pelo WhatsApp <ArrowRight size={16}/>
                </Link>
              </div>
            </FadeIn>
            <FadeIn direction="right" delay={150}>
              <div style={{ flexShrink: 0 }}>
                <WhatsAppMockup/>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Feature 2: Dashboard ── */}
      <section className="section-pad" style={{ padding: '120px 48px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '-5%', top: '50%', transform: 'translateY(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.06) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="feature-row reverse" style={{ display: 'flex', alignItems: 'center', gap: 100, flexDirection: 'row-reverse' as any }}>
            <FadeIn direction="right">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.12)', borderRadius: 99, padding: '6px 14px', marginBottom: 24 }}>
                  <BarChart3 size={14} color="#6366f1"/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dashboard</span>
                </div>
                <h2 className="feature-text-title" style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
                  Eu te mostro pra<br/>onde vai seu dinheiro.
                </h2>
                <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.75, margin: '0 0 32px', maxWidth: 460 }}>
                  Gráficos, filtros, categorias e visão completa em tempo real. Tudo num dashboard elegante que você acessa de qualquer dispositivo.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400 }}>
                  {[
                    { icon: '📊', label: 'Gráficos por período' },
                    { icon: '🏷️', label: 'Categorias automáticas' },
                    { icon: '🔍', label: 'Busca global' },
                    { icon: '📥', label: 'Exportar extrato' },
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
                      <span style={{ fontSize: 18 }}>{f.icon}</span>
                      <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                <Link href="/assinar" className="btn-primary" style={{ marginTop: 36, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 24px rgba(34,197,94,0.3)' }}>
                  Ver meu dashboard <ArrowRight size={16}/>
                </Link>
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={150}>
              <div style={{ flexShrink: 0 }}>
                <DashboardMockup/>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Feature 3: Orçamento e alertas ── */}
      <section className="section-pad" style={{ padding: '120px 48px', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.05) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="feature-row" style={{ display: 'flex', alignItems: 'center', gap: 100 }}>
            <FadeIn direction="left">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.12)', borderRadius: 99, padding: '6px 14px', marginBottom: 24 }}>
                  <Bell size={14} color="#f59e0b"/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Orçamento</span>
                </div>
                <h2 className="feature-text-title" style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
                  Surpresa no fim do<br/>mês? Comigo, não.
                </h2>
                <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.75, margin: '0 0 32px', maxWidth: 460 }}>
                  Defina limites por categoria e receba alertas no WhatsApp quando atingir 50%, 80% e 100% do orçamento. Assim você ajusta antes de estourar.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { icon: '🟡', label: 'Alerta em 50% — hora de ficar de olho' },
                    { icon: '🟠', label: 'Alerta em 80% — desacelere um pouco' },
                    { icon: '🔴', label: 'Alerta em 100% — limite atingido!' },
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16 }}>{step.icon}</span>
                      <span style={{ fontSize: 14, color: '#94a3b8' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
                <Link href="/assinar" className="btn-primary" style={{ marginTop: 36, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 24px rgba(34,197,94,0.3)' }}>
                  Definir meu orçamento <ArrowRight size={16}/>
                </Link>
              </div>
            </FadeIn>
            <FadeIn direction="right" delay={150}>
              <div style={{ flexShrink: 0 }}>
                <AlertMockup/>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Feature 4: Metas ── */}
      <section className="section-pad" style={{ padding: '120px 48px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '-5%', top: '50%', transform: 'translateY(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(249,115,22,0.05) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="feature-row reverse" style={{ display: 'flex', alignItems: 'center', gap: 100, flexDirection: 'row-reverse' as any }}>
            <FadeIn direction="right">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.12)', borderRadius: 99, padding: '6px 14px', marginBottom: 24 }}>
                  <Target size={14} color="#f97316"/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Metas</span>
                </div>
                <h2 className="feature-text-title" style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
                  Sonho com prazo<br/>vira realidade.
                </h2>
                <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.75, margin: '0 0 32px', maxWidth: 460 }}>
                  Crie metas com valor e prazo. Eu acompanho seu progresso e te mostro quanto falta para chegar lá. Simples assim.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    'Viagem, reserva de emergência, notebook novo...',
                    'Progresso visual com barra de conclusão',
                    'Histórico completo de contribuições',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <Check size={10} color="#22c55e"/>
                      </div>
                      <span style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/assinar" className="btn-primary" style={{ marginTop: 36, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 24px rgba(34,197,94,0.3)' }}>
                  Criar minha primeira meta <ArrowRight size={16}/>
                </Link>
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={150}>
              <div style={{ flexShrink: 0 }}>
                <GoalsMockup/>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Feature 5: Como funciona (steps) ── */}
      <section id="funcionalidades" className="section-pad" style={{ padding: '120px 48px', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.05) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <FadeIn>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Como funciona</p>
            <h2 style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-1.5px' }}>Em 3 passos simples</h2>
            <p style={{ fontSize: 17, color: '#475569', margin: '0 0 72px' }}>Sem configuração complicada. Começa hoje, funciona amanhã.</p>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { step: '01', icon: '📱', title: 'Adiciona o número', desc: 'Salva o contato da Finora no seu WhatsApp. Só isso.' },
              { step: '02', icon: '💬', title: 'Manda mensagem', desc: '"Gastei R$ 50 no mercado" — e eu registro na hora.' },
              { step: '03', icon: '📊', title: 'Veja o resultado', desc: 'Dashboard atualizado em tempo real com tudo organizado.' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100} direction="up">
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: '36px 28px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(34,197,94,0.3),transparent)' }}/>
                  <p style={{ fontSize: 48, fontWeight: 900, color: 'rgba(34,197,94,0.15)', margin: '0 0 20px', letterSpacing: '-2px', fontFamily: 'monospace' }}>{s.step}</p>
                  <div style={{ fontSize: 40, marginBottom: 18 }}>{s.icon}</div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', margin: '0 0 10px' }}>{s.title}</p>
                  <p style={{ fontSize: 14, color: '#475569', margin: 0, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Segurança ── */}
      <section className="section-pad" style={{ padding: '100px 48px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Segurança</p>
            <h2 style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-1.5px' }}>Seus dados são seus.</h2>
            <p style={{ fontSize: 17, color: '#475569', margin: '0 0 60px' }}>Segurança sem concessões. Seus dados nunca serão vendidos, compartilhados ou usados para fins comerciais.</p>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {[
              { icon: '🔒', title: 'Criptografia', desc: 'Todos os dados trafegam e são armazenados com criptografia de ponta a ponta.' },
              { icon: '🛡️', title: 'Privacidade total', desc: 'Nenhum dado compartilhado com terceiros. Jamais.' },
              { icon: '☁️', title: 'Backup automático', desc: 'Seus dados ficam salvos na nuvem com backups diários.' },
              { icon: '🇧🇷', title: 'Servidores no Brasil', desc: 'Infraestrutura nacional, dentro das normas da LGPD.' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 80} direction="up">
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 22px', textAlign: 'left' }}>
                  <span style={{ fontSize: 36, display: 'block', marginBottom: 16 }}>{item.icon}</span>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="section-pad" style={{ padding: '120px 48px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Depoimentos</p>
            <h2 style={{ textAlign: 'center', fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 56px', letterSpacing: '-1.5px' }}>Quem usa, aprova</h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 20 }}>
            {[
              { name: 'Ana Paula', role: 'Designer Freelancer', text: 'Finalmente parei de usar planilha. Em 2 semanas já sabia exatamente onde eu estava gastando mais.', photo: 'https://i.pravatar.cc/150?img=47' },
              { name: 'Carlos M.', role: 'Empreendedor', text: 'O WhatsApp mudou tudo. Registro na hora que acontece, sem esquecer nada. Simples demais!', photo: 'https://i.pravatar.cc/150?img=11' },
              { name: 'Fernanda L.', role: 'CLT + Freela', text: 'As metas me ajudaram a juntar pra viagem em 6 meses. Nunca imaginei que seria tão fácil.', photo: 'https://i.pravatar.cc/150?img=32' },
            ].map((t, i) => (
              <FadeIn key={t.name} delay={i * 100} direction="up">
                <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(34,197,94,0.25),transparent)' }}/>
                  <div style={{ display: 'flex', marginBottom: 16 }}>
                    {[1,2,3,4,5].map(s => <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                  </div>
                  <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.75, margin: '0 0 24px' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={t.photo} alt={t.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(34,197,94,0.3)', display: 'block' }}/>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{t.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className="section-pad" style={{ padding: '120px 48px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Planos</p>
            <h2 style={{ textAlign: 'center', fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-1.5px' }}>Simples e transparente</h2>
            <p style={{ textAlign: 'center', fontSize: 17, color: '#475569', margin: '0 0 40px' }}>Garantia de 7 dias ou seu dinheiro de volta.</p>
          </FadeIn>

          <FadeIn delay={100}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 48 }}>
              <span style={{ fontSize: 14, color: billing === 'monthly' ? '#f1f5f9' : '#475569', fontWeight: 600, transition: 'color 0.2s' }}>Mensal</span>
              <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} style={{ width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: billing === 'annual' ? '#22c55e' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.3s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 4, left: billing === 'annual' ? 28 : 4, transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}/>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: billing === 'annual' ? '#f1f5f9' : '#475569', fontWeight: 600, transition: 'color 0.2s' }}>Anual</span>
                {billing === 'annual' && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 700, border: '1px solid rgba(34,197,94,0.3)' }}>Economize R$ {(priceMonthly * 12 - priceAnnual).toFixed(2).replace('.', ',')}</span>}
              </div>
            </div>
          </FadeIn>

          <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 760, margin: '0 auto' }}>
            <FadeIn delay={100} direction="left"><PlanCard type="monthly" billing={billing} priceMonthly={priceMonthly} priceAnnual={priceAnnual}/></FadeIn>
            <FadeIn delay={200} direction="right"><PlanCard type="annual" billing={billing} priceMonthly={priceMonthly} priceAnnual={priceAnnual}/></FadeIn>
          </div>

          <FadeIn delay={300}>
            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
              {[
                { icon: <RefreshCw size={16} color="#22c55e"/>, title: '7 dias de garantia', desc: 'Reembolso total sem perguntas' },
                { icon: <Shield size={16} color="#22c55e"/>, title: 'Pagamento seguro', desc: 'SSL + criptografia ponta a ponta' },
                { icon: <Zap size={16} color="#22c55e"/>, title: 'Cancele quando quiser', desc: 'Sem fidelidade nem taxa' },
              ].map(g => (
                <div key={g.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{g.icon}</div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{g.title}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-pad" style={{ padding: '120px 48px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>FAQ</p>
            <h2 style={{ textAlign: 'center', fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 52px', letterSpacing: '-1.5px' }}>Perguntas frequentes</h2>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((f, i) => (
              <FadeIn key={i} delay={i * 50}>
                <FaqItem q={f.q} a={f.a}/>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="section-pad" style={{ padding: '120px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }}/>
        <FadeIn>
          <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}><img src="/favicon.svg" alt="Finora" style={{ width: 72, height: 72 }}/></div>
            <h2 style={{ color: '#fff', fontSize: 48, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-2px' }}>
              Comece hoje,<br/>
              <span style={{ backgroundImage: 'linear-gradient(90deg,#22c55e,#4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                sem complicação.
              </span>
            </h2>
            <p style={{ color: '#475569', fontSize: 17, margin: '0 0 40px', lineHeight: 1.75 }}>7 dias de garantia total. Se não amar, devolvemos 100% — sem burocracia.</p>
            <Link href="/assinar" className="btn-primary" style={{ padding: '17px 44px', borderRadius: 14, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 17, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 40px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Assinar agora <ArrowRight size={18}/>
            </Link>
            <p style={{ color: '#334155', fontSize: 13, marginTop: 18 }}>Cancele quando quiser · 7 dias de garantia · Pagamento seguro</p>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '32px 48px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 38 }}/>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Privacidade', href: '/privacidade' },
                { label: 'Termos', href: '/termos' },
                { label: 'Segurança', href: '/seguranca' },
                { label: 'Suporte', href: 'https://wa.me/5562982237323' },
              ].map(l => (
                <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ color: '#475569', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                >{l.label}</a>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#e1306c' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a href="https://wa.me/5562982237323" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#25d366' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.487-8.411"/>
              </svg>
            </a>
            <span style={{ color: '#334155', fontSize: 12 }}>© 2026 Finora</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Plan Card ── */
function PlanCard({ type, billing, priceMonthly, priceAnnual }: { type: 'monthly' | 'annual'; billing: 'monthly' | 'annual'; priceMonthly: number; priceAnnual: number }) {
  const [hovered, setHovered] = useState(false);
  const isAnnual = type === 'annual';
  const savings = (priceMonthly * 12 - priceAnnual).toFixed(2).replace('.', ',');
  const monthlyEquiv = (priceAnnual / 12).toFixed(2).replace('.', ',');
  const fmtMonthly = Number(priceMonthly).toFixed(2).replace('.', ',');
  const fmtAnnual  = Number(priceAnnual).toFixed(2).replace('.', ',');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 22, padding: '32px 28px', display: 'flex', flexDirection: 'column', position: 'relative',
        background: isAnnual ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        border: isAnnual ? '1px solid rgba(34,197,94,0.35)' : `1px solid rgba(255,255,255,${hovered ? '0.12' : '0.07'})`,
        boxShadow: isAnnual ? '0 0 60px rgba(34,197,94,0.1)' : 'none',
        transition: 'all 0.3s ease',
        transform: hovered && !isAnnual ? 'translateY(-4px)' : 'none',
        overflow: 'hidden',
      }}
    >
      {isAnnual && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#22c55e,transparent)' }}/>}
      {isAnnual && (
        <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: '0 0 10px 10px', whiteSpace: 'nowrap' }}>
          ⭐ MAIS POPULAR
        </div>
      )}

      <div style={{ marginTop: isAnnual ? 16 : 0 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: isAnnual ? '#22c55e' : '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isAnnual ? 'Anual' : 'Mensal'}</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{isAnnual ? `R$ ${fmtAnnual}` : `R$ ${fmtMonthly}`}</span>
          <span style={{ fontSize: 14, color: '#475569', marginBottom: 6 }}>{isAnnual ? '/ano' : '/mês'}</span>
        </div>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: isAnnual ? '#22c55e' : '#475569', fontWeight: isAnnual ? 500 : 400 }}>
          {isAnnual ? `≈ R$ ${monthlyEquiv}/mês · Economize R$ ${savings}` : 'Cancele quando quiser'}
        </p>
      </div>

      <ul style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {PLAN_FEATURES.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={10} color="#22c55e"/>
            </div>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={isAnnual ? '/assinar?plan=annual' : '/assinar?plan=monthly'}
        className="btn-primary"
        style={{
          width: '100%', padding: '14px', borderRadius: 12, textAlign: 'center',
          border: isAnnual ? 'none' : '1px solid rgba(34,197,94,0.4)',
          background: isAnnual ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'transparent',
          color: isAnnual ? '#fff' : '#22c55e', fontSize: 15, fontWeight: 700,
          textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: isAnnual ? '0 0 24px rgba(34,197,94,0.35)' : 'none',
          boxSizing: 'border-box',
        }}
      >
        {isAnnual ? <>⭐ Assinar por R$ {fmtAnnual}/ano</> : <>Assinar por R$ {fmtMonthly}/mês</>}
      </Link>
    </div>
  );
}
