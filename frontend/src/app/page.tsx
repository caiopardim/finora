'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Check, Star, ArrowRight, Zap } from 'lucide-react';

/* ── Animação de entrada ao scroll ── */
function useInView(threshold = 0.15) {
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
  const tx = direction === 'up' ? '0,32px' : direction === 'left' ? '-32px,0' : direction === 'right' ? '32px,0' : '0,0';
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

const FEATURES = [
  { icon: '💬', title: 'WhatsApp nativo', desc: 'Registre qualquer gasto sem abrir nenhum app. Só manda uma mensagem e pronto.', color: '#22c55e' },
  { icon: '🤖', title: 'IA inteligente', desc: 'GPT-4 interpreta suas mensagens, categoriza automaticamente e aprende com você.', color: '#6366f1' },
  { icon: '📊', title: 'Dashboard completo', desc: 'Gráficos, filtros, modo escuro, busca global e visão geral do seu dinheiro em tempo real.', color: '#f97316' },
  { icon: '⏰', title: 'Faturas e vencimentos', desc: 'Gerencie contas a pagar com alertas automáticos e marque como pago com swipe.', color: '#ef4444' },
  { icon: '🎯', title: 'Metas financeiras', desc: 'Defina objetivos com prazo e acompanhe o progresso com barra visual.', color: '#eab308' },
  { icon: '🏦', title: 'Múltiplas carteiras', desc: 'Conta corrente, poupança, cartão — tudo separado e com saldo atualizado.', color: '#06b6d4' },
  { icon: '🔁', title: 'Transações recorrentes', desc: 'Assinaturas e despesas fixas geradas automaticamente todo mês.', color: '#8b5cf6' },
  { icon: '📋', title: 'Orçamento por categoria', desc: 'Defina limites de gasto por categoria e receba alertas quando estiver no limite.', color: '#f43f5e' },
  { icon: '📁', title: 'Importar e exportar CSV', desc: 'Importe seu extrato bancário ou exporte seus dados quando quiser.', color: '#10b981' },
  { icon: '📅', title: 'Agenda financeira', desc: 'Visualize compromissos e vencimentos num calendário integrado.', color: '#f59e0b' },
  { icon: '📈', title: 'Relatórios detalhados', desc: 'Histórico completo, gráficos por período e insights do seu perfil financeiro.', color: '#3b82f6' },
  { icon: '🌙', title: 'Modo escuro + personalização', desc: 'Escolha a cor de destaque e o tema que mais combina com você.', color: '#64748b' },
];

const PLAN_FEATURES = [
  'Dashboard completo com gráficos',
  'Transações ilimitadas',
  'Contas e carteiras múltiplas',
  'Metas financeiras',
  'Orçamento por categoria',
  'Agenda de compromissos',
  'Transações recorrentes',
  'Importar extrato CSV',
  'Relatórios e exportação',
  'Busca global (Cmd+K)',
  'Modo escuro e personalização',
  'Acesso pelo WhatsApp com IA',
];

const TESTIMONIALS = [
  { name: 'Ana Paula', role: 'Autônoma', text: 'Finalmente parei de usar planilha. Em 2 semanas já sabia exatamente onde estava gastando mais.', avatar: 'A' },
  { name: 'Carlos M.', role: 'Empreendedor', text: 'O WhatsApp mudou tudo pra mim. Registro na hora que acontece, sem esquecer nada.', avatar: 'C' },
  { name: 'Fernanda L.', role: 'CLT + freela', text: 'As metas me ajudaram a juntar para a viagem em 6 meses. Recomendo demais!', avatar: 'F' },
];

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
    }, 30);
    return () => clearInterval(t);
  }, [visible, target]);
  return <span ref={ref as any}>{val}{suffix}</span>;
}

/* ── Feature card com hover ── */
function FeatureCard({ f, delay }: { f: typeof FEATURES[0]; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeIn delay={delay} direction="up">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? f.color + '10' : '#f8fafc',
          borderRadius: 16,
          border: `1.5px solid ${hovered ? f.color + '60' : '#e2e8f0'}`,
          padding: '24px',
          transition: 'all 0.25s ease',
          transform: hovered ? 'translateY(-4px)' : 'none',
          boxShadow: hovered ? `0 12px 32px ${f.color}20` : 'none',
          cursor: 'default',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 14, background: f.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14, transition: 'transform 0.25s', transform: hovered ? 'scale(1.15)' : 'scale(1)' }}>{f.icon}</div>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', margin: '0 0 6px' }}>{f.title}</p>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
      </div>
    </FadeIn>
  );
}

