'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Check, ArrowRight, ArrowLeft, Copy, CheckCircle, CreditCard, Loader2, Eye, EyeOff } from 'lucide-react';
import { getSettings } from '@/lib/settings';

declare global {
  interface Window { MercadoPago: any; }
}

function AssinaturaContent() {
  const router = useRouter();
  const [prices, setPrices] = useState({ monthly: 29, annual: 199 });

  useEffect(() => {
    getSettings().then(s => setPrices({ monthly: s.price_monthly, annual: s.price_annual }));
  }, []);

  const PLANS = {
    monthly: { label: 'Mensal', price: prices.monthly, period: '/mês', desc: 'Cancele quando quiser' },
    annual:  { label: 'Anual',  price: prices.annual,  period: '/ano', desc: `≈ R$ ${(prices.annual/12).toFixed(2).replace('.',',')}/mês · Economize R$ ${(prices.monthly*12-prices.annual).toFixed(2).replace('.',',')}` },
  };
  const params = useSearchParams();

  const [plan, setPlan]     = useState<'monthly' | 'annual'>(params.get('plan') === 'monthly' ? 'monthly' : 'annual');
  const [step, setStep]     = useState<'plan' | 'register' | 'payment' | 'pix' | 'card' | 'done'>('plan');
  const [method, setMethod] = useState<'card' | 'pix' | null>(null);
  const brickControllerRef  = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showPass, setShowPass] = useState(false);

  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [phone, setPhone]   = useState('');

  const [pixQr, setPixQr]       = useState('');
  const [pixCode, setPixCode]   = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const [pixChecking, setPixChecking] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setEmail(session.user.email || ''); setStep('payment'); }
    });
  }, []);

  async function handleRegister() {
    setError('');
    if (!name || !email || !pass || !phone) { setError('Preencha todos os campos'); return; }
    if (pass.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return; }
    // Normalize phone: keep only digits, add 55 if needed
    const rawPhone = phone.replace(/\D/g, '');
    const normalizedPhone = rawPhone.startsWith('55') ? rawPhone : '55' + rawPhone;
    if (normalizedPhone.length < 12) { setError('Número de WhatsApp inválido'); return; }
    setLoading(true);
    const { error: signUpErr } = await supabase.auth.signUp({ email, password: pass, options: { data: { name } } });
    if (signUpErr) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (signInErr) { setError('E-mail já cadastrado ou senha incorreta'); setLoading(false); return; }
    } else {
      await supabase.auth.signInWithPassword({ email, password: pass });
    }
    // Save phone to profile
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ phone: normalizedPhone, name }).eq('id', session.user.id);
    }
    setLoading(false);
    setStep('payment');
  }

  function handleCard() {
    setError('');
    setStep('card');
  }

  async function handlePix() {
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, plan_type: plan, user_id: session?.user?.id }),
      });
      const data = await res.json();
      if (data.qr_code) {
        setPixCode(data.qr_code);
        setPixQr(data.qr_code_base64 ? `data:image/png;base64,${data.qr_code_base64}` : '');
        setPaymentId(data.payment_id);
        setStep('pix');
      } else {
        setError(data.error || 'Erro ao gerar PIX');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Load MP Bricks when entering card step
  useEffect(() => {
    if (step !== 'card') return;

    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '';

    async function initBrick() {
      // Load MP SDK if not loaded yet
      if (!window.MercadoPago) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load MP SDK'));
          document.head.appendChild(script);
        });
      }

      // Destroy previous instance if any
      if (brickControllerRef.current) {
        await brickControllerRef.current.unmount();
        brickControllerRef.current = null;
      }

      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      const { data: { session } } = await supabase.auth.getSession();

      brickControllerRef.current = await bricksBuilder.create('cardPayment', 'mp-card-brick', {
        initialization: {
          amount: PLANS[plan].price,
          payer: { email: email || session?.user?.email || '' },
        },
        customization: {
          visual: {
            style: {
              theme: 'dark',
              customVariables: {
                baseColor: '#22c55e',
                borderRadiusFull: '8px',
              },
            },
          },
          paymentMethods: { maxInstallments: 1 },
        },
        callbacks: {
          onReady: () => {},
          onError: (err: any) => {
            console.error('Brick error:', err);
            setError('Erro ao carregar formulário de cartão.');
          },
          onSubmit: async (formData: any) => {
            setLoading(true); setError('');
            try {
              const { data: { session } } = await supabase.auth.getSession();

              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 30000);

              const res = await fetch('/api/payments/card', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                  'Content-Type': 'application/json',
                  ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({ plan_type: plan, card_token: formData.token }),
              });
              clearTimeout(timeout);

              const data = await res.json();
              if (data.ok) {
                if (brickControllerRef.current) {
                  try { await brickControllerRef.current.unmount(); } catch {}
                  brickControllerRef.current = null;
                }
                setStep('done');
              } else {
                setError(data.error || 'Erro ao processar pagamento. Verifique os dados do cartão.');
              }
            } catch (err: any) {
              if (err?.name === 'AbortError') {
                setError('Tempo limite excedido. Tente novamente.');
              } else {
                setError('Erro de conexão. Tente novamente.');
              }
            } finally {
              setLoading(false);
            }
          },
        },
      });
    }

    // Wait one tick so the DOM renders the brick container
    const timer = setTimeout(() => {
      initBrick().catch(err => {
        console.error(err);
        setError('Erro ao carregar formulário de cartão.');
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (brickControllerRef.current) {
        brickControllerRef.current.unmount().catch(() => {});
        brickControllerRef.current = null;
      }
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== 'pix' || !paymentId) return;
    const interval = setInterval(async () => {
      setPixChecking(true);
      const res = await fetch(`/api/payments/pix/status?id=${paymentId}`);
      if (res.ok) { const d = await res.json(); if (d.status === 'approved') { clearInterval(interval); setStep('done'); } }
      setPixChecking(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [step, paymentId]);

  const p = PLANS[plan];
  const stepIndex = { plan: 0, register: 1, payment: 2, pix: 2, card: 2, done: 3 }[step];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f172a,#1e293b)', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 48px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce-in { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        * { box-sizing: border-box; }
      `}</style>

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', marginBottom: 28 }}>
        <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 46 }}/>
      </Link>

      {/* Steps */}
      {step !== 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          {(['Plano', 'Cadastro', 'Pagamento'] as const).map((label, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? '#22c55e' : active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)', border: `2px solid ${done || active ? '#22c55e' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: done || active ? '#22c55e' : '#475569' }}>
                  {done ? <Check size={12}/> : i + 1}
                </div>
                <span style={{ fontSize: 12, color: active ? '#fff' : '#64748b', fontWeight: active ? 600 : 400 }}>{label}</span>
                {i < 2 && <div style={{ width: 24, height: 1, background: done ? '#22c55e' : 'rgba(255,255,255,0.1)' }}/>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* PLANO */}
        {step === 'plan' && (
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px', textAlign: 'center' }}>Escolha seu plano</h1>
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', margin: '0 0 24px' }}>Garantia de 7 dias</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {(['annual', 'monthly'] as const).map(pt => (
                <button key={pt} onClick={() => setPlan(pt)} style={{ padding: '18px 16px', borderRadius: 14, border: `2px solid ${plan === pt ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: plan === pt ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left', position: 'relative', transition: 'all 0.2s', width: '100%' }}>
                  {pt === 'annual' && <div style={{ position: 'absolute', top: -10, right: 14, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>MAIS POPULAR</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#fff', fontSize: 15 }}>{PLANS[pt].label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: pt === 'annual' ? '#4ade80' : '#94a3b8' }}>{PLANS[pt].desc}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>R$ {Number(PLANS[pt].price).toFixed(2).replace('.',',')}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{PLANS[pt].period}</span>
                    </div>
                  </div>
                  {plan === pt && <div style={{ position: 'absolute', top: 10, left: 10, width: 16, height: 16, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={9} color="#fff"/></div>}
                </button>
              ))}
            </div>

            <button onClick={() => setStep('register')} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
              Continuar <ArrowRight size={16}/>
            </button>
            <p style={{ textAlign: 'center', margin: '14px 0 0', fontSize: 13, color: '#475569' }}>
              Já tem conta? <Link href="/auth/login" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Fazer login</Link>
            </p>
          </div>
        )}

        {/* CADASTRO */}
        {step === 'register' && (
          <div>
            <button onClick={() => setStep('plan')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '0 0 16px', fontWeight: 500 }}>
              <ArrowLeft size={14}/> Voltar
            </button>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px', textAlign: 'center' }}>Crie sua conta</h1>
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: '0 0 20px' }}>Rápido, só leva 30 segundos</p>

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>Plano {p.label} · R$ {Number(p.price).toFixed(2).replace('.',',')}{p.period}</span>
              <button onClick={() => setStep('plan')} style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>trocar</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" style={inputStyle}/>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" type="email" style={inputStyle}/>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>📱</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp com DDD (ex: 62 99999-9999)" type="tel" style={{ ...inputStyle, paddingLeft: 40 }}/>
              </div>
              <div style={{ position: 'relative' }}>
                <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Crie uma senha (mín. 6 caracteres)" type={showPass ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 44 }}/>
                <button onClick={() => setShowPass(v => !v)} type="button" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, margin: '10px 0 0' }}>{error}</p>}

            <button onClick={handleRegister} disabled={loading} style={{ width: '100%', marginTop: 18, padding: 15, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
              {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }}/> : <>Continuar para pagamento <ArrowRight size={16}/></>}
            </button>

            <p style={{ textAlign: 'center', margin: '14px 0 0', fontSize: 13, color: '#475569' }}>
              Já tem conta? <Link href="/auth/login" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Fazer login</Link>
            </p>
          </div>
        )}

        {/* PAGAMENTO */}
        {step === 'payment' && (
          <div>
            <button onClick={() => setStep('register')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '0 0 16px', fontWeight: 500 }}>
              <ArrowLeft size={14}/> Voltar
            </button>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px', textAlign: 'center' }}>Cadastre sua forma de pagamento</h1>
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: '0 0 12px' }}>Pagamento 100% seguro via Mercado Pago</p>

            {/* Trial notice */}
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <p style={{ margin: 0, fontSize: 13, color: '#fbbf24', lineHeight: 1.5 }}>
                <strong>Garantia de 7 dias.</strong> Se não ficar satisfeito, devolvemos 100% do valor pago, sem burocracia.
              </p>
            </div>

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: 14 }}>Plano {p.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#4ade80' }}>{p.desc}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>R$ {Number(p.price).toFixed(2).replace('.',',')}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{p.period}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleCard} disabled={loading} style={{ padding: '16px 14px', borderRadius: 14, border: `2px solid ${method === 'card' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: method === 'card' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={20} color="#818cf8"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#fff', fontSize: 14 }}>Cartão de crédito</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Visa, Mastercard, Elo · Recorrente automático</p>
                </div>
                {loading && method === 'card' ? <Loader2 size={17} color="#22c55e" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}/> : <ArrowRight size={16} color="#475569"/>}
              </button>

              {plan === 'annual' && (
                <button onClick={() => { setMethod('pix'); handlePix(); }} disabled={loading} style={{ padding: '16px 14px', borderRadius: 14, border: `2px solid ${method === 'pix' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: method === 'pix' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', textAlign: 'left', width: '100%' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>⚡</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#fff', fontSize: 14 }}>PIX</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Aprovação imediata · Escaneie o QR code</p>
                  </div>
                  {loading && method === 'pix' ? <Loader2 size={17} color="#22c55e" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}/> : <ArrowRight size={16} color="#475569"/>}
                </button>
              )}
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, margin: '12px 0 0', textAlign: 'center' }}>{error}</p>}

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              {['Ambiente seguro', 'Mercado Pago', 'Dados criptografados'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={11} color="#22c55e"/>
                  <span style={{ fontSize: 11, color: '#475569' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CARTÃO — MP Brick */}
        {step === 'card' && (
          <div>
            <button onClick={() => { setStep('payment'); setMethod(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '0 0 16px', fontWeight: 500 }}>
              <ArrowLeft size={14}/> Voltar
            </button>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 4px', textAlign: 'center' }}>Dados do cartão</h1>
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: '0 0 20px' }}>Pagamento seguro via Mercado Pago</p>

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: 14 }}>Plano {p.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#4ade80' }}>{p.desc}</p>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>R$ {Number(p.price).toFixed(2).replace('.',',')}</span>
            </div>

            {/* MP Card Brick container */}
            <div id="mp-card-brick" style={{ minHeight: 320 }}/>

            {error && <p style={{ color: '#f87171', fontSize: 13, margin: '12px 0 0', textAlign: 'center' }}>{error}</p>}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <Loader2 size={20} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }}/>
              </div>
            )}
          </div>
        )}

        {/* PIX QR CODE */}
        {step === 'pix' && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setStep('payment')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '0 0 16px', fontWeight: 500 }}>
              <ArrowLeft size={14}/> Voltar
            </button>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26 }}>⚡</div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Escaneie o QR Code PIX</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>Abra o app do seu banco e escaneie</p>

            <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'inline-block', marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              {pixQr
                ? <img src={pixQr} alt="QR Code PIX" style={{ width: 'min(200px, 60vw)', height: 'min(200px, 60vw)', display: 'block' }}/>
                : <div style={{ width: 'min(200px, 60vw)', height: 'min(200px, 60vw)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>Carregando...</div>
              }
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, textAlign: 'left' }}>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIX Copia e Cola</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{pixCode}</p>
                <button onClick={() => { navigator.clipboard.writeText(pixCode); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); }} style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: pixCopied ? '#22c55e' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, transition: 'all 0.2s' }}>
                  {pixCopied ? <><Check size={11}/>Copiado!</> : <><Copy size={11}/>Copiar</>}
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#4ade80' }}>Valor: <strong>R$ {Number(p.price).toFixed(2).replace('.',',')}{p.period}</strong> · Plano {p.label}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#64748b', fontSize: 13 }}>
              {pixChecking ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/>Aguardando pagamento...</> : <>⏳ Verificando automaticamente...</>}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#475569' }}>Acesso liberado automaticamente após confirmação</p>
          </div>
        )}

        {/* CONCLUÍDO */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '3px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'bounce-in 0.5s ease' }}>
              <CheckCircle size={34} color="#22c55e"/>
            </div>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>Pagamento confirmado! 🎉</h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px', lineHeight: 1.7 }}>
              Seu plano <strong style={{ color: '#4ade80' }}>{p.label}</strong> está ativo.<br/>Bem-vindo ao Finora!
            </p>
            <button onClick={() => router.push('/dashboard')} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
              Acessar meu dashboard <ArrowRight size={16}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: 10,
  border: '1.5px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)', color: '#fff',
  fontSize: 15, outline: 'none', boxSizing: 'border-box',
};

export default function AssinaturaPage() {
  return <Suspense><AssinaturaContent/></Suspense>;
}
