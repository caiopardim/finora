'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

type Mode = 'login' | 'forgot' | 'forgot-sent';

export default function LoginPage() {
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [mode, setMode]     = useState<Mode>('login');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('E-mail ou senha incorretos'); setLoading(false); return; }
    if (data?.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (profile?.role === 'admin') { router.push('/admin'); return; }
    }
    router.push('/dashboard');
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) { setError('Erro ao enviar e-mail. Verifique o endereço e tente novamente.'); return; }
    setMode('forgot-sent');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif', background: 'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f8fafc 100%)' }}>
      <style>{`
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { padding: 32px 24px !important; }
        }
      `}</style>

      {/* Left panel — hidden on mobile */}
      <div className="login-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 48, background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', maxWidth: 480 }}>
        <div style={{ maxWidth: 360, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💰</div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Finora</p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>Mais controle, menos planilhas</p>
            </div>
          </div>
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.2 }}>Controle suas finanças com IA</h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 40px', lineHeight: 1.6 }}>Registre gastos pelo WhatsApp e acompanhe tudo em um dashboard completo.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '💬', title: 'Via WhatsApp', desc: '"Gastei R$ 50 no mercado" — e pronto.' },
              { icon: '🤖', title: 'IA Inteligente', desc: 'Categorização automática e relatórios em segundos.' },
              { icon: '📊', title: 'Dashboard', desc: 'Gráficos, metas, contas a pagar e muito mais.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, margin: '0 0 2px' }}>{item.title}</p>
                  <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo — only on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }} className="mobile-logo">
            <style>{`.mobile-logo { display: none !important; } @media (max-width: 768px) { .mobile-logo { display: flex !important; } }`}</style>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Finora</span>
          </div>

          {/* LOGIN */}
          {mode === 'login' && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Bem-vindo de volta!</h1>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 28px' }}>Entre para acessar seu dashboard</p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" style={inputStyle}/>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Senha</label>
                    <button type="button" onClick={() => { setError(''); setMode('forgot'); }} style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                      Esqueci minha senha
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }}/>
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
                    </button>
                  </div>
                </div>

                {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}

                <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 11, border: 'none', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(34,197,94,0.35)', transition: 'all 0.2s' }}>
                  {loading ? 'Aguarde...' : 'Entrar'} {!loading && <ArrowRight size={16}/>}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 14, color: '#94a3b8', marginTop: 24 }}>
                Não tem uma conta?{' '}
                <a href="/assinar" style={{ color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>Cadastre-se</a>
              </p>
            </>
          )}

          {/* ESQUECI SENHA */}
          {mode === 'forgot' && (
            <>
              <button onClick={() => { setMode('login'); setError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 28 }}>
                <ArrowLeft size={15}/> Voltar ao login
              </button>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Recuperar senha</h1>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>Informe seu e-mail e enviaremos um link para você criar uma nova senha.</p>

              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" style={inputStyle}/>
                </div>

                {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}

                <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 11, border: 'none', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(34,197,94,0.35)', transition: 'all 0.2s' }}>
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'} {!loading && <ArrowRight size={16}/>}
                </button>
              </form>
            </>
          )}

          {/* E-MAIL ENVIADO */}
          {mode === 'forgot-sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} color="#22c55e"/>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>E-mail enviado!</h1>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 28px' }}>
                Enviamos um link de recuperação para<br/>
                <strong style={{ color: '#0f172a' }}>{email}</strong><br/>
                Verifique sua caixa de entrada (e o spam).
              </p>
              <button onClick={() => { setMode('login'); setError(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto', background: 'none', border: 'none', color: '#22c55e', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                <ArrowLeft size={15}/> Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b',
  letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 14px',
  borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 15, color: '#1e293b', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
