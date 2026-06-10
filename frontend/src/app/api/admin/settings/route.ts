import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

async function getAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return null;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (p?.role !== 'admin') return null;
  return admin;
}

// GET — retorna todos os settings + admin_settings (costs etc)
export async function GET(req: NextRequest) {
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const svc  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const [{ data }, { data: adminData }] = await Promise.all([
    anon.from('settings').select('key, value'),
    svc.from('admin_settings').select('key, value'),
  ]);
  const map: Record<string, any> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value; });
  (adminData || []).forEach((r: any) => { map[r.key] = r.value; });
  return NextResponse.json(map);
}

// POST — salva admin settings (costs, etc)
export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await admin.from('admin_settings').upsert({ key, value }, { onConflict: 'key' });
  }
  return NextResponse.json({ ok: true });
}

// PATCH — atualiza um setting (admin only)
export async function PATCH(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'key e value obrigatórios' }, { status: 400 });

  await admin.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
