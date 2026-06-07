'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';

interface SubInfo {
  plan_status: string;
  plan_type: string | null;
  plan_expires_at: string | null;
  in_trial: boolean;
  trial_ends_at: string | null;
  trial_days_left: number;
  is_active: boolean;
}

export default function PlanoPage() {
  const { c } = useTheme();
  const router = useRouter();
  const [info, setInfo] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [subscribing, setSubscribing] = useState<'monthly' | 'annual' | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/auth/login'); return; }
    const res = await fetch('/api/payments/subscription', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setInfo(await res.json());
    setLoading(false);
  }

  async function handleSubscribe(plan: 'monthly' | 'annual') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSubscribing(plan);
    const res = await fetch('/api/payments/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan_type: plan }),
    });
    const data = await res.json();
    setSubscribing(null);
    if (data.init_point) window.location.href = data.init_point;
    else alert('Erro ao iniciar pagamento: ' + (data.error || 'Tente novamente'));
  }

  async function handleCancel() {
    if (!confirm('Tem certeza que quer cancelar sua assinatura? Você perderá o acesso ao final do período pago.')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCancelling(true);
    await fetch('/api/payments/subscription', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setCancelling(false);
    load();
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    trial:     { label: 'Trial ativo', color: '#f59e0b', icon: <Clock size={16}/> },
    active:    { label: 'Ativo',       color: '#22c55e', icon: <CheckCircle size={16}/> },
    paused:    { label: 'Pausado',     color: '#f59e0b', icon: <AlertTriangle size={16}/> },
    cancelled: { label: 'Cancelado',   color: '#ef4444', icon: <XCircle size={16}/> },
    none:      { label: 'Sem plano',   color: '#ef4444', icon: <XCircle size={16}/> },
    inactive:  { label: 'Inativo',     color: '#ef4444', icon: <XCircle size={16}/> },
  };

  const st = info ? (info.in_trial ? 'trial' : info.plan_status) : 'none';
  const sc = statusConfig[st] || statusConfig.none;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: '0 0 4px' }}>Meu Plano</h1>
      <p style={{ fontSize: 14, color: c.textMuted, margin: '0 0 28px' }}>Gerencie sua assinatura do Finora</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: c.textMuted }}>Carregando...</div>
      ) : !info ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Erro ao carregar informações</div>
      ) : (
        <>
          {/* Status card */}
          <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status da assinatura</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 99, background: `${sc.color}15`, color: sc.color, fontSize: 13, fontWeight: 600 }}>
                {sc.icon}{sc.label}
              </div>
            </div>

            {info.in_trial && (
              <div style={{ background: '#fef3c715', border: '1px solid #f59e0b30', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#fbbf24', fontWeight: 600 }}>
                  🎉 Você tem {info.trial_days_left} dia{info.trial_days_left !== 1 ? 's' : ''} de trial restante{info.trial_days_left !== 1 ? 's' : ''}
                </p>
                {info.trial_ends_at && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: c.textMuted }}>
                    Trial termina em {fmtDate(info.trial_ends_at)}
                  </p>
                )}
              </div>
            )}

            {info.plan_type && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={15} color={c.textMuted}/>
                  <span style={{ fontSize: 14, color: c.text }}>
                    {info.plan_type === 'monthly' ? 'Plano Mensal — R$ 29/mês' : 'Plano Anual — R$ 199/ano'}
                  </span>
                </div>
                {info.plan_expires_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={15} color={c.textMuted}/>
                    <span style={{ fontSize: 14, color: c.text }}>Renova em {fmtDate(info.plan_expires_at)}</span>
                  </div>
                )}
              </div>
            )}

            {info.plan_status === 'cancelled' && (
              <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 12, padding: 16, marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#f87171' }}>
                  Assinatura cancelada. Assine novamente para recuperar o acesso.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {(info.in_trial || !info.is_active || info.plan_status === 'cancelled') && (
            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 16px' }}>
                {info.in_trial ? 'Assine agora para continuar após o trial' : 'Reativar assinatura'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                <button onClick={() => handleSubscribe('monthly')} disabled={!!subscribing} style={{ padding: 16, borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, cursor: subscribing ? 'wait' : 'pointer', textAlign: 'left' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: c.text }}>R$ 29<span style={{ fontSize: 13, fontWeight: 400, color: c.textMuted }}>/mês</span></p>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Mensal · Cancele quando quiser</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
                    {subscribing === 'monthly' ? 'Aguarde...' : <><ArrowRight size={14}/>Assinar mensal</>}
                  </div>
                </button>

                <button onClick={() => handleSubscribe('annual')} disabled={!!subscribing} style={{ padding: 16, borderRadius: 12, border: '2px solid #22c55e', background: '#052e1620', cursor: subscribing ? 'wait' : 'pointer', textAlign: 'left', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -10, right: 12, background: '#15803d', color: '#86efac', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>RECOMENDADO</div>
                  <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: c.text }}>R$ 199<span style={{ fontSize: 13, fontWeight: 400, color: c.textMuted }}>/ano</span></p>
                  <p style={{ margin: 0, fontSize: 13, color: '#4ade80' }}>≈ R$ 16,58/mês · Economize R$ 149</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
                    {subscribing === 'annual' ? 'Aguarde...' : <><ArrowRight size={14}/>Assinar anual</>}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Cancel */}
          {info.plan_status === 'active' && (
            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: c.text }}>Cancelar assinatura</p>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Você mantém o acesso até o fim do período pago</p>
                </div>
                <button onClick={handleCancel} disabled={cancelling} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: cancelling ? 'wait' : 'pointer' }}>
                  <Trash2 size={14}/>{cancelling ? 'Cancelando...' : 'Cancelar assinatura'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
