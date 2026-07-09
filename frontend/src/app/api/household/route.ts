import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MAX_MEMBERS = 2; // titular + 1 (casal)

function svcClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Autentica pelo token do Supabase; devolve { user, email, svc }.
async function auth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return null;
  // invite_email é salvo em lowercase; normaliza para casar convites.
  return { user, email: user.email ? user.email.trim().toLowerCase() : null, svc: svcClient() };
}

// Monta o estado do household para a UI.
async function getState(svc: SupabaseClient, userId: string, email: string | null) {
  // Perfil (para o telefone) — usado para casar convites por telefone.
  const { data: myProfile } = await svc.from('profiles').select('phone,name').eq('id', userId).single();
  const myPhone = myProfile?.phone || null;

  // Sou dono de algum household?
  const { data: owned } = await svc.from('households').select('id,name').eq('owner_id', userId).maybeSingle();

  // Minha participação ativa (como membro).
  const { data: myMembership } = await svc
    .from('household_members').select('household_id,role,status')
    .eq('member_id', userId).eq('status', 'active').maybeSingle();

  const householdId = owned?.id || myMembership?.household_id || null;

  // Convite pendente endereçado a mim (por email ou telefone).
  const orParts: string[] = [];
  if (email) orParts.push(`invite_email.eq.${email}`);
  if (myPhone) orParts.push(`invite_phone.eq.${myPhone}`);
  let pendingInvite: any = null;
  if (orParts.length && !householdId) {
    const { data: inv } = await svc
      .from('household_members')
      .select('id,household_id,households(name,owner_id)')
      .is('member_id', null).eq('status', 'invited').or(orParts.join(','))
      .limit(1).maybeSingle();
    pendingInvite = inv || null;
  }

  let members: any[] = [];
  if (householdId) {
    const { data: rows } = await svc
      .from('household_members')
      .select('id,member_id,role,status,invite_email,invite_phone,profiles(name)')
      .eq('household_id', householdId);
    members = rows || [];
  }

  return {
    role: owned ? 'owner' : myMembership ? 'member' : null,
    household: owned || (householdId ? { id: householdId } : null),
    members,
    pendingInvite,
  };
}

export async function GET(req: NextRequest) {
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getState(a.svc, a.user.id, a.email));
}

export async function POST(req: NextRequest) {
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { svc, user, email } = a;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }); }
  const action = body.action as string;

  // ── Convidar (cria household se necessário) ──
  if (action === 'invite') {
    const inviteEmail = (body.email || '').trim().toLowerCase() || null;
    const invitePhone = (body.phone || '').replace(/\D/g, '') || null;
    if (!inviteEmail && !invitePhone) return NextResponse.json({ error: 'Informe email ou telefone do convidado' }, { status: 400 });

    // Garante um household do titular.
    let { data: hh } = await svc.from('households').select('id').eq('owner_id', user.id).maybeSingle();
    if (!hh) {
      const { data: created, error } = await svc.from('households').insert({ owner_id: user.id }).select('id').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      hh = created;
      // Cria a própria membership do titular (owner/active).
      await svc.from('household_members').insert({ household_id: hh.id, member_id: user.id, role: 'owner', status: 'active', joined_at: new Date().toISOString() });
    }

    // Respeita o limite de membros (contando convites pendentes).
    const { count } = await svc.from('household_members').select('id', { count: 'exact', head: true }).eq('household_id', hh.id);
    if ((count || 0) >= MAX_MEMBERS) return NextResponse.json({ error: `O plano casal permite no máximo ${MAX_MEMBERS} pessoas.` }, { status: 400 });

    const { error: invErr } = await svc.from('household_members').insert({
      household_id: hh.id, role: 'member', status: 'invited', invite_email: inviteEmail, invite_phone: invitePhone,
    });
    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
    return NextResponse.json(await getState(svc, user.id, email));
  }

  // ── Aceitar convite ──
  if (action === 'accept') {
    const { data: myProfile } = await svc.from('profiles').select('phone').eq('id', user.id).single();
    const myPhone = myProfile?.phone || null;
    const orParts: string[] = [];
    if (email) orParts.push(`invite_email.eq.${email}`);
    if (myPhone) orParts.push(`invite_phone.eq.${myPhone}`);
    if (!orParts.length) return NextResponse.json({ error: 'Nenhum convite encontrado' }, { status: 404 });

    const { data: inv } = await svc.from('household_members')
      .select('id,household_id').is('member_id', null).eq('status', 'invited').or(orParts.join(','))
      .limit(1).maybeSingle();
    if (!inv) return NextResponse.json({ error: 'Nenhum convite pendente' }, { status: 404 });

    // Limite de membros ativos.
    const { count } = await svc.from('household_members').select('id', { count: 'exact', head: true })
      .eq('household_id', inv.household_id).eq('status', 'active');
    if ((count || 0) >= MAX_MEMBERS) return NextResponse.json({ error: 'Este espaço já está cheio.' }, { status: 400 });

    const { error } = await svc.from('household_members')
      .update({ member_id: user.id, status: 'active', joined_at: new Date().toISOString() })
      .eq('id', inv.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(await getState(svc, user.id, email));
  }

  // ── Remover membro / cancelar convite (só o titular) ──
  if (action === 'remove') {
    const memberRowId = body.id as string;
    if (!memberRowId) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const { data: hh } = await svc.from('households').select('id').eq('owner_id', user.id).maybeSingle();
    if (!hh) return NextResponse.json({ error: 'Você não é titular de um espaço' }, { status: 403 });
    // Não deixa remover a própria linha de titular.
    const { error } = await svc.from('household_members').delete()
      .eq('id', memberRowId).eq('household_id', hh.id).neq('role', 'owner');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(await getState(svc, user.id, email));
  }

  // ── Sair do espaço (membro) ──
  if (action === 'leave') {
    const { error } = await svc.from('household_members').delete()
      .eq('member_id', user.id).eq('role', 'member');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(await getState(svc, user.id, email));
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}
