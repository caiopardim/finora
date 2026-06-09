import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

async function refreshToken(userId: string, rt: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: rt,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to refresh token');

  await getAdmin().from('user_google_tokens').update({
    access_token: data.access_token,
    expires_at:   new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq('user_id', userId);

  return data.access_token as string;
}

async function getAccessToken(userId: string): Promise<string> {
  const { data } = await getAdmin()
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) throw new Error('Not connected to Google');

  const expired = new Date(data.expires_at) <= new Date(Date.now() + 60_000);
  if (expired && data.refresh_token) {
    return refreshToken(userId, data.refresh_token);
  }
  return data.access_token;
}

/** Convert appointment to Google Calendar event using scheduled_at */
function toGoogleEvent(appt: any) {
  const scheduledAt = new Date(appt.scheduled_at);
  const endAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000); // +1h default

  return {
    summary:     appt.title,
    description: appt.description || '',
    start: { dateTime: scheduledAt.toISOString(), timeZone: 'America/Sao_Paulo' },
    end:   { dateTime: endAt.toISOString(),       timeZone: 'America/Sao_Paulo' },
    extendedProperties: { private: { finoraId: appt.id } },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const accessToken = await getAccessToken(userId);

    // Get upcoming appointments for user
    const { data: appts } = await getAdmin()
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_at', new Date().toISOString());

    if (!appts?.length) return NextResponse.json({ synced: 0 });

    // Get existing synced map
    const { data: tokenRow } = await getAdmin()
      .from('user_google_tokens')
      .select('synced_events')
      .eq('user_id', userId)
      .single();

    const syncedMap: Record<string, string> = tokenRow?.synced_events || {};

    let synced = 0;
    for (const appt of appts) {
      const event = toGoogleEvent(appt);

      if (syncedMap[appt.id]) {
        // Update existing event
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${syncedMap[appt.id]}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      } else {
        // Create new event
        const res  = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
        const data = await res.json();
        if (data.id) {
          syncedMap[appt.id] = data.id;
        }
      }
      synced++;
    }

    // Save updated map
    await getAdmin().from('user_google_tokens').update({ synced_events: syncedMap }).eq('user_id', userId);

    return NextResponse.json({ synced });
  } catch (e: any) {
    console.error('Google sync error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
