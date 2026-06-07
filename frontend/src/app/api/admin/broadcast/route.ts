import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

// GET — fetch active broadcast
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  const { data } = await admin.from('admin_settings').select('*').eq('key', 'broadcast').single();
  return NextResponse.json({ broadcast: data?.value || null });
}

// POST — set broadcast message
export async function POST(req: NextRequest) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, type } = await req.json();
  const admin = getAdmin();

  if (!message) {
    // Clear broadcast
    await admin.from('admin_settings').upsert({ key: 'broadcast', value: null }, { onConflict: 'key' });
    return NextResponse.json({ ok: true });
  }

  await admin.from('admin_settings').upsert({
    key: 'broadcast',
    value: { message, type: type || 'info', created_at: new Date().toISOString() },
  }, { onConflict: 'key' });

  return NextResponse.json({ ok: true });
}
