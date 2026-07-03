import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY!;

// Mesma normalização usada na geração (front): maiúsculo, só letras/números
function normalize(code: string): string {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function hashCode(code: string): string {
  return createHash('sha256').update(normalize(code)).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const { code } = await req.json();
    if (!token || !code) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

    // Identifica o usuário pela sessão (AAL1 basta)
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Busca os códigos de recuperação do perfil
    const { data: profile } = await admin.from('profiles').select('recovery_codes').eq('id', user.id).single();
    const codes: Array<{ hash: string; used: boolean }> = (profile?.recovery_codes as any) || [];

    const inputHash = hashCode(code);
    const idx = codes.findIndex((c) => c.hash === inputHash && !c.used);
    if (idx === -1) return NextResponse.json({ error: 'Código inválido ou já utilizado.' }, { status: 400 });

    // Marca o código como usado
    codes[idx].used = true;
    await admin.from('profiles').update({ recovery_codes: codes }).eq('id', user.id);

    // Remove os fatores TOTP do usuário (desativa o 2FA) via Admin API
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}/factors`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const factors = await listRes.json();
    const list = Array.isArray(factors) ? factors : (factors?.factors || []);
    for (const f of list) {
      if (f.factor_type === 'totp') {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}/factors/${f.id}`, {
          method: 'DELETE',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
      }
    }

    const remaining = codes.filter((c) => !c.used).length;
    return NextResponse.json({ ok: true, remaining });
  } catch (e: any) {
    console.error('[recover-2fa] error:', e?.message);
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}
