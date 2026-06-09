'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Check, Star, ArrowRight, Zap, Shield, RefreshCw, ChevronDown } from 'lucide-react';
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
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🐷</div>
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

const FEATURES = [
  { icon: '💬', title: 'WhatsApp nativo', desc: 'Registre qualquer gasto sem abrir nenhum app. Só manda uma mensagem.', color: '#22c55e' },
  { icon: '🤖', title: 'IA que entende você', desc: 'GPT-4 interpreta linguagem natural, categoriza e registra automaticamente.', color: '#6366f1' },
  { icon: '📊', title: 'Dashboard completo', desc: 'Gráficos, filtros, busca global e visão geral do seu dinheiro em tempo real.', color: '#f97316' },
  { icon: '⏰', title: 'Faturas e alertas', desc: 'Gerencie contas a pagar com alertas automáticos antes do vencimento.', color: '#ef4444' },
  { icon: '🎯', title: 'Metas financeiras', desc: 'Defina objetivos com prazo e acompanhe o progresso visualmente.', color: '#eab308' },
  { icon: '🏦', title: 'Múltiplas carteiras', desc: 'Conta corrente, poupança, cartão — tudo separado e organizado.', color: '#06b6d4' },
  { icon: '🔁', title: 'Recorrentes', desc: 'Assinaturas e despesas fixas geradas automaticamente todo mês.', color: '#8b5cf6' },
  { icon: '📋', title: 'Orçamento', desc: 'Defina limites por categoria e receba alertas quando estiver no teto.', color: '#f43f5e' },
  { icon: '📈', title: 'Relatórios', desc: 'Histórico completo, gráficos por período e insights financeiros.', color: '#3b82f6' },
];

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

const TESTIMONIALS = [
  { name: 'Ana Paula', role: 'Designer Freelancer', text: 'Finalmente parei de usar planilha. Em 2 semanas já sabia exatamente onde eu estava gastando mais.' },
  { name: 'Carlos M.', role: 'Empreendedor', text: 'O WhatsApp mudou tudo. Registro na hora que acontece, sem esquecer nada. Simples demais!' },
  { name: 'Fernanda L.', role: 'CLT + Freela', text: 'As metas me ajudaram a juntar pra viagem em 6 meses. Nunca imaginei que seria tão fácil.' },
];

