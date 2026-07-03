'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

interface Ev {
  id: string;
  device: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

export default function SecurityAlertBanner() {
  const [ev, setEv] = useState<Ev | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('security_events')
        .select('id, device, city, country, created_at')
        .eq('user_id', user.id)
        .eq('type', 'login')
        .eq('is_new_device', true)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setEv(data as Ev);
    })().catch(() => {});
  }, []);

  async function acknowledge() {
    if (!ev) return;
    await supabase.from('security_events').update({ acknowledged: true }).eq('id', ev.id);
    setEv(null);
  }

  if (!ev) return null;

  const location = [ev.city, ev.country].filter(Boolean).join(', ') || 'local desconhecido';

  return (
    <div style={{
      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)',
      borderRadius: 12, padding: '14px 16px', marginBottom: 18,
      display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
    }}>
      <ShieldAlert size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#b45309' }}>
          Novo acesso detectado
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          {ev.device || 'Dispositivo desconhecido'} · {location} · {dayjs(ev.created_at).format('DD/MM/YYYY HH:mm')}.
          {' '}Foi você?
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={acknowledge} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Sim, fui eu
        </button>
        <button onClick={() => { acknowledge(); router.push('/dashboard/settings'); }} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Não reconheço
        </button>
        <button onClick={acknowledge} title="Dispensar" style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', color: '#92400e', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
