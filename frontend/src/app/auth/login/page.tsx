'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push('/dashboard');
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f8fafc 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 48, background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)',
        maxWidth: 480,
      }}>
        <div style={{ maxWidth: 360, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💰</div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Finora</p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>Finanças pelo WhatsApp</p>
            </div>
          </div>

          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.2 }}>
            Controle suas finanças com IA
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 40px', lineHeight: 1.6 }}>
            Registre gastos pelo WhatsApp e acompanhe tudo em um dashboard completo.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '💬', title: 'Via WhatsApp', desc: '"Gastei R$ 50 no mercado" — e pronto.' },
              { icon: '🤖', title: 'IA Inteligente', desc: 'Categorização automática e relatórios em segundos.' },
              { icon: '📊', title: 'Dashboard', desc: 'Gráficos, metas, contas a pagar e muito mais.' },
            ].map((item) => (
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

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            {mode === 'login' ? 'Bem-vindo de volta!' : 'Criar sua conta'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 32px' }}>
            {mode === 'login' ? 'Entre para acessar seu dashboard' : 'Comece a controlar suas finanças hoje'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7 }}>E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="voce@email.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7 }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 11, border: 'none',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
              transition: 'all 0.2s',
            }}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'} {!loading && <ArrowRight size={16}/>}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#94a3b8', marginTop: 24 }}>
            {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#22c55e', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {mode === 'login' ? 'Cadastre-se grátis' : 'Fazer login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '11px 14px',
  borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, color: '#1e293b', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