const FAQS = [
  { q: 'Como funciona o trial grátis?', a: 'Você tem 3 dias para usar a Finora sem pagar nada e sem precisar cadastrar cartão de crédito. Depois do período, escolhe o plano que preferir.' },
  { q: 'Funciona com qualquer número de WhatsApp?', a: 'Sim! Basta ter um WhatsApp ativo. Você adiciona o número da Finora e começa a mandar mensagem normalmente.' },
  { q: 'A IA entende mensagens do dia a dia?', a: 'Sim. Você pode escrever como fala: "Gastei 45 no mercado", "Paguei 120 de internet", "Recebi 3.500 de salário". A IA entende tudo.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem burocracia. No plano mensal você cancela quando quiser. No anual, 7 dias de garantia com reembolso total.' },
  { q: 'Meus dados estão seguros?', a: 'Totalmente. Usamos criptografia, servidores em nuvem com backup automático e nunca compartilhamos seus dados com terceiros.' },
  { q: 'Tem limite de transações?', a: 'Não! Transações ilimitadas em todos os planos. Registre quantos gastos e receitas quiser.' },
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
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes glow-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .btn-primary:hover { box-shadow: 0 0 40px rgba(34,197,94,0.6) !important; transform: translateY(-2px) !important; }
        .btn-primary { transition: all 0.2s ease !important; }
        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: #22c55e !important; }
        .feature-card:hover { border-color: rgba(34,197,94,0.3) !important; background: rgba(34,197,94,0.05) !important; transform: translateY(-4px) !important; }
        .feature-card { transition: all 0.25s ease; }
        @media (max-width: 900px) {
          .hero-grid { flex-direction: column !important; align-items: center !important; }
          .mockup-col { display: flex !important; justify-content: center !important; width: 100% !important; animation: none !important; }
          .hero-title { font-size: 40px !important; letter-spacing: -1px !important; }
          .section-pad { padding: 72px 24px !important; }
          .features-grid { grid-template-columns: repeat(2,1fr) !important; }
          .steps-grid { grid-template-columns: repeat(2,1fr) !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .hero-title { font-size: 32px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .header-links { display: none !important; }
          .header-inner { padding: 14px 20px !important; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="header-inner" style={{ padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 32 }}/>
        <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="header-links" style={{ display: 'flex', gap: 28, alignItems: 'center', marginRight: 16 }}>
            {['#como-funciona', '#funcionalidades', '#planos'].map((href, i) => (
              <a key={href} href={href} className="nav-link" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                {['Como funciona', 'Funcionalidades', 'Planos'][i]}
              </a>
            ))}
          </div>
          <Link href="/auth/login" style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 14, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>Entrar</Link>
          <Link href="/assinar" className="btn-primary" style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 20px rgba(34,197,94,0.3)', whiteSpace: 'nowrap' }}>Começar grátis</Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: '120px 48px 140px', position: 'relative', overflow: 'hidden' }}>
        {/* Background glows */}
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: '30%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: '20%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.06) 0%,transparent 65%)', pointerEvents: 'none' }}/>
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 80, justifyContent: 'space-between' }}>

            {/* Left */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'all 0.7s ease' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 99, padding: '6px 16px', marginBottom: 32 }}>
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }}/>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'pulse-ring 1.8s ease-out infinite' }}/>
                  </span>
                  <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>IA disponível 24h · 3 dias grátis</span>
                </div>
              </div>

              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 0.7s ease 0.1s' }}>
                <h1 className="hero-title" style={{ fontSize: 62, fontWeight: 800, margin: '0 0 24px', lineHeight: 1.08, letterSpacing: '-2px', color: '#fff' }}>
                  Suas finanças,{' '}
                  <br/>
                  <span style={{ backgroundImage: 'linear-gradient(90deg,#22c55e 0%,#4ade80 50%,#22c55e 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>
                    no WhatsApp.
                  </span>
                </h1>
                <p style={{ color: '#64748b', fontSize: 18, margin: '0 0 40px', lineHeight: 1.75, maxWidth: 480 }}>
                  Manda uma mensagem e a IA registra, categoriza e organiza tudo. Acompanhe no dashboard mais completo do mercado.
                </p>
              </div>

              <div style={{ opacity: heroVisible ? 1 : 0, transition: 'all 0.7s ease 0.2s', display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 56 }}>
                <Link href="/assinar" className="btn-primary" style={{ padding: '15px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 32px rgba(34,197,94,0.35)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Começar grátis <ArrowRight size={17}/>
                </Link>
                <a href="#como-funciona" style={{ padding: '15px 28px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 15, fontWeight: 500, textDecoration: 'none', backdropFilter: 'blur(10px)' }}>
                  Ver demo
                </a>
              </div>

              {/* Stats */}
              <div style={{ opacity: heroVisible ? 1 : 0, transition: 'all 0.7s ease 0.3s', display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                {[
                  { value: 3, suffix: ' dias', label: 'de trial grátis' },
                  { value: 12, suffix: '+', label: 'funcionalidades' },
                  { value: priceMonthly, suffix: 'R$', label: 'por mês' },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 800, color: '#22c55e', letterSpacing: '-1px' }}>
                      <Counter target={s.value} suffix={s.suffix}/>
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className="mockup-col" style={{ flexShrink: 0, width: 300, animation: 'float 7s ease-in-out infinite' }}>
              <WhatsAppMockup/>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 48px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {[
            { icon: '⭐', text: '4.9/5 avaliação' },
            { icon: '🔒', text: 'Dados 100% seguros' },
            { icon: '💳', text: 'Sem cartão no trial' },
            { icon: '🇧🇷', text: 'Feito para o Brasil' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="section-pad" style={{ padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.05) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Como funciona</p>
            <h2 style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-1px' }}>Simples assim</h2>
            <p style={{ fontSize: 17, color: '#475569', margin: '0 0 72px' }}>Sem planilha, sem app complexo. Só WhatsApp.</p>
          </FadeIn>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {[
              { step: '01', icon: '📱', title: 'Manda uma mensagem', desc: '"Gastei R$ 45 no mercado" — só isso.' },
              { step: '02', icon: '🤖', title: 'A IA processa', desc: 'Categoriza, registra e confirma em segundos.' },
              { step: '03', icon: '📊', title: 'Você acompanha', desc: 'Dashboard atualizado em tempo real.' },
              { step: '04', icon: '🎯', title: 'Bate as metas', desc: 'Orçamentos, relatórios e insights inteligentes.' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100} direction="up">
                <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '32px 24px', animation: `float ${6 + i}s ease-in-out ${i * 0.5}s infinite`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(34,197,94,0.3),transparent)' }}/>
                  <p style={{ fontSize: 36, fontWeight: 900, color: 'rgba(34,197,94,0.15)', margin: '0 0 16px', letterSpacing: '-1px', fontFamily: 'monospace' }}>{s.step}</p>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', margin: '0 0 8px' }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="section-pad" style={{ padding: '120px 48px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Funcionalidades</p>
            <h2 style={{ textAlign: 'center', fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-1px' }}>Tudo que você precisa</h2>
            <p style={{ textAlign: 'center', fontSize: 17, color: '#475569', margin: '0 0 64px' }}>Cada detalhe pensado para simplificar sua vida financeira</p>
          </FadeIn>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 50} direction="up">
                <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '24px', cursor: 'default' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{f.icon}</div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', margin: '0 0 6px' }}>{f.title}</p>
                  <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
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
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Depoimentos</p>
            <h2 style={{ textAlign: 'center', fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 56px', letterSpacing: '-1px' }}>Quem usa, aprova</h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 100} direction="up">
                <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(34,197,94,0.25),transparent)' }}/>
                  <div style={{ display: 'flex', marginBottom: 16 }}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={14} color="#f59e0b" fill="#f59e0b"/>)}
                  </div>
                  <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.75, margin: '0 0 24px' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{t.name[0]}</div>
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
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Planos</p>
            <h2 style={{ textAlign: 'center', fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-1px' }}>Simples e transparente</h2>
            <p style={{ textAlign: 'center', fontSize: 17, color: '#475569', margin: '0 0 40px' }}>3 dias grátis, sem cartão. Depois escolha o plano.</p>
          </FadeIn>

          {/* Toggle */}
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

          {/* Garantias */}
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
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>FAQ</p>
            <h2 style={{ textAlign: 'center', fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 52px', letterSpacing: '-1px' }}>Perguntas frequentes</h2>
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
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }}/>
        <FadeIn>
          <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🐷</div>
            <h2 style={{ color: '#fff', fontSize: 48, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-1.5px' }}>Comece hoje,<br/>de graça</h2>
            <p style={{ color: '#475569', fontSize: 17, margin: '0 0 40px', lineHeight: 1.75 }}>3 dias para testar tudo sem cartão. Depois escolha o plano que fizer mais sentido pra você.</p>
            <Link href="/assinar" className="btn-primary" style={{ padding: '17px 44px', borderRadius: 14, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 17, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 40px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Criar conta grátis <ArrowRight size={18}/>
            </Link>
            <p style={{ color: '#334155', fontSize: 13, marginTop: 18 }}>Sem cartão · Cancele quando quiser · 7 dias de garantia</p>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '28px 48px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 22 }}/>
          <span style={{ color: '#334155', fontSize: 13 }}>© 2025 Finora</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacidade', 'Termos', 'Suporte'].map(l => (
            <a key={l} href="#" style={{ color: '#334155', fontSize: 13, textDecoration: 'none' }}>{l}</a>
          ))}
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
      {/* Top line glow for annual */}
      {isAnnual && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#22c55e,transparent)' }}/>}

      {isAnnual && (
        <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: '0 0 10px 10px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Star size={10} fill="#fff"/>MAIS POPULAR
        </div>
      )}

      <div style={{ marginTop: isAnnual ? 16 : 0 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: isAnnual ? '#22c55e' : '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isAnnual ? 'Anual' : 'Mensal'}</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{isAnnual ? `R$ ${fmtAnnual}` : `R$ ${fmtMonthly}`}</span>
          <span style={{ fontSize: 14, color: '#475569', marginBottom: 6 }}>{isAnnual ? '/ano' : '/mês'}</span>
        </div>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: isAnnual ? '#22c55e' : '#475569', fontWeight: isAnnual ? 500 : 400 }}>
          {isAnnual ? `≈ R$ ${monthlyEquiv}/mês · Economize R$ ${savings}` : 'Cancele quando quiser'  }
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
        {isAnnual ? <><Star size={14} fill="#fff"/>Assinar por R$ {fmtAnnual}/ano</> : <>Assinar por R$ {fmtMonthly}/mês</>}
      </Link>
    </div>
  );
}
