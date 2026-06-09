'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, ArrowRight, Clock } from 'lucide-react';

interface SubInfo {
  is_active: boolean;
  in_trial: boolean;
  trial_days_left: number;
  plan_status: string;
}

// Pages that are always accessible even without active plan
const ALLOWED_PATHS = ['/dashboard/plano', '/dashboard/onboarding', '/planos', '/auth'];

export default function PaywallGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'ok' | 'blocked'>('loading');
  const [info, setInfo] = useState<SubInfo | null>(null);

  useEffect(() => {
    // Skip check for allowed paths
    if (ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
      setStatus('ok');
      return;
    }
    check();
  }, [pathname]);

  async function check() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStatus('ok'); return; } // auth middleware handles redirect

    const res = await fetch('/api/payments/subscription', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { setStatus('ok'); return; } // fail open if API error

    const data: SubInfo = await res.json();
    setInfo(data);
    setStatus(data.is_active ? 'ok' : 'blocked');
  }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(34,197,94,0.2)', borderTop: '3px solid #22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
  if (status === 'ok') return <>{children}</>;

  // Blocked — show paywall overlay
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Blurred background */}
      <div style={{ filter: 'blur(8px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.3, overflow: 'hidden', maxHeight: '100vh' }}>
        {children}
      </div>

      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 20,
          padding: 40,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ef444415', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={28} color="#ef4444"/>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
            {info?.plan_status === 'cancelled' ? 'Assinatura cancelada' : 'Seu período grátis encerrou'}
          </h2>
          <p style={{ fontSize: 15, color: '#94a3b8', margin: '0 0 28px', lineHeight: 1.6 }}>
            {info?.plan_status === 'cancelled'
              ? 'Sua assinatura foi cancelada. Assine novamente para continuar usando o Finora.'
              : 'O período de teste gratuito de 3 dias terminou. Escolha um plano para continuar tendo acesso completo.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => router.push('/dashboard/plano')}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}
            >
              <ArrowRight size={16}/>Ver planos e assinar
            </button>
            <button
              onClick={() => router.push('/planos')}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Ver detalhes dos planos
            </button>
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
            <Clock size={13}/>
            A partir de R$ 29/mês ou R$ 199/ano
          </div>
        </div>
      </div>
    </div>
  );
}
