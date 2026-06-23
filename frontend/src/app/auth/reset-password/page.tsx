'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const [ready, setReady]       = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a token in the URL (from email link)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres'); return; }
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError('Erro ao redefinir senha. O link pode ter expirado.'); return; }
    setDone(true);
    setTimeout(() => router.push('/auth/login'), 3000);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5,#f8fafc)', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 'clamp(28px, 5vw, 44px)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <img src="/logo-finora.svg" alt="Finora" style={{ height: 34 }}/>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} color="#22c55e"/>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Senha redefinida!</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>Redirecionando para o login...</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', textAlign: 'center' }}>Nova senha</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>Digite sua nova senha abaixo.</p>

            {!ready && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', color: '#92400e', fontSize: 13, marginBottom: 16 }}>
                Aguardando validação do link...
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nova senha</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={{ ...inputStyle, paddingRight: 44 }}/>
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirmar senha</label>
                <input type={showPw ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" style={inputStyle}/>
              </div>

              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}

              <button type="submit" disabled={loading || !ready} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 11, border: 'none', background: loading || !ready ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading || !ready ? 'not-allowed' : 'pointer', boxShadow: loading || !ready ? 'none' : '0 4px 14px rgba(34,197,94,0.35)', transition: 'all 0.2s' }}>
                {loading ? 'Salvando...' : 'Redefinir senha'} {!loading && <ArrowRight size={16}/>}
              </button>
            </form>
          </>
        )}
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
};
