import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state'); // user_id
  const error = searchParams.get('error');

  // Deriva o domínio da própria requisição (o site onde o callback foi chamado),
  // garantindo que o redirect_uri da troca de token bata com o usado no início
  // e que o redirect final volte para o site — não para a API.
  const baseUrl = origin;

  if (error || !code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/agenda?google=error`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${baseUrl}/api/google/callback`,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('No access token');

    // Save tokens in Supabase
    await getAdmin().from('user_google_tokens').upsert({
      user_id:       state,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at:    new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }, { onConflict: 'user_id' });

    return NextResponse.redirect(`${baseUrl}/dashboard/agenda?google=connected`);
  } catch (e) {
    console.error('Google OAuth error:', e);
    return NextResponse.redirect(`${baseUrl}/dashboard/agenda?google=error`);
  }
}
