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

// GET /api/admin/users — list all users with stats
export async function GET(req: NextRequest) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdmin();

  // Get all auth users
  const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userIds = authData.users.map(u => u.id);

  // Get profiles
  const { data: profiles } = await admin.from('profiles').select('id,name,avatar_url,role,created_at,onboarded,blocked,plan_status,plan_type,trial_ends_at,plan_expires_at').in('id', userIds);

  // Get transaction counts per user
  const { data: txCounts } = await admin
    .from('transactions')
    .select('user_id')
    .in('user_id', userIds);

  const txMap: Record<string, number> = {};
  for (const t of txCounts || []) {
    txMap[t.user_id] = (txMap[t.user_id] || 0) + 1;
  }

  // Get bills counts
  const { data: billCounts } = await admin
    .from('bills')
    .select('user_id')
    .in('user_id', userIds);

  const billMap: Record<string, number> = {};
  for (const b of billCounts || []) {
    billMap[b.user_id] = (billMap[b.user_id] || 0) + 1;
  }

  // Merge
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  const users = authData.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    confirmed: !!u.email_confirmed_at,
    name: profileMap[u.id]?.name || null,
    avatar_url: profileMap[u.id]?.avatar_url || null,
    role: profileMap[u.id]?.role || 'user',
    onboarded: profileMap[u.id]?.onboarded ?? true,
    blocked: profileMap[u.id]?.blocked || false,
    transactions: txMap[u.id] || 0,
    bills: billMap[u.id] || 0,
    plan_status: profileMap[u.id]?.plan_status || 'trial',
    plan_type: profileMap[u.id]?.plan_type || null,
    trial_ends_at: profileMap[u.id]?.trial_ends_at || null,
    plan_expires_at: profileMap[u.id]?.plan_expires_at || null,
  }));

  return NextResponse.json({ users });
}

// DELETE /api/admin/users?id=xxx — delete a user
export async function DELETE(req: NextRequest) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (id === caller.id) return NextResponse.json({ error: 'Não pode excluir a si mesmo' }, { status: 400 });

  const admin = getAdmin();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/users — update role / name / blocked
export async function PATCH(req: NextRequest) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, role, name, blocked, plan_status, plan_type } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = getAdmin();
  const updates: Record<string, any> = {};
  if (role        !== undefined) updates.role        = role;
  if (name        !== undefined) updates.name        = name;
  if (blocked     !== undefined) updates.blocked     = blocked;
  if (plan_status !== undefined) updates.plan_status = plan_status;
  if (plan_type   !== undefined) updates.plan_type   = plan_type;

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If blocked, also ban the user in auth
  if (blocked !== undefined) {
    await admin.auth.admin.updateUserById(id, { ban_duration: blocked ? '876600h' : 'none' });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, password, name, role, send_invite } = await req.json();
  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 });

  const admin = getAdmin();

  // Create user in auth
  const { data, error } = send_invite
    ? await admin.auth.admin.inviteUserByEmail(email)
    : await admin.auth.admin.createUser({
        email,
        password: password || undefined,
        email_confirm: true,
      });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userId = data.user?.id;
  if (!userId) return NextResponse.json({ error: 'Usuário criado mas ID não retornado' }, { status: 500 });

  // Create profile
  await admin.from('profiles').upsert({
    id: userId,
    name: name || null,
    role: role || 'user',
    onboarded: true,
  });

  return NextResponse.json({ ok: true, user: data.user });
}
