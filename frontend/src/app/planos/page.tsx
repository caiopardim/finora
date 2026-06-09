'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Check, Zap, Star, ArrowRight, LogIn } from 'lucide-react';
import { getSettings } from '@/lib/settings';

const FEATURES = [
  'Dashboard completo com gráficos',
  'Transações ilimitadas',
  'Contas e carteiras',
  'Metas financeiras',
  'Orçamento por categoria',
  'Agenda de compromissos',
  'Transações recorrentes',
  'Importar extrato CSV',
  'Relatórios e exportação',
  'Busca global (Cmd+K)',
  'Modo escuro',
  'Acesso pelo WhatsApp com IA',
];

export default function PlanosPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [MONTHLY_PRICE, setMonthlyPrice] = useState(29);
  const [ANNUAL_PRICE, setAnnualPrice]   = useState(199);

  const ANNUAL_MONTHLY_EQUIV = (ANNUAL_PRICE / 12).toFixed(2).replace('.', ',');
  const ANNUAL_SAVINGS = (MONTHLY_PRICE * 12) - ANNUAL_PRICE;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    getSettings().then(s => { setMonthlyPrice(s.price_monthly); setAnnualPrice(s.price_annual); });
  }, []);

  async function handleSubscribe(plan: 'monthly' | 'annual') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/auth/login?next=/planos'); return; }

    setLoading(plan);
    const res = await fetch('/api/payments/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan_type: plan }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      alert('Erro ao iniciar pagamento: ' + (data.error || 'Tente novamente'));
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)', fontFamily: 'Inter, system-ui, sans-serif', padding: '0 16px' }}>

      {/* Header */}
      <header style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Finora</span>
        </div>
        <button onClick={() => router.push(loggedIn ? '/dashboard' : '/auth/login')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <LogIn size={15}/>{loggedIn ? 'Ir para o dashboard' : 'Entrar'}
        </button>
      </header>

      {/* Hero */}
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '48px 0 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 99, padding: '6px 16px', marginBottom: 20 }}>
          <Zap size={14} color="#22c55e"/>
          <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>3 dias grátis · Sem cartão de crédito</span>
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          Controle total das suas<br/>finanças por menos de um café
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', margin: 0, lineHeight: 1.7 }}>
          Registre pelo WhatsApp, acompanhe no dashboard e tome decisões financeiras inteligentes.
        </p>
      </div>

      {/* Billing toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
        <span style={{ fontSize: 14, color: billing === 'monthly' ? '#fff' : '#64748b', fontWeight: billing === 'monthly' ? 600 : 400 }}>Mensal</span>
        <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} style={{ width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: billing === 'annual' ? '#22c55e' : '#334155', position: 'relative', transition: 'background 0.2s' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 4, left: billing === 'annual' ? 28 : 4, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}/>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: billing === 'annual' ? '#fff' : '#64748b', fontWeight: billing === 'annual' ? 600 : 400 }}>Anual</span>
          {billing === 'annual' && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#15803d', color: '#86efac', fontWeight: 700 }}>Economize R$ {ANNUAL_SAVINGS}</span>}
        </div>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 60 }}>

        {/* Monthly */}
        <div style={{ background: '#1e293b', borderRadius: 20, border: `2px solid ${billing === 'monthly' ? '#22c55e' : '#334155'}`, padding: 32, display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mensal</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1 }}>R$ {MONTHLY_PRICE}</span>
              <span style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>/mês</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>Cancele quando quiser</p>
          </div>

          <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={11} color="#86efac"/>
                </div>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>{f}</span>
              </li>
            ))}
          </ul>

          <button onClick={() => handleSubscribe('monthly')} disabled={!!loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #22c55e', background: 'transparent', color: '#22c55e', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
            {loading === 'monthly' ? 'Aguarde...' : <><ArrowRight size={16}/>Começar agora</>}
          </button>
        </div>

        {/* Annual — recommended */}
        <div style={{ background: 'linear-gradient(160deg,#052e16,#14532d)', borderRadius: 20, border: '2px solid #22c55e', padding: 32, display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 0 40px rgba(34,197,94,0.2)' }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={12}/> MAIS POPULAR — Economize R$ 149
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anual</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1 }}>R$ {ANNUAL_PRICE}</span>
              <span style={{ fontSize: 14, color: '#4ade80', marginBottom: 6 }}>/ano</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4ade80' }}>
              Equivale a R$ {ANNUAL_MONTHLY_EQUIV}/mês · Economize R$ {ANNUAL_SAVINGS}
            </p>
          </div>

          <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={11} color="#86efac"/>
                </div>
                <span style={{ fontSize: 14, color: '#dcfce7' }}>{f}</span>
              </li>
            ))}
          </ul>

          <button onClick={() => handleSubscribe('annual')} disabled={!!loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
            {loading === 'annual' ? 'Aguarde...' : <><Star size={16}/>Assinar por R$ {ANNUAL_PRICE}/ano</>}
          </button>
        </div>
      </div>

      {/* Trial note */}
      <div style={{ maxWidth: 600, margin: '0 auto 60px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
          🎉 <strong style={{ color: '#94a3b8' }}>3 dias grátis</strong> ao criar sua conta — sem precisar cadastrar cartão.<br/>
          Após o período gratuito, escolha o plano que preferir para continuar usando.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
          {['Cancele a qualquer momento', 'Pagamento 100% seguro', 'Suporte via WhatsApp'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} color="#22c55e"/>
              <span style={{ fontSize: 13, color: '#64748b' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
