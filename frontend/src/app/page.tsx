'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Star, ArrowRight, Zap } from 'lucide-react';

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

export default function Home() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Finora</span>
        </div>
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="#funcionalidades" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Funcionalidades</a>
          <a href="#planos" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Planos</a>
          <Link href="/auth/login" style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Login</Link>
          <Link href="/auth/login" style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>Começar grátis</Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', padding: '100px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 28 }}>
            <Zap size={13} color="#22c55e"/>
            <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>Trial grátis de 14 dias · Sem cartão de crédito</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 56, fontWeight: 800, margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-1px' }}>
            Mais controle,<br/>menos planilhas
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 18, margin: '0 0 16px', lineHeight: 1.7 }}>
            Registre seus gastos pelo WhatsApp em linguagem natural. A IA organiza tudo e você acompanha no dashboard mais completo do mercado.
          </p>
          <p style={{ color: '#475569', fontSize: 15, margin: '0 0 40px' }}>
            Dashboard · Metas · Orçamento · Faturas · Recorrentes · Relatórios · e muito mais
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/login" style={{ padding: '16px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 24px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Começar grátis <ArrowRight size={17}/>
            </Link>
            <a href="#planos" style={{ padding: '16px 36px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
              Ver planos
            </a>
          </div>
          {/* Social proof */}
          <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { value: '14 dias', label: 'de trial grátis' },
              { value: '100%', label: 'via WhatsApp' },
              { value: 'R$ 29/mês', label: 'plano mensal' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: '#22c55e' }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" style={{ padding: '96px 48px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Funcionalidades</p>
          <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Tudo que você precisa</h2>
          <p style={{ textAlign: 'center', fontSize: 16, color: '#64748b', margin: '0 0 56px' }}>Cada detalhe pensado para simplificar sua vida financeira</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px', transition: 'all 0.2s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: f.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>{f.icon}</div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', margin: '0 0 6px' }}>{f.title}</p>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '96px 48px', background: 'linear-gradient(160deg,#0f172a,#1e293b)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Como funciona</p>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 56px' }}>Simples assim</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 32 }}>
            {[
              { step: '1', icon: '📱', title: 'Manda uma mensagem', desc: '"Gastei R$ 45 no mercado" — só isso.' },
              { step: '2', icon: '🤖', title: 'A IA processa', desc: 'Categoriza, registra e confirma na hora.' },
              { step: '3', icon: '📊', title: 'Você acompanha', desc: 'Dashboard atualizado em tempo real.' },
              { step: '4', icon: '🎯', title: 'Alcança seus objetivos', desc: 'Metas, orçamentos e relatórios inteligentes.' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#22c55e', margin: '0 auto 16px' }}>{s.step}</div>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: '0 0 8px' }}>{s.title}</p>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '96px 48px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Depoimentos</p>
          <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 48px' }}>Quem já usa, aprova</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 28 }}>
                <div style={{ display: 'flex', marginBottom: 6 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} color="#f59e0b" fill="#f59e0b"/>)}
                </div>
                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, margin: '0 0 20px' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{t.avatar}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{t.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" style={{ padding: '96px 48px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Planos</p>
          <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Simples e transparente</h2>
          <p style={{ textAlign: 'center', fontSize: 16, color: '#64748b', margin: '0 0 36px' }}>14 dias grátis, sem cartão. Depois escolha o plano.</p>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 14, color: billing === 'monthly' ? '#0f172a' : '#94a3b8', fontWeight: billing === 'monthly' ? 600 : 400 }}>Mensal</span>
            <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} style={{ width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: billing === 'annual' ? '#22c55e' : '#e2e8f0', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 4, left: billing === 'annual' ? 28 : 4, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: billing === 'annual' ? '#0f172a' : '#94a3b8', fontWeight: billing === 'annual' ? 600 : 400 }}>Anual</span>
              {billing === 'annual' && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>2 meses grátis</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, maxWidth: 760, margin: '0 auto' }}>
            {/* Monthly */}
            <div style={{ borderRadius: 20, border: '2px solid #e2e8f0', padding: 32, display: 'flex', flexDirection: 'column' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mensal</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>R$ 29</span>
                <span style={{ fontSize: 14, color: '#94a3b8', marginBottom: 6 }}>/mês</span>
              </div>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>Cancele quando quiser</p>
              <ul style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {PLAN_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color="#16a34a"/>
                    </div>
                    <span style={{ fontSize: 14, color: '#475569' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/login" style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #22c55e', background: 'transparent', color: '#22c55e', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box' }}>
                <ArrowRight size={16}/>Começar trial grátis
              </Link>
            </div>

            {/* Annual */}
            <div style={{ borderRadius: 20, border: '2px solid #22c55e', padding: 32, display: 'flex', flexDirection: 'column', position: 'relative', background: 'linear-gradient(160deg,#f0fdf4,#fff)', boxShadow: '0 8px 40px rgba(34,197,94,0.15)' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={12} fill="#fff"/>MAIS POPULAR — 2 meses grátis
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anual</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>R$ 199</span>
                <span style={{ fontSize: 14, color: '#94a3b8', marginBottom: 6 }}>/ano</span>
              </div>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#16a34a', fontWeight: 500 }}>≈ R$ 16,58/mês · Economize R$ 149</p>
              <ul style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {PLAN_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color="#16a34a"/>
                    </div>
                    <span style={{ fontSize: 14, color: '#475569' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/login" style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(34,197,94,0.4)', boxSizing: 'border-box' }}>
                <Star size={15} fill="#fff"/>Assinar por R$ 199/ano
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            {['14 dias grátis sem cartão', 'Cancele a qualquer momento', 'Pagamento 100% seguro'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} color="#22c55e"/>
                <span style={{ fontSize: 13, color: '#64748b' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: '80px 48px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 36, fontWeight: 800, margin: '0 0 16px' }}>Comece hoje, de graça</h2>
          <p style={{ color: '#64748b', fontSize: 16, margin: '0 0 32px', lineHeight: 1.7 }}>14 dias para testar tudo, sem precisar de cartão. Depois escolha o plano que fizer mais sentido pra você.</p>
          <Link href="/auth/login" style={{ padding: '16px 40px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 24px rgba(34,197,94,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Criar conta grátis <ArrowRight size={17}/>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 48px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💰</div>
          <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Finora — Mais controle, menos planilhas</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Política de Privacidade', 'Termos de Uso', 'Suporte'].map(l => (
            <a key={l} href="#" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
