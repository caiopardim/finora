'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';

export default function TwoFactorSetup() {
  const { c } = useTheme();
  const [loading, setLoading]   = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null); // fator verificado ativo
  const [enroll, setEnroll]     = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [okMsg, setOkMsg]       = useState('');

  async function refresh() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp || []).find((f: any) => f.status === 'verified');
    setFactorId(verified?.id || null);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function startEnroll() {
    setError(''); setOkMsg(''); setBusy(true);
    try {
      // Remove fatores TOTP não verificados que possam ter ficado de tentativas anteriores
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of (list?.all || [])) {
        if (f.factor_type === 'totp' && f.status !== 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Finora ${Date.now()}` });
      if (error) { setError(error.message); setBusy(false); return; }
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e: any) {
      setError(e?.message || 'Erro ao iniciar o 2FA.');
    }
    setBusy(false);
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setError(''); setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
      if (chErr) { setError(chErr.message); setBusy(false); return; }
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code: code.trim() });
      if (vErr) { setError('Código inválido. Tente novamente.'); setBusy(false); return; }
      setEnroll(null); setCode('');
      setOkMsg('Verificação em duas etapas ativada! ✅');
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Erro ao verificar o código.');
    }
    setBusy(false);
  }

  async function disable() {
    if (!factorId) return;
    setError(''); setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) { setError('Não foi possível desativar agora. Faça login novamente e tente de novo.'); setBusy(false); return; }
      setOkMsg('Verificação em duas etapas desativada.');
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Erro ao desativar.');
    }
    setBusy(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.border}`,
    background: c.bg, color: c.text, boxSizing: 'border-box', fontSize: 15,
  };
  const primaryBtn: React.CSSProperties = {
    padding: '10px 16px', borderRadius: 8, border: 'none', background: '#22c55e',
    color: '#fff', fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontSize: 14,
  };

  if (loading) return <div style={{ color: c.textSecondary, fontSize: 14 }}>Carregando…</div>;

  // Estado: já ativado
  if (factorId && !enroll) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <ShieldCheck size={18} color="#22c55e" />
          <span style={{ color: c.text, fontSize: 14, fontWeight: 600 }}>Verificação em duas etapas ativada</span>
        </div>
        <p style={{ color: c.textSecondary, fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>
          Sua conta está protegida: além da senha, o login pede um código do seu app autenticador.
        </p>
        <button onClick={disable} disabled={busy} style={{ ...primaryBtn, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldOff size={15} />} Desativar 2FA
        </button>
        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}
        {okMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 10 }}>{okMsg}</p>}
      </div>
    );
  }

  // Estado: enroll em andamento (mostrar QR + código)
  if (enroll) {
    return (
      <form onSubmit={confirmEnroll}>
        <p style={{ color: c.textSecondary, fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>
          1. Abra seu app autenticador (Google Authenticator, Authy, 1Password…) e escaneie o QR code:
        </p>
        <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block', marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR Code 2FA" style={{ width: 180, height: 180, display: 'block' }} />
        </div>
        <p style={{ color: c.textMuted, fontSize: 12, margin: '0 0 14px' }}>
          Ou digite este código manualmente: <code style={{ color: c.text, fontWeight: 600 }}>{enroll.secret}</code>
        </p>
        <p style={{ color: c.textSecondary, fontSize: 13, margin: '0 0 8px' }}>2. Digite o código de 6 dígitos gerado pelo app:</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoFocus
          style={{ ...inputStyle, letterSpacing: 4, textAlign: 'center', maxWidth: 160, marginBottom: 12 }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy || code.length !== 6} style={{ ...primaryBtn, opacity: code.length !== 6 ? 0.6 : 1 }}>
            {busy ? 'Verificando…' : 'Ativar 2FA'}
          </button>
          <button type="button" onClick={() => { setEnroll(null); setCode(''); setError(''); }} style={{ ...primaryBtn, background: 'transparent', color: c.textSecondary, border: `1px solid ${c.border}` }}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  // Estado: não ativado
  return (
    <div>
      <p style={{ color: c.textSecondary, fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>
        Adicione uma camada extra de proteção. Com o 2FA ativado, além da senha o login pedirá um código do seu app autenticador — mesmo que alguém descubra sua senha, não consegue entrar.
      </p>
      <button onClick={startEnroll} disabled={busy} style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={15} />} Ativar 2FA
      </button>
      {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}
      {okMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 10 }}>{okMsg}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
