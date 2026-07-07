'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { toast, toastError } from '@/lib/toast';
import { Users, UserPlus, X, Check, Loader } from 'lucide-react';

interface Member { id: string; member_id: string | null; role: string; status: string; invite_email?: string; invite_phone?: string; profiles?: { name?: string } }
interface State { role: 'owner' | 'member' | null; household: any; members: Member[]; pendingInvite: any }

export default function FamilySection() {
  const { c } = useTheme();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState('');

  const call = useCallback(async (method: 'GET' | 'POST', body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch('/api/household', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toastError(json.error || 'Erro'); return null; }
    return json;
  }, []);

  const refresh = useCallback(async () => {
    const s = await call('GET');
    if (s) setState(s);
    setLoading(false);
  }, [call]);

  useEffect(() => { refresh(); }, [refresh]);

  async function doInvite() {
    const v = invite.trim();
    if (!v) return;
    const isEmail = v.includes('@');
    setBusy(true);
    const s = await call('POST', { action: 'invite', email: isEmail ? v : undefined, phone: isEmail ? undefined : v });
    setBusy(false);
    if (s) { setState(s); setInvite(''); toast('Convite enviado! 🎉'); }
  }

  async function act(action: string, id?: string) {
    setBusy(true);
    const s = await call('POST', { action, id });
    setBusy(false);
    if (s) { setState(s); toast(action === 'accept' ? 'Você entrou no espaço! 🎉' : 'Feito', action === 'accept' ? 'success' : 'info'); }
  }

  const box: React.CSSProperties = { background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: 20, marginBottom: 20 };
  const input: React.CSSProperties = { flex: 1, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${c.border}`, fontSize: 14, color: c.textSecondary, background: c.input, outline: 'none' };

  if (loading) return <div style={box}><Loader size={16} className="spin" style={{ color: c.textFaint }}/></div>;

  const isOwner = state?.role === 'owner';
  const activeMembers = (state?.members || []).filter(m => m.status === 'active');
  const pendingMembers = (state?.members || []).filter(m => m.status === 'invited');

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: '#6366f118', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}><Users size={17}/></span>
        <h2 style={{ margin: 0, fontWeight: 600, fontSize: 15, color: c.textSecondary }}>Família / Casal</h2>
      </div>
      <p style={{ color: c.textFaint, fontSize: 13, margin: '0 0 16px' }}>
        Compartilhe um caixa comum com quem você ama. O plano casal cobre você + 1 pessoa.
      </p>

      {/* Convite pendente endereçado a mim */}
      {state?.pendingInvite && (
        <div style={{ background: '#22c55e10', border: '1px solid #22c55e33', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, color: c.textSecondary }}>
            🎉 Você foi convidado para o espaço <strong>{state.pendingInvite.households?.name || 'da família'}</strong>.
          </p>
          <button disabled={busy} onClick={() => act('accept')} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Check size={13}/> Aceitar convite
          </button>
        </div>
      )}

      {/* Membros do espaço */}
      {(activeMembers.length > 0 || pendingMembers.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {activeMembers.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: c.bg, borderRadius: 10 }}>
              <span style={{ fontSize: 14, color: c.textSecondary }}>
                {m.profiles?.name || 'Membro'} {m.role === 'owner' && <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>· titular</span>}
              </span>
              {isOwner && m.role !== 'owner' && (
                <button disabled={busy} onClick={() => act('remove', m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remover</button>
              )}
            </div>
          ))}
          {pendingMembers.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: c.bg, borderRadius: 10, opacity: 0.8 }}>
              <span style={{ fontSize: 14, color: c.textFaint }}>
                {m.invite_email || m.invite_phone} <span style={{ fontSize: 11 }}>· convite pendente</span>
              </span>
              {isOwner && (
                <button disabled={busy} onClick={() => act('remove', m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Convidar (só quando há espaço para mais 1) */}
      {(!state?.role || (isOwner && activeMembers.length + pendingMembers.length < 2)) && !state?.pendingInvite && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={invite} onChange={e => setInvite(e.target.value)} placeholder="Email ou telefone do parceiro(a)" style={input}
            onKeyDown={e => { if (e.key === 'Enter') doInvite(); }}/>
          <button disabled={busy} onClick={doInvite} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <UserPlus size={15}/> Convidar
          </button>
        </div>
      )}

      {/* Membro pode sair */}
      {state?.role === 'member' && (
        <button disabled={busy} onClick={() => act('leave')} style={{ marginTop: 4, background: 'none', border: `1px solid ${c.border}`, borderRadius: 9, padding: '8px 14px', color: c.textMuted, fontSize: 13, cursor: 'pointer' }}>
          Sair do espaço compartilhado
        </button>
      )}
    </div>
  );
}
