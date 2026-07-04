'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { recordLoginEvent } from '@/lib/security';

type Mode = 'login' | 'forgot' | 'forgot-sent' | 'mfa';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mode, setMode]         = useState<Mode>('login');
  const [mfaCode, setMfaCode]   = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveredMsg, setRecoveredMsg] = useState('');
  const router = useRouter();

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sessão expirada. Faça login novamente.'); setMode('login'); setLoading(false); return; }
      const res = await fetch('/api/auth/recover-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code: recoveryCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setError(data.error || 'Código inválido.'); setLoading(false); return; }
      await supabase.auth.signOut();
      setLoading(false);
      setMode('login');
      setUseRecovery(false); setRecoveryCode(''); setMfaCode(''); setPassword('');
      setRecoveredMsg('2FA desativado com o código de recuperação. Entre com sua senha e reative o 2FA em Configurações.');
    } catch {
      setLoading(false);
      setError('Erro ao validar o código. Tente novamente.');
    }
  }

  // Após login por senha, decide se precisa do 2FA (step-up para AAL2)
  async function routeAfterAuth() {
    recordLoginEvent(); // registra acesso + detecta dispositivo/local novo (fire-and-forget)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      // Admin escolhe entre Dashboard e Administração
      if (profile?.role === 'admin') { router.push('/portal'); return; }
    }
    router.push('/dashboard');
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = (factors?.totp || []).find((f: any) => f.status === 'verified');
      if (!factor) { setError('Fator 2FA não encontrado.'); setLoading(false); return; }
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (chErr) { setError('Erro ao validar. Tente novamente.'); setLoading(false); return; }
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: mfaCode.trim() });
      if (vErr) { setError('Código inválido. Tente novamente.'); setLoading(false); return; }
      await routeAfterAuth();
    } catch {
      setLoading(false);
      setError('Erro ao verificar o código.');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('E-mail ou senha incorretos'); setLoading(false); return; }

    // Se a conta tem 2FA, o login sobe para AAL1 e precisa do código (AAL2)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      setLoading(false);
      setMode('mfa');
      return;
    }
    await routeAfterAuth();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    try {
      const res = await fetch(`${apiUrl}/email/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok || !data.success) {
        setError(`Erro (${res.status}): ${data.message || 'tente novamente'}`);
        return;
      }
      setMode('forgot-sent');
    } catch (err: any) {
      setLoading(false);
      setError(`Falha de rede: ${err?.message || 'verifique a conexão'}`);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif', background: '#020617' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .login-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .login-input:focus { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.15) !important; outline: none !important; }
        .btn-submit:hover { box-shadow: 0 0 32px rgba(34,197,94,0.55) !important; transform: translateY(-1px); }
        .btn-submit { transition: all 0.2s !important; }
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { padding: 40px 24px !important; }
        }
      `}</style>

      {/* ── Left panel ── */}
      <div className="login-left" style={{ width: 460, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 52px', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', bottom: '-10%', left: '-20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.06) 0%,transparent 70%)', pointerEvents: 'none' }}/>
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }}/>

        <div style={{ position: 'relative' }}>
          <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 46, marginBottom: 52 }}/>

          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Finora IA</p>
            <h2 style={{ color: '#fff', fontSize: 32, fontWeight: 800, margin: '0 0 14px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
              Suas finanças,{' '}
              <span style={{ backgroundImage: 'linear-gradient(90deg,#22c55e,#4ade80,#22c55e)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>
                no WhatsApp.
              </span>
            </h2>
            <p style={{ color: '#475569', fontSize: 15, margin: 0, lineHeight: 1.7 }}>Registre gastos por mensagem e acompanhe tudo no dashboard mais completo do mercado.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '💬', title: 'Via WhatsApp', desc: '"Gastei R$ 50 no mercado" — e pronto.' },
              { icon: '🤖', title: 'IA Inteligente', desc: 'Categorização automática em segundos.' },
              { icon: '📊', title: 'Dashboard completo', desc: 'Gráficos, metas, contas e muito mais.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ paddingTop: 2 }}>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, margin: '0 0 3px' }}>{item.title}</p>
                  <p style={{ color: '#475569', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Porcinha animada */}
          <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 20px rgba(34,197,94,0.35)', animation: 'float 4s ease-in-out infinite', flexShrink: 0 }}>🐷</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>Finora IA</span> — online agora
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="login-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, position: 'relative' }}>
        {/* Subtle glow center */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.04) 0%,transparent 65%)', pointerEvents: 'none' }}/>

        <div style={{ width: '100%', maxWidth: 380, position: 'relative' }}>

          {/* Mobile logo */}
          <div className="mobile-logo" style={{ display: 'none', justifyContent: 'center', marginBottom: 36 }}>
            <style>{`@media (max-width: 768px) { .mobile-logo { display: flex !important; } }`}</style>
            <img src="/logo-finora-dark.svg" alt="Finora" style={{ height: 44 }}/>
          </div>

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <div style={{ marginBottom: 36 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Bem-vindo de volta!</h1>
                <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Entre para acessar seu dashboard</p>
              </div>

              {recoveredMsg && (
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '11px 14px', color: '#4ade80', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
                  {recoveredMsg}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input className="login-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" style={inputStyle}/>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Senha</label>
                    <button type="button" onClick={() => { setError(''); setMode('forgot'); }} style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                      Esqueci minha senha
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input className="login-input" type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }}/>
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '11px 14px', color: '#f87171', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', borderRadius: 12, border: 'none', background: loading ? '#1e293b' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: loading ? '#475569' : '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 0 24px rgba(34,197,94,0.35)' }}>
                  {loading ? 'Aguarde...' : <> Entrar <ArrowRight size={16}/> </>}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 14, color: '#475569', marginTop: 28 }}>
                Não tem uma conta?{' '}
                <a href="/assinar" style={{ color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>Cadastre-se</a>
              </p>
            </>
          )}

          {/* ── ESQUECI SENHA ── */}
          {mode === 'forgot' && (
            <>
              <button onClick={() => { setMode('login'); setError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 32 }}>
                <ArrowLeft size={15}/> Voltar ao login
              </button>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Recuperar senha</h1>
              <p style={{ color: '#475569', fontSize: 14, margin: '0 0 32px', lineHeight: 1.65 }}>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input className="login-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" style={inputStyle}/>
                </div>
                {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '11px 14px', color: '#f87171', fontSize: 13 }}>{error}</div>}
                <button type="submit" disabled={loading} className="btn-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', borderRadius: 12, border: 'none', background: loading ? '#1e293b' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: loading ? '#475569' : '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', boxShadow: 'none' }}>
                  {loading ? 'Enviando...' : <> Enviar link <ArrowRight size={16}/> </>}
                </button>
              </form>
            </>
          )}

          {/* ── E-MAIL ENVIADO ── */}
          {mode === 'forgot-sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 24px rgba(34,197,94,0.2)' }}>
                <CheckCircle size={34} color="#22c55e"/>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>E-mail enviado!</h1>
              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.75, margin: '0 0 32px' }}>
                Enviamos um link para<br/>
                <strong style={{ color: '#f1f5f9' }}>{email}</strong><br/>
                Verifique sua caixa de entrada e o spam.
              </p>
              <button onClick={() => { setMode('login'); setError(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto', background: 'none', border: 'none', color: '#22c55e', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                <ArrowLeft size={15}/> Voltar ao login
              </button>
            </div>
          )}

          {mode === 'mfa' && !useRecovery && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Verificação em duas etapas</h1>
              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
                Digite o código de 6 dígitos do seu app autenticador.
              </p>
              <form onSubmit={handleMfa} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Código</label>
                  <input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoFocus
                    style={{ ...inputStyle, letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
                  />
                </div>
                {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
                <button type="submit" disabled={loading || mfaCode.length !== 6} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: mfaCode.length !== 6 ? 0.6 : 1 }}>
                  {loading ? 'Verificando…' : 'Entrar'} <ArrowRight size={16}/>
                </button>
                <button type="button" onClick={() => { setUseRecovery(true); setError(''); }} style={{ background: 'none', border: 'none', color: '#22c55e', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Perdi meu autenticador — usar código de recuperação
                </button>
                <button type="button" onClick={async () => { await supabase.auth.signOut(); setMode('login'); setMfaCode(''); setError(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto', background: 'none', border: 'none', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  <ArrowLeft size={15}/> Voltar
                </button>
              </form>
            </div>
          )}

          {mode === 'mfa' && useRecovery && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Código de recuperação</h1>
              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
                Digite um dos códigos que você salvou ao ativar o 2FA. Ele será usado uma vez e o 2FA será desativado para você reentrar.
              </p>
              <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Código de recuperação</label>
                  <input
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="XXXXX-XXXXX"
                    autoFocus
                    style={{ ...inputStyle, letterSpacing: 2, textAlign: 'center', fontSize: 18, fontFamily: 'monospace' }}
                  />
                </div>
                {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
                <button type="submit" disabled={loading || recoveryCode.replace(/[^A-Z0-9]/g, '').length < 10} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: recoveryCode.replace(/[^A-Z0-9]/g, '').length < 10 ? 0.6 : 1 }}>
                  {loading ? 'Validando…' : 'Recuperar acesso'} <ArrowRight size={16}/>
                </button>
                <button type="button" onClick={() => { setUseRecovery(false); setRecoveryCode(''); setError(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto', background: 'none', border: 'none', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  <ArrowLeft size={15}/> Voltar ao código do app
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#475569',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 14px',
  borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
  fontSize: 15, color: '#f1f5f9', background: 'rgba(255,255,255,0.04)',
  outline: 'none', boxSizing: 'border-box',
};
