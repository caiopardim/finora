import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const EVOLUTION_URL      = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY      = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'finora';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return null;
  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return user;
}

async function sendWhatsApp(phone: string, text: string) {
  try {
    await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: `${phone}@s.whatsapp.net`, text }),
    });
  } catch { /* silently fail per user */ }
}

// GET — fetch active broadcast
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  const { data } = await admin.from('admin_settings').select('*').eq('key', 'broadcast').single();
  return NextResponse.json({ broadcast: data?.value || null });
}

// POST — set broadcast message (+ optional WhatsApp blast)
export async function POST(req: NextRequest) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, type, send_whatsapp } = await req.json();
  const admin = getAdmin();

  if (!message) {
    await admin.from('admin_settings').upsert({ key: 'broadcast', value: null }, { onConflict: 'key' });
    return NextResponse.json({ ok: true });
  }

  // Save banner
  await admin.from('admin_settings').upsert({
    key: 'broadcast',
    value: { message, type: type || 'info', created_at: new Date().toISOString() },
  }, { onConflict: 'key' });

  // Send WhatsApp to all active paid users
  if (send_whatsapp) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('phone, name')
      .eq('paid', true)
      .not('phone', 'is', null);

    const typeEmoji = type === 'error' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️';
    const waText = `${typeEmoji} *Aviso Finora*\n\n${message}`;

    if (profiles && profiles.length > 0) {
      // Send in batches of 5 with small delay to avoid rate limiting
      for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        if (p.phone) {
          await sendWhatsApp(p.phone, waText);
          // Small delay every 5 messages
          if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    return NextResponse.json({ ok: true, sent: profiles?.length || 0 });
  }

  return NextResponse.json({ ok: true });
}