export default function Home() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* Partículas de fundo */
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    dur: 4 + Math.random() * 6,
    delay: Math.random() * 4,
  }));

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', color: '#0f172a', overflowX: 'hidden' }}>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bounce-in { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        .btn-glow:hover { box-shadow: 0 8px 32px rgba(34,197,94,0.55) !important; transform: translateY(-2px); }
        .btn-glow { transition: all 0.2s ease !important; }
        .nav-link:hover { color: #22c55e !important; }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>💰</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Finora</span>
        </div>
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="#funcionalidades" className="nav-link" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>Funcionalidades</a>
          <a href="#planos" className="nav-link" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>Planos</a>
          <Link href="/auth/login" style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }}>Login</Link>
          <Link href="/auth/login" className="btn-glow" style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>Começar grátis</Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', padding: '110px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

        {/* Partículas animadas */}
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: '#22c55e',
            opacity: 0.25,
            animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}/>
        ))}

        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%)', pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.7s ease',
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 99, padding: '6px 16px', marginBottom: 28 }}>
              {/* Pulse dot */}
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'block' }}/>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'pulse-ring 1.5s ease-out infinite' }}/>
              </span>
              <Zap size={13} color="#22c55e"/>
              <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>Trial grátis de 14 dias · Sem cartão de crédito</span>
            </div>
          </div>

          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
            transition: 'all 0.7s ease 0.1s',
          }}>
            <h1 style={{ color: '#fff', fontSize: 58, fontWeight: 800, margin: '0 0 20px', lineHeight: 1.08, letterSpacing: '-1.5px' }}>
              Mais controle,{' '}
              <span style={{
                backgroundImage: 'linear-gradient(90deg,#22c55e,#4ade80,#22c55e)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 3s linear infinite',
              }}>
                menos planilhas
              </span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 18, margin: '0 0 16px', lineHeight: 1.7 }}>
              Registre seus gastos pelo WhatsApp em linguagem natural. A IA organiza tudo e você acompanha no dashboard mais completo do mercado.
            </p>
            <p style={{ color: '#475569', fontSize: 15, margin: '0 0 44px' }}>
              Dashboard · Metas · Orçamento · Faturas · Recorrentes · Relatórios
            </p>
          </div>

          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
            transition: 'all 0.7s ease 0.2s',
            display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <Link href="/auth/login" className="btn-glow" style={{ padding: '16px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 24px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Começar grátis <ArrowRight size={17}/>
            </Link>
            <a href="#planos" style={{ padding: '16px 36px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 16, fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }}>
              Ver planos
            </a>
          </div>

          {/* Stats */}
          <div style={{
            opacity: heroVisible ? 1 : 0,
            transition: 'all 0.7s ease 0.35s',
            marginTop: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap',
          }}>
            {[
              { value: 14, suffix: ' dias', label: 'de trial grátis' },
              { value: 12, suffix: '+', label: 'funcionalidades' },
              { value: 29, suffix: ' R$', label: 'por mês' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 800, color: '#22c55e' }}>
                  <Counter target={s.value} suffix={s.suffix}/>
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" style={{ padding: '96px 48px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Funcionalidades</p>
            <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Tudo que você precisa</h2>
            <p style={{ textAlign: 'center', fontSize: 16, color: '#64748b', margin: '0 0 56px' }}>Cada detalhe pensado para simplificar sua vida financeira</p>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} delay={i * 60}/>)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '96px 48px', background: 'linear-gradient(160deg,#0f172a,#1e293b)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(34,197,94,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px' }}/>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <FadeIn>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Como funciona</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 56px' }}>Simples assim</h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32 }}>
            {[
              { step: '1', icon: '📱', title: 'Manda uma mensagem', desc: '"Gastei R$ 45 no mercado" — só isso.' },
              { step: '2', icon: '🤖', title: 'A IA processa', desc: 'Categoriza, registra e confirma na hora.' },
              { step: '3', icon: '📊', title: 'Você acompanha', desc: 'Dashboard atualizado em tempo real.' },
              { step: '4', icon: '🎯', title: 'Alcança seus objetivos', desc: 'Metas, orçamentos e relatórios inteligentes.' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 120} direction="up">
                <div style={{ animation: `float ${5 + i}s ease-in-out ${i * 0.5}s infinite` }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#22c55e', margin: '0 auto 16px' }}>{s.step}</div>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: '0 0 8px' }}>{s.title}</p>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '96px 48px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Depoimentos</p>
            <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 48px' }}>Quem já usa, aprova</h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 120} direction="up">
                <TestimonialCard t={t}/>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" style={{ padding: '96px 48px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Planos</p>
            <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Simples e transparente</h2>
            <p style={{ textAlign: 'center', fontSize: 16, color: '#64748b', margin: '0 0 36px' }}>14 dias grátis, sem cartão. Depois escolha o plano.</p>
          </FadeIn>

          {/* Toggle */}
          <FadeIn delay={100}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
              <span style={{ fontSize: 14, color: billing === 'monthly' ? '#0f172a' : '#94a3b8', fontWeight: billing === 'monthly' ? 600 : 400, transition: 'color 0.2s' }}>Mensal</span>
              <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} style={{ width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: billing === 'annual' ? '#22c55e' : '#e2e8f0', position: 'relative', transition: 'background 0.3s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 4, left: billing === 'annual' ? 28 : 4, transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: billing === 'annual' ? '#0f172a' : '#94a3b8', fontWeight: billing === 'annual' ? 600 : 400, transition: 'color 0.2s' }}>Anual</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontWeight: 700, opacity: billing === 'annual' ? 1 : 0, transition: 'opacity 0.3s' }}>2 meses grátis</span>
              </div>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, maxWidth: 760, margin: '0 auto' }}>
            <FadeIn delay={100} direction="left">
              <PlanCard type="monthly" billing={billing}/>
            </FadeIn>
            <FadeIn delay={200} direction="right">
              <PlanCard type="annual" billing={billing}/>
            </FadeIn>
          </div>

          <FadeIn delay={300}>
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
              {['14 dias grátis sem cartão', 'Cancele a qualquer momento', 'Pagamento 100% seguro'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} color="#22c55e"/>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{t}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: '80px 48px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(34,197,94,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}/>
        <FadeIn>
          <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
            <h2 style={{ color: '#fff', fontSize: 40, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.5px' }}>Comece hoje, de graça</h2>
            <p style={{ color: '#64748b', fontSize: 16, margin: '0 0 36px', lineHeight: 1.7 }}>14 dias para testar tudo, sem precisar de cartão. Depois escolha o plano que fizer mais sentido pra você.</p>
            <Link href="/auth/login" className="btn-glow" style={{ padding: '16px 40px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 24px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Criar conta grátis <ArrowRight size={17}/>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 48px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💰</div>
          <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Finora — Mais controle, menos planilhas</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Política de Privacidade', 'Termos de Uso', 'Suporte'].map(l => (
            <a key={l} href="#" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

/* ── Componentes auxiliares ── */
function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${hovered ? '#22c55e40' : '#e2e8f0'}`, padding: 28, transition: 'all 0.25s', transform: hovered ? 'translateY(-4px)' : 'none', boxShadow: hovered ? '0 12px 32px rgba(34,197,94,0.1)' : '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div style={{ display: 'flex', marginBottom: 12 }}>
        {[1,2,3,4,5].map(s => <Star key={s} size={14} color="#f59e0b" fill="#f59e0b"/>)}
      </div>
      <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, margin: '0 0 20px' }}>"{t.text}"</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>{t.avatar}</div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{t.name}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{t.role}</p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ type, billing }: { type: 'monthly' | 'annual'; billing: 'monthly' | 'annual' }) {
  const [hovered, setHovered] = useState(false);
  const isAnnual = type === 'annual';
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        border: isAnnual ? '2px solid #22c55e' : `2px solid ${hovered ? '#22c55e60' : '#e2e8f0'}`,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: isAnnual ? 'linear-gradient(160deg,#f0fdf4,#fff)' : '#fff',
        boxShadow: isAnnual ? '0 8px 40px rgba(34,197,94,0.15)' : hovered ? '0 8px 32px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-6px)' : 'none',
      }}
    >
      {isAnnual && (
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(34,197,94,0.4)', animation: 'bounce-in 0.5s ease' }}>
          <Star size={12} fill="#fff"/>MAIS POPULAR — 2 meses grátis
        </div>
      )}
      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: isAnnual ? '#16a34a' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isAnnual ? 'Anual' : 'Mensal'}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', lineHeight: 1, transition: 'all 0.3s' }}>{isAnnual ? 'R$ 199' : 'R$ 29'}</span>
        <span style={{ fontSize: 14, color: '#94a3b8', marginBottom: 6 }}>{isAnnual ? '/ano' : '/mês'}</span>
      </div>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: isAnnual ? '#16a34a' : '#94a3b8', fontWeight: isAnnual ? 500 : 400 }}>{isAnnual ? '≈ R$ 16,58/mês · Economize R$ 149' : 'Cancele quando quiser'}</p>
      <ul style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {PLAN_FEATURES.map((f, i) => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0, animation: `bounce-in 0.4s ease ${i * 40}ms forwards` }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={10} color="#16a34a"/>
            </div>
            <span style={{ fontSize: 14, color: '#475569' }}>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/auth/login" className="btn-glow" style={{ width: '100%', padding: '14px', borderRadius: 12, border: isAnnual ? 'none' : '2px solid #22c55e', background: isAnnual ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'transparent', color: isAnnual ? '#fff' : '#22c55e', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: isAnnual ? '0 4px 16px rgba(34,197,94,0.4)' : 'none', boxSizing: 'border-box' }}>
        {isAnnual ? <><Star size={15} fill="#fff"/>Assinar por R$ 199/ano</> : <><ArrowRight size={16}/>Começar trial grátis</>}
      </Link>
    </div>
  );
}
