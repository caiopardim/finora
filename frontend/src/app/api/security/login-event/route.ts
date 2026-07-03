import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
const API_URL      = process.env.NEXT_PUBLIC_API_URL || '';

// Extrai um nome amigável de dispositivo do user-agent
function parseDevice(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Navegador';
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'Mac'
    : /Linux/.test(ua) ? 'Linux'
    : 'Desconhecido';
  return `${browser} · ${os}`;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const ua = req.headers.get('user-agent') || '';
    const device = parseDevice(ua);
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
    const city = decodeURIComponent(req.headers.get('x-vercel-ip-city') || '') || null;
    const country = req.headers.get('x-vercel-ip-country') || null;
    const location = [city, country].filter(Boolean).join(', ') || 'Local desconhecido';

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Histórico de logins deste usuário
    const { data: past } = await admin
      .from('security_events')
      .select('device, country')
      .eq('user_id', user.id)
      .eq('type', 'login');

    const knownDevices = new Set((past || []).map((e: any) => e.device));
    const knownCountries = new Set((past || []).map((e: any) => e.country).filter(Boolean));

    const isFirstEver = (past || []).length === 0;
    const newDevice = !isFirstEver && !knownDevices.has(device);
    const newLocation = !isFirstEver && country != null && knownCountries.size > 0 && !knownCountries.has(country);

    // Registra o evento
    await admin.from('security_events').insert({
      user_id: user.id,
      type: 'login',
      device, ip, city, country,
      is_new_device: newDevice || newLocation,
      acknowledged: !(newDevice || newLocation), // só pede confirmação se for novo
    });

    // Dispara alerta por e-mail se for dispositivo/local novo
    if ((newDevice || newLocation) && API_URL && user.email) {
      const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      fetch(`${API_URL}/email/security-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          title: newLocation ? 'Novo acesso de local diferente' : 'Novo acesso à sua conta',
          message: 'Detectamos um acesso à sua conta Finora a partir de um dispositivo ou local não reconhecido.',
          details: [
            `📱 Dispositivo: ${device}`,
            `📍 Local: ${location}`,
            `🕐 Quando: ${when}`,
          ],
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, newDevice, newLocation });
  } catch (e: any) {
    console.error('[login-event] error:', e?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
