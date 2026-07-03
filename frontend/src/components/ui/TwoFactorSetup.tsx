'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { ShieldCheck, ShieldOff, Loader2, Copy, Check, KeyRound } from 'lucide-react';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos

function randomCode(): string {
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  const s = Array.from(arr, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
// Gera 10 códigos, guarda os HASHES no perfil e devolve os códigos em texto (mostrados 1x)
async function generateAndStoreCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 10 }, randomCode);
  const hashed = await Promise.all(codes.map(async (c) => ({ hash: await sha256hex(normalizeCode(c)), used: false })));
  await supabase.from('profiles').update({ recovery_codes: hashed }).eq('id', userId);
  return codes;
}

export default function TwoFactorSetup() {
  const { c } = useTheme();
  const [loading, setLoading]   = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null); // fator verificado ativo
  const [enroll, setEnroll]     = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [okMsg, setOkMsg]       = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null); // texto puro, mostrado 1x
  const [copied, setCopied]     = useState(false);

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
      // Gera os códigos de recuperação e mostra uma única vez
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try { setRecoveryCodes(await generateAndStoreCodes(user.id)); } catch { /* segue mesmo sem códigos */ }
      }
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

  async function regenerate() {
    setError(''); setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setRecoveryCodes(await generateAndStoreCodes(user.id));
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar códigos.');
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

  // Estado: mostrando os códigos de recuperação (uma única vez)
  if (recoveryCodes) {
    const copyAll = () => { navigator.clipboard.writeText(recoveryCodes.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <KeyRound size={17} color="#22c55e" />
          <span style={{ color: c.text, fontSize: 14, fontWeight: 700 }}>Guarde seus códigos de recuperação</span>
        </div>
        <p style={{ color: c.textSecondary, fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>
          Se você perder o acesso ao app autenticador, use um destes códigos para entrar. Cada código funciona <strong>uma vez</strong>.
          Guarde em local seguro — eles <strong>não serão mostrados novamente</strong>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          {recoveryCodes.map((rc) => (
            <code key={rc} style={{ fontSize: 14, color: c.text, fontFamily: 'monospace', letterSpacing: 1 }}>{rc}</code>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {copied ? <><Check size={14} color="#22c55e"/> Copiado!</> : <><Copy size={14}/> Copiar todos</>}
          </button>
          <button onClick={() => { setRecoveryCodes(null); setOkMsg('Verificação em duas etapas ativada! ✅'); }} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Salvei meus códigos
          </button>
        </div>
      </div>
    );
  }

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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={regenerate} disabled={busy} style={{ ...primaryBtn, background: 'transparent', color: c.text, border: `1px solid ${c.border}`, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={15} />} Gerar novos códigos de recuperação
          </button>
          <button onClick={disable} disabled={busy} style={{ ...primaryBtn, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldOff size={15} />} Desativar 2FA
          </button>
        </div>
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
