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
  const refreshToken = rt;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
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

/** Convert appointment to Google Calendar event */
function toGoogleEvent(appt: any) {
  const dateStr = appt.date; // YYYY-MM-DD
  let start: any, end: any;

  if (appt.time) {
    const startDt = `${dateStr}T${appt.time}:00`;
    const endDt   = `${dateStr}T${appt.time.slice(0,2)}:${String(Number(appt.time.slice(3,5)) + 30).padStart(2,'0')}:00`;
    start = { dateTime: startDt, timeZone: 'America/Sao_Paulo' };
    end   = { dateTime: endDt,   timeZone: 'America/Sao_Paulo' };
  } else {
    start = { date: dateStr };
    end   = { date: dateStr };
  }

  return {
    summary:     `${appt.icon} ${appt.title}`,
    description: appt.description || '',
    start,
    end,
    colorId: colorToGoogleId(appt.color),
    extendedProperties: { private: { finoraId: appt.id } },
  };
}

function colorToGoogleId(hex: string): string {
  const map: Record<string, string> = {
    '#6366f1': '9', '#22c55e': '2', '#f97316': '6',
    '#3b82f6': '1', '#ec4899': '4', '#eab308': '5',
    '#ef4444': '11', '#06b6d4': '7',
  };
  return map[hex] || '1';
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const accessToken = await getAccessToken(userId);

    // Get all appointments for user
    const { data: appts } = await getAdmin()
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date().toISOString().split('T')[0]);

    if (!appts?.length) return NextResponse.json({ synced: 0 });

    let synced = 0;
    for (const appt of appts) {
      const event = toGoogleEvent(appt);

      // Check if already synced (by finoraId in extendedProperties)
      const existing = await getAdmin()
        .from('user_google_tokens')
        .select('synced_events')
        .eq('user_id', userId)
        .single();

      const syncedMap: Record<string, string> = existing.data?.synced_events || {};

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
          await getAdmin().from('user_google_tokens').update({ synced_events: syncedMap }).eq('user_id', userId);
        }
      }
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
