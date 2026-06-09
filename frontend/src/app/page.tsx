'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Check, Star, ArrowRight, Zap, Shield, RefreshCw, ChevronDown } from 'lucide-react';
import { getSettings } from '@/lib/settings';

/* ── Animação de entrada ao scroll ── */
function useInView(threshold = 0.12) {
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
  const tx = direction === 'up' ? '0,28px' : direction === 'left' ? '-28px,0' : direction === 'right' ? '28px,0' : '0,0';
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translate(0,0)' : `translate(${tx})`,
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ── Contador animado ── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = target / 40;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 28);
    return () => clearInterval(t);
  }, [visible, target]);
  return <span ref={ref as any}>{val}{suffix}</span>;
}

const FEATURES = [
  { icon: '💬', title: 'WhatsApp nativo', desc: 'Registre qualquer gasto sem abrir nenhum app. Só manda uma mensagem e pronto.', color: '#22c55e' },
  { icon: '🤖', title: 'IA que entende você', desc: 'GPT-4 interpreta suas mensagens em linguagem natural, categoriza e registra automaticamente.', color: '#6366f1' },
  { icon: '📊', title: 'Dashboard completo', desc: 'Gráficos, filtros, modo escuro, busca global e visão geral do seu dinheiro em tempo real.', color: '#f97316' },
  { icon: '⏰', title: 'Faturas e vencimentos', desc: 'Gerencie contas a pagar com alertas automáticos antes do vencimento.', color: '#ef4444' },
  { icon: '🎯', title: 'Metas financeiras', desc: 'Defina objetivos com prazo e acompanhe o progresso visualmente.', color: '#eab308' },
  { icon: '🏦', title: 'Múltiplas carteiras', desc: 'Conta corrente, poupança, cartão — tudo separado e com saldo atualizado.', color: '#06b6d4' },
  { icon: '🔁', title: 'Transações recorrentes', desc: 'Assinaturas e despesas fixas geradas automaticamente todo mês.', color: '#8b5cf6' },
  { icon: '📋', title: 'Orçamento por categoria', desc: 'Defina limites por categoria e receba alertas quando estiver no teto.', color: '#f43f5e' },
  { icon: '📈', title: 'Relatórios detalhados', desc: 'Histórico completo, gráficos por período e insights do seu perfil financeiro.', color: '#3b82f6' },
];

const PLAN_FEATURES = [
  'Acesso pelo WhatsApp com IA',
  'Dashboard completo com gráficos',
  'Transações ilimitadas',
  'Contas e carteiras múltiplas',
  'Metas financeiras',
  'Orçamento por categoria',
  'Faturas e vencimentos',
  'Transações recorrentes',
  'Agenda de compromissos',
  'Importar extrato CSV',
  'Relatórios e exportação',
  'Busca global (Cmd+K)',
  'Modo escuro e personalização',
];

const TESTIMONIALS = [
  { name: 'Ana Paula', role: 'Designer Freelancer', text: 'Finalmente parei de usar planilha. Em 2 semanas já sabia exatamente onde estava gastando mais.', stars: 5 },
  { name: 'Carlos M.', role: 'Empreendedor', text: 'O WhatsApp mudou tudo pra mim. Registro na hora que acontece, sem esquecer nada. Simples demais!', stars: 5 },
  { name: 'Fernanda L.', role: 'CLT + Freela', text: 'As metas me ajudaram a juntar para a viagem em 6 meses. Nunca imaginei que seria tão fácil.', stars: 5 },
];

const FAQS = [
  { q: 'Como funciona o trial grátis?', a: 'Você tem 3 dias para usar a Finora sem pagar nada e sem precisar cadastrar cartão de crédito. Depois do período, escolhe o plano que preferir.' },
  { q: 'Funciona com qualquer número de WhatsApp?', a: 'Sim! Basta ter um WhatsApp ativo. Você adiciona o número da Finora e começa a mandar mensagem normalmente.' },
  { q: 'A IA entende mensagens do dia a dia?', a: 'Sim. Você pode escrever como fala: "Gastei 45 no mercado", "Paguei 120 de internet", "Recebi 3.500 de salário". A IA entende tudo.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem burocracia. No plano mensal você cancela quando quiser. No anual oferecemos garantia de 7 dias com reembolso total.' },
  { q: 'Meus dados estão seguros?', a: 'Totalmente. Usamos criptografia de ponta a ponta, servidores na nuvem com backup automático e nunca compartilhamos seus dados com terceiros.' },
  { q: 'Tem limite de transações?', a: 'Não! Transações ilimitadas em todos os planos. Registre quantos gastos e receitas quiser.' },
];

