'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Check, ArrowRight, Star, Copy, CheckCircle, CreditCard, Smartphone, Loader2, Eye, EyeOff } from 'lucide-react';

const PLANS = {
  monthly: { label: 'Mensal', price: 29, period: '/mês', desc: 'Cancele quando quiser' },
  annual:  { label: 'Anual',  price: 199, period: '/ano', desc: '≈ R$ 16,58/mês · Economize R$ 149' },
};

function AssinaturaContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [plan, setPlan]       = useState<'monthly' | 'annual'>(params.get('plan') === 'monthly' ? 'monthly' : 'annual');
  const [step, setStep]       = useState<'plan' | 'register' | 'payment' | 'pix' | 'done'>('plan');
  const [method, setMethod]   = useState<'card' | 'pix' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPass, setShowPass] = useState(false);

  // Form
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');

  // PIX
  const [pixQr, setPixQr]         = useState('');
  const [pixCode, setPixCode]     = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const [pixChecking, setPixChecking] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setEmail(session.user.email || '');
        setStep('payment');
      }
    });
  }, []);

  async function handleRegister() {
    setError('');
    if (!name || !email || !pass) { setError('Preencha todos os campos'); return; }
    if (pass.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return; }

    setLoading(true);
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { name } },
    });
    if (signUpErr) {
      // Try sign in if already exists
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (signInErr) { setError('E-mail já cadastrado ou senha incorreta'); setLoading(false); return; }
    } else {
      // Sign in after signup
      await supabase.auth.signInWithPassword({ email, password: pass });
    }
    setLoading(false);
    setStep('payment');
  }

  async function handleCard() {
    setLoading(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/payments/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ plan_type: plan, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.init_point) window.location.href = data.init_point;
    else setError(data.error || 'Erro ao iniciar pagamento');
  }

  async function handlePix() {
    setLoading(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/payments/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, plan_type: plan, user_id: session?.user?.id }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.qr_code) {
      setPixCode(data.qr_code);
      setPixQr(data.qr_code_base64 ? `data:image/png;base64,${data.qr_code_base64}` : '');
      setPaymentId(data.payment_id);
      setStep('pix');
    } else {
      setError(data.error || 'Erro ao gerar PIX');
    }
  }

  // Poll payment status
  useEffect(() => {
    if (step !== 'pix' || !paymentId) return;
    const interval = setInterval(async () => {
      setPixChecking(true);
      const res = await fetch(`/api/payments/pix/status?id=${paymentId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.status === 'approved') {
          clearInterval(interval);
          setStep('done');
        }
      }
      setPixChecking(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [step, paymentId]);

  const p = PLANS[plan];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f172a,#1e293b)', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Finora</span>
      </Link>

      {/* Steps indicator */}
      {step !== 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          {(['plan', 'register', 'payment'] as const).map((s, i) => {
            const steps = ['plan', 'register', 'payment', 'pix'];
            const current = steps.indexOf(step);
            const done = current > i;
            const active = current === i;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#22c55e' : active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)', border: `2px solid ${done || active ? '#22c55e' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: done || active ? '#22c55e' : '#475569', transition: 'all 0.3s' }}>
                  {done ? <Check size={13}/> : i + 1}
                </div>
                <span style={{ fontSize: 12, color: active ? '#fff' : '#475569', fontWeight: active ? 600 : 400 }}>
                  {s === 'plan' ? 'Plano' : s === 'register' ? 'Cadastro' : 'Pagamento'}
                </span>
                {i < 2 && <div style={{ width: 32, height: 1, background: done ? '#22c55e' : 'rgba(255,255,255,0.1)' }}/>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* ── STEP: PLANO ── */}
        {step === 'plan' && (
          <div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>Escolha seu plano</h1>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', margin: '0 0 28px' }}>14 dias grátis para testar tudo</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(['annual', 'monthly'] as const).map(pt => (
                <button key={pt} onClick={() => setPlan(pt)} style={{ padding: 20, borderRadius: 14, border: `2px solid ${plan === pt ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: plan === pt ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left', position: 'relative', transition: 'all 0.2s' }}>
                  {pt === 'annual' && <div style={{ position: 'absolute', top: -10, right: 16, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>MAIS POPULAR</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#fff', fontSize: 15 }}>{PLANS[pt].label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: pt === 'annual' ? '#4ade80' : '#64748b' }}>{PLANS[pt].desc}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>R$ {PLANS[pt].price}</span>
                      <span style={{ fontSize: 13, color: '#64748b' }}>{PLANS[pt].period}</span>
                    </div>
                  </div>
                  {plan === pt && (
                    <div style={{ position: 'absolute', top: 12, left: 12, width: 18, height: 18, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} color="#fff"/>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button onClick={() => setStep('register')} style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
              Continuar <ArrowRight size={17}/>
            </button>

            <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 13, color: '#475569' }}>
              Já tem conta? <Link href="/auth/login" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Fazer login</Link>
            </p>
          </div>
        )}

        {/* ── STEP: CADASTRO ── */}
        {step === 'register' && (
          <div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>Crie sua conta</h1>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', margin: '0 0 28px' }}>Rápido, só leva 30 segundos</p>

            {/* Resumo do plano */}
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>Plano {p.label}</span>
              <div>
                <span style={{ color: '#fff', fontWeight: 700 }}>R$ {p.price}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{p.period}</span>
                <button onClick={() => setStep('plan')} style={{ marginLeft: 10, fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>trocar</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" style={inputStyle}/>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" type="email" style={inputStyle}/>
              <div style={{ position: 'relative' }}>
                <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Crie uma senha" type={showPass ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 44 }}/>
                <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, margin: '12px 0 0' }}>{error}</p>}

            <button onClick={handleRegister} disabled={loading} style={{ width: '100%', marginTop: 20, padding: 16, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }}/> : <>Continuar para pagamento <ArrowRight size={17}/></>}
            </button>

            <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 13, color: '#475569' }}>
              Já tem conta? <Link href="/auth/login" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Fazer login</Link>
            </p>
          </div>
        )}

        {/* ── STEP: PAGAMENTO ── */}
        {step === 'payment' && (
          <div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>Como quer pagar?</h1>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', margin: '0 0 28px' }}>Pagamento 100% seguro via Mercado Pago</p>

            {/* Resumo */}
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: 14 }}>Plano {p.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#4ade80' }}>{p.desc}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>R$ {p.price}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{p.period}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Card */}
              <button onClick={() => { setMethod('card'); handleCard(); }} disabled={loading} style={{ padding: 20, borderRadius: 14, border: `2px solid ${method === 'card' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: method === 'card' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s', textAlign: 'left' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={22} color="#818cf8"/>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#fff', fontSize: 15 }}>Cartão de crédito</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Visa, Mastercard, Elo e mais · Recorrente automático</p>
                </div>
                {loading && method === 'card' ? <Loader2 size={18} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }}/> : <ArrowRight size={18} color="#475569"/>}
              </button>

              {/* PIX */}
              <button onClick={() => { setMethod('pix'); handlePix(); }} disabled={loading} style={{ padding: 20, borderRadius: 14, border: `2px solid ${method === 'pix' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: method === 'pix' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s', textAlign: 'left' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24 }}>
                  ⚡
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#fff', fontSize: 15 }}>PIX</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Aprovação imediata · Escaneie o QR code</p>
                </div>
                {loading && method === 'pix' ? <Loader2 size={18} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }}/> : <ArrowRight size={18} color="#475569"/>}
              </button>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, margin: '14px 0 0', textAlign: 'center' }}>{error}</p>}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
              {['Ambiente seguro', 'Mercado Pago', 'Dados criptografados'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={12} color="#22c55e"/>
                  <span style={{ fontSize: 11, color: '#475569' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: PIX QR CODE ── */}
        {step === 'pix' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>⚡</div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Escaneie o QR Code PIX</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px' }}>Abra o app do seu banco e escaneie o código abaixo</p>

            {/* QR */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 20, display: 'inline-block', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              {pixQr ? (
                <img src={pixQr} alt="QR Code PIX" style={{ width: 200, height: 200, display: 'block' }}/>
              ) : (
                <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>Carregando QR...</div>
              )}
            </div>

            {/* Copia e cola */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'left' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIX Copia e Cola</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{pixCode}</p>
                <button onClick={() => { navigator.clipboard.writeText(pixCode); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); }} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: pixCopied ? '#22c55e' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, transition: 'all 0.2s' }}>
                  {pixCopied ? <><Check size={12}/>Copiado!</> : <><Copy size={12}/>Copiar</>}
                </button>
              </div>
            </div>

            {/* Valor */}
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#4ade80' }}>
                Valor: <strong>R$ {p.price}{p.period}</strong> · Plano {p.label}
              </p>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
              {pixChecking
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/>Aguardando pagamento...</>
                : <>⏳ Verificando pagamento automaticamente...</>}
            </div>

            <p style={{ margin: '16px 0 0', fontSize: 12, color: '#475569' }}>O acesso é liberado automaticamente após a confirmação do PIX</p>
          </div>
        )}

        {/* ── STEP: CONCLUÍDO ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '3px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'bounce-in 0.5s ease' }}>
              <CheckCircle size={36} color="#22c55e"/>
            </div>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: '0 0 10px' }}>Pagamento confirmado! 🎉</h1>
            <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 32px', lineHeight: 1.7 }}>
              Seu plano <strong style={{ color: '#4ade80' }}>{p.label}</strong> está ativo.<br/>
              Bem-vindo ao Finora!
            </p>
            <button onClick={() => router.push('/dashboard')} style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
              Acessar meu dashboard <ArrowRight size={17}/>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce-in { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 16px',
  borderRadius: 10,
  border: '1.5px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

export default function AssinaturaPage() {
  return (
    <Suspense>
      <AssinaturaContent/>
    </Suspense>
  );
}