/* ── WhatsApp Chat Mockup ── */
function WhatsAppMockup() {
  const messages = [
    { from: 'user', text: 'Gastei 45 reais no mercado hoje' },
    { from: 'bot', text: '✅ Novo Gasto Registrado!\n\n📝 Descrição: Mercado\n🏷️ Categoria: Alimentação\n💸 Valor: R$ 45,00\n📅 Data: hoje' },
    { from: 'user', text: 'Quanto gastei esse mês?' },
    { from: 'bot', text: '📊 Resumo de Junho:\n\n💸 Gastos: R$ 1.840\n💰 Receitas: R$ 4.200\n✅ Saldo: R$ 2.360\n\nMaior gasto: Alimentação (R$ 620)' },
  ];

  return (
    <div style={{
      background: '#fff',
      borderRadius: 24,
      boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
      overflow: 'hidden',
      width: '100%',
      maxWidth: 320,
      margin: '0 auto',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Header */}
      <div style={{ background: '#075e54', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🐷</div>
        <div>
          <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>Finora</p>
          <p style={{ margin: 0, color: '#9de0d8', fontSize: 11 }}>online</p>
        </div>
      </div>
      {/* Messages */}
      <div style={{ background: '#e5ddd5', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 280 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.from === 'user' ? '#dcf8c6' : '#fff',
              borderRadius: m.from === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              padding: '8px 12px',
              maxWidth: '85%',
              fontSize: 12,
              color: '#1a1a1a',
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      {/* Input bar */}
      <div style={{ background: '#f0f0f0', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 99, padding: '8px 14px', fontSize: 12, color: '#aaa' }}>Digite uma mensagem...</div>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#075e54', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ Item ── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: '#fff',
        borderRadius: 14,
        border: `1.5px solid ${open ? '#22c55e50' : '#e2e8f0'}`,
        padding: '18px 22px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: open ? '0 4px 20px rgba(34,197,94,0.08)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{q}</p>
        <ChevronDown size={18} color="#64748b" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
      </div>
      {open && <p style={{ margin: '12px 0 0', fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{a}</p>}
    </div>
  );
}

/* ── Feature card ── */
function FeatureCard({ f, delay }: { f: typeof FEATURES[0]; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeIn delay={delay} direction="up">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? f.color + '0d' : '#f8fafc',
          borderRadius: 16,
          border: `1.5px solid ${hovered ? f.color + '50' : '#e2e8f0'}`,
          padding: '22px',
          transition: 'all 0.25s',
          transform: hovered ? 'translateY(-4px)' : 'none',
          boxShadow: hovered ? `0 12px 32px ${f.color}20` : 'none',
        }}
      >
        <div style={{ width: 46, height: 46, borderRadius: 13, background: f.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>{f.icon}</div>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', margin: '0 0 6px' }}>{f.title}</p>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
      </div>
    </FadeIn>
  );
}

export default function Home() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [heroVisible, setHeroVisible] = useState(false);
  const [priceMonthly, setPriceMonthly] = useState(29);
  const [priceAnnual, setPriceAnnual] = useState(199);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    getSettings().then(s => { setPriceMonthly(s.price_monthly); setPriceAnnual(s.price_annual); });
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', color: '#0f172a', overflowX: 'hidden' }}>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.55);opacity:0} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes bounce-in { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        .btn-glow:hover { box-shadow: 0 8px 32px rgba(34,197,94,0.55) !important; transform: translateY(-2px) !important; }
        .btn-glow { transition: all 0.2s ease !important; }
        .nav-link:hover { color: #22c55e !important; }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; text-align: center !important; }
          .hero-btns { justify-content: center !important; }
          .hero-stats { justify-content: center !important; }
          .header-nav-links { display: none !important; }
          .header-inner { padding: 14px 16px !important; }
          .section-pad { padding: 64px 20px !important; }
          .hero-section { padding: 70px 20px !important; }
          .mockup-col { display: none !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 36px !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="header-inner" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #e2e8f0', padding: '14px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <img src="/logo-finora.svg" alt="Finora" style={{ height: 34 }}/>
        <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="header-nav-links" style={{ display: 'flex', gap: 24, alignItems: 'center', marginRight: 12 }}>
            <a href="#funcionalidades" className="nav-link" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>Funcionalidades</a>
            <a href="#como-funciona" className="nav-link" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>Como funciona</a>
            <a href="#planos" className="nav-link" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>Planos</a>
          </div>
          <Link href="/auth/login" style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>Entrar</Link>
          <Link href="/assinar" className="btn-glow" style={{ padding: '8px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(34,197,94,0.3)', whiteSpace: 'nowrap' }}>Começar grátis</Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="hero-section" style={{ background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', padding: '90px 48px 100px', position: 'relative', overflow: 'hidden' }}>
        {/* grid dots */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(34,197,94,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }}/>
        {/* glow */}
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%)', pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 64, justifyContent: 'space-between' }}>

            {/* Left */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 99, padding: '5px 14px', marginBottom: 24 }}>
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'block' }}/>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'pulse-ring 1.5s ease-out infinite' }}/>
                  </span>
                  <Zap size={12} color="#22c55e"/>
                  <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>3 dias grátis · Sem cartão de crédito</span>
                </div>
              </div>

              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.6s ease 0.1s' }}>
                <h1 className="hero-title" style={{ color: '#fff', fontSize: 52, fontWeight: 800, margin: '0 0 18px', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
                  Organize suas{' '}
                  <span style={{ backgroundImage: 'linear-gradient(90deg,#22c55e,#4ade80,#22c55e)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }}>
                    finanças
                  </span>
                  <br/>pelo WhatsApp
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 17, margin: '0 0 32px', lineHeight: 1.75, maxWidth: 480 }}>
                  Manda uma mensagem e a IA registra, categoriza e organiza tudo. Você acompanha pelo dashboard mais completo do mercado.
                </p>
              </div>

              <div className="hero-btns" style={{ opacity: heroVisible ? 1 : 0, transition: 'all 0.6s ease 0.2s', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
                <Link href="/assinar" className="btn-glow" style={{ padding: '15px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 24px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Começar grátis <ArrowRight size={16}/>
                </Link>
                <a href="#como-funciona" style={{ padding: '15px 28px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
                  Ver como funciona
                </a>
              </div>

              {/* Stats */}
              <div className="hero-stats" style={{ opacity: heroVisible ? 1 : 0, transition: 'all 0.6s ease 0.3s', display: 'flex', gap: 36, flexWrap: 'wrap' }}>
                {[
                  { value: 3, suffix: ' dias', label: 'de trial grátis' },
                  { value: 12, suffix: '+', label: 'funcionalidades' },
                  { value: priceMonthly, suffix: 'R$', label: 'por mês' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'left' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 28, fontWeight: 800, color: '#22c55e' }}>
                      <Counter target={s.value} suffix={s.suffix}/>
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — WhatsApp mockup */}
            <div className="mockup-col" style={{ flexShrink: 0, width: 340, animation: 'float 6s ease-in-out infinite' }}>
              <WhatsAppMockup/>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '20px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            { icon: '⭐', text: '4.9/5 de avaliação' },
            { icon: '🔒', text: 'Dados 100% seguros' },
            { icon: '💳', text: 'Sem cartão no trial' },
            { icon: '🇧🇷', text: 'Feito para o Brasil' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="section-pad" style={{ padding: '96px 48px', background: 'linear-gradient(160deg,#0f172a,#1e293b)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(34,197,94,0.06) 1px, transparent 1px)', backgroundSize: '30px 30px' }}/>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <FadeIn>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Como funciona</p>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Simples assim</h2>
            <p style={{ fontSize: 16, color: '#64748b', margin: '0 0 60px' }}>Sem planilha, sem app complicado. Só WhatsApp.</p>
          </FadeIn>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 28 }}>
            {[
              { step: '1', icon: '📱', title: 'Manda uma mensagem', desc: '"Gastei R$ 45 no mercado" — só isso.' },
              { step: '2', icon: '🤖', title: 'A IA processa', desc: 'Categoriza, registra e confirma em segundos.' },
              { step: '3', icon: '📊', title: 'Você acompanha', desc: 'Dashboard atualizado em tempo real.' },
              { step: '4', icon: '🎯', title: 'Alcança seus objetivos', desc: 'Metas, orçamentos e relatórios inteligentes.' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100} direction="up">
                <div style={{ animation: `float ${5 + i}s ease-in-out ${i * 0.4}s infinite` }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#22c55e', margin: '0 auto 14px' }}>{s.step}</div>
                  <div style={{ fontSize: 34, marginBottom: 12 }}>{s.icon}</div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#fff', margin: '0 0 8px' }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="section-pad" style={{ padding: '96px 48px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Funcionalidades</p>
            <h2 style={{ textAlign: 'center', fontSize: 38, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>Tudo que você precisa</h2>
            <p style={{ textAlign: 'center', fontSize: 16, color: '#64748b', margin: '0 0 52px' }}>Cada detalhe pensado para simplificar sua vida financeira</p>
          </FadeIn>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} delay={i * 50}/>)}
          </div>
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="section-pad" style={{ padding: '96px 48px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Depoimentos</p>
            <h2 style={{ textAlign: 'center', fontSize: 38, fontWeight: 800, color: '#0f172a', margin: '0 0 48px' }}>Quem usa, aprova</h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 100} direction="up">
                <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #e2e8f0', padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', marginBottom: 14 }}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={14} color="#f59e0b" fill="#f59e0b"/>)}
                  </div>
                  <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.75, margin: '0 0 20px' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{t.name[0]}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{t.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className="section-pad" style={{ padding: '96px 48px', background: '#fff' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Planos</p>
            <h2 style={{ textAlign: 'center', fontSize: 38, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Simples e transparente</h2>
            <p style={{ textAlign: 'center', fontSize: 16, color: '#64748b', margin: '0 0 36px' }}>3 dias grátis, sem cartão. Depois escolha o plano.</p>
          </FadeIn>

          {/* Toggle */}
          <FadeIn delay={100}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 44 }}>
              <span style={{ fontSize: 14, color: billing === 'monthly' ? '#0f172a' : '#94a3b8', fontWeight: billing === 'monthly' ? 600 : 400, transition: 'color 0.2s' }}>Mensal</span>
              <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} style={{ width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: billing === 'annual' ? '#22c55e' : '#e2e8f0', position: 'relative', transition: 'background 0.3s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 4, left: billing === 'annual' ? 28 : 4, transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: billing === 'annual' ? '#0f172a' : '#94a3b8', fontWeight: billing === 'annual' ? 600 : 400, transition: 'color 0.2s' }}>Anual</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontWeight: 700, opacity: billing === 'annual' ? 1 : 0, transition: 'opacity 0.3s' }}>Economize R$ {priceMonthly * 12 - priceAnnual}</span>
              </div>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, maxWidth: 760, margin: '0 auto' }}>
            <FadeIn delay={100} direction="left">
              <PlanCard type="monthly" billing={billing} priceMonthly={priceMonthly} priceAnnual={priceAnnual}/>
            </FadeIn>
            <FadeIn delay={200} direction="right">
              <PlanCard type="annual" billing={billing} priceMonthly={priceMonthly} priceAnnual={priceAnnual}/>
            </FadeIn>
          </div>

          {/* Garantias */}
          <FadeIn delay={300}>
            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
              {[
                { icon: <RefreshCw size={18} color="#22c55e"/>, title: '7 dias de garantia', desc: 'Reembolso total sem perguntas' },
                { icon: <Shield size={18} color="#22c55e"/>, title: 'Pagamento seguro', desc: 'SSL + criptografia ponta a ponta' },
                { icon: <Zap size={18} color="#22c55e"/>, title: 'Cancele quando quiser', desc: 'Sem fidelidade nem taxa' },
              ].map(g => (
                <div key={g.title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{g.icon}</div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{g.title}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-pad" style={{ padding: '96px 48px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>FAQ</p>
            <h2 style={{ textAlign: 'center', fontSize: 38, fontWeight: 800, color: '#0f172a', margin: '0 0 48px' }}>Perguntas frequentes</h2>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((f, i) => (
              <FadeIn key={i} delay={i * 60}>
                <FaqItem q={f.q} a={f.a}/>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="section-pad" style={{ padding: '96px 48px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(34,197,94,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }}/>
        <FadeIn>
          <div style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🐷</div>
            <h2 style={{ color: '#fff', fontSize: 42, fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.5px' }}>Comece hoje, de graça</h2>
            <p style={{ color: '#64748b', fontSize: 16, margin: '0 0 36px', lineHeight: 1.75 }}>3 dias para testar tudo sem cartão. Depois escolha o plano que fizer mais sentido pra você.</p>
            <Link href="/assinar" className="btn-glow" style={{ padding: '16px 40px', borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 24px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Criar conta grátis <ArrowRight size={17}/>
            </Link>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 16 }}>Sem cartão · Cancele quando quiser · 7 dias de garantia</p>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '28px 48px', borderTop: '1px solid #1e293b', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 22 }}/>
          <span style={{ color: '#475569', fontSize: 13 }}>© 2025 Finora · Mais controle, menos planilhas</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Política de Privacidade', 'Termos de Uso', 'Suporte'].map(l => (
            <a key={l} href="#" style={{ color: '#475569', fontSize: 13, textDecoration: 'none' }}>{l}</a>
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
  const savings = priceMonthly * 12 - priceAnnual;
  const monthlyEquiv = (priceAnnual / 12).toFixed(2).replace('.', ',');
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', position: 'relative',
        border: isAnnual ? '2px solid #22c55e' : `2px solid ${hovered ? '#22c55e60' : '#e2e8f0'}`,
        background: isAnnual ? 'linear-gradient(160deg,#f0fdf4,#fff)' : '#fff',
        boxShadow: isAnnual ? '0 8px 40px rgba(34,197,94,0.15)' : hovered ? '0 8px 32px rgba(0,0,0,0.07)' : 'none',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-6px)' : 'none',
      }}
    >
      {isAnnual && (
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(34,197,94,0.4)' }}>
          <Star size={11} fill="#fff"/>MAIS POPULAR — Economize R$ {savings}
        </div>
      )}
      <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: isAnnual ? '#16a34a' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isAnnual ? 'Anual' : 'Mensal'}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{isAnnual ? `R$ ${priceAnnual}` : `R$ ${priceMonthly}`}</span>
        <span style={{ fontSize: 14, color: '#94a3b8', marginBottom: 5 }}>{isAnnual ? '/ano' : '/mês'}</span>
      </div>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: isAnnual ? '#16a34a' : '#94a3b8', fontWeight: isAnnual ? 500 : 400 }}>{isAnnual ? `≈ R$ ${monthlyEquiv}/mês · Economize R$ ${savings}` : 'Cancele quando quiser'}</p>
      <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        {PLAN_FEATURES.map((f) => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={10} color="#16a34a"/>
            </div>
            <span style={{ fontSize: 13, color: '#475569' }}>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={isAnnual ? '/assinar?plan=annual' : '/assinar?plan=monthly'} className="btn-glow" style={{ width: '100%', padding: '13px', borderRadius: 12, border: isAnnual ? 'none' : '2px solid #22c55e', background: isAnnual ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'transparent', color: isAnnual ? '#fff' : '#22c55e', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: isAnnual ? '0 4px 16px rgba(34,197,94,0.4)' : 'none', boxSizing: 'border-box' }}>
        {isAnnual ? <><Star size={14} fill="#fff"/>Assinar por R$ {priceAnnual}/ano</> : <>Assinar por R$ {priceMonthly}/mês</>}
      </Link>
    </div>
  );
}
