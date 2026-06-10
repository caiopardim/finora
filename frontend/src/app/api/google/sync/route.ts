import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60s timeout for Vercel Pro

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
    .from('user_google_tokens').select('*').eq('user_id', userId).single();
  if (!data) throw new Error('Not connected to Google');
  const expired = new Date(data.expires_at) <= new Date(Date.now() + 60_000);
  if (expired && data.refresh_token) return refreshToken(userId, data.refresh_token);
  return data.access_token;
}

function toGoogleEvent(appt: any) {
  const scheduledAt = new Date(appt.scheduled_at);
  const endAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
  return {
    summary:     appt.title,
    description: appt.description || '',
    start: { dateTime: scheduledAt.toISOString(), timeZone: 'America/Sao_Paulo' },
    end:   { dateTime: endAt.toISOString(),       timeZone: 'America/Sao_Paulo' },
    extendedProperties: { private: { finoraId: appt.id } },
  };
}

function toLocalBrazil(d: Date) {
  const utcH = d.getUTCHours();
  const localH = utcH < 3 ? utcH + 21 : utcH - 3;
  return {
    date: d.toISOString().split('T')[0],
    time: `${String(localH).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`,
  };
}

async function importFromGoogle(userId: string, accessToken: string, syncedMap: Record<string, string>) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Fetch all calendars the user has access to
  const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50', { headers });
  const calListData = await calListRes.json();
  if (calListData.error) { console.error('[google-sync] calendarList error:', calListData.error); }
  const calendars: string[] = (calListData.items || []).map((c: any) => c.id);
  if (!calendars.length) calendars.push('primary');
  console.log(`[google-sync] calendars found: ${calendars.length}`);

  // Fetch events from all calendars
  const events: any[] = [];
  for (const calId of calendars) {
    let pageToken: string | undefined;
    do {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '500');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      if (data.error) { console.error(`[google-sync] events error for ${calId}:`, data.error); break; }
      events.push(...(data.items || []));
      pageToken = data.nextPageToken;
    } while (pageToken);
  }
  console.log(`[google-sync] total events fetched across all calendars: ${events.length}`);

  // Get already-imported google_event_ids
  const { data: existingAppts } = await getAdmin()
    .from('appointments').select('google_event_id').eq('user_id', userId);
  const existingGoogleIds = new Set((existingAppts || []).map((a: any) => a.google_event_id).filter(Boolean));
  const finoraExportedIds = new Set(Object.values(syncedMap));

  // Build rows
  const toInsert: any[] = [];
  for (const event of events) {
    if (finoraExportedIds.has(event.id)) continue;
    if (existingGoogleIds.has(event.id)) continue;

    let scheduledAt: string;
    if (event.start?.dateTime) {
      scheduledAt = new Date(event.start.dateTime).toISOString();
    } else if (event.start?.date) {
      scheduledAt = new Date(`${event.start.date}T09:00:00-03:00`).toISOString();
    } else continue;

    const { date, time } = toLocalBrazil(new Date(scheduledAt));
    toInsert.push({
      user_id:         userId,
      title:           event.summary || 'Compromisso',
      description:     event.description || null,
      scheduled_at:    scheduledAt,
      date,
      time:            event.start?.dateTime ? time : null,
      color:           '#4285f4',
      icon:            '📅',
      done:            false,
      google_event_id: event.id,
    });
  }

  console.log(`[google-sync] total fetched: ${events.length}, existingIds: ${existingGoogleIds.size}, finoraIds: ${finoraExportedIds.size}, toInsert: ${toInsert.length}`);

  // Batch insert in chunks of 100
  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const { error } = await getAdmin().from('appointments').insert(toInsert.slice(i, i + 100));
    if (error) console.error('[google-sync] insert error:', JSON.stringify(error));
    else imported += Math.min(100, toInsert.length - i);
  }

  return imported;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const accessToken = await getAccessToken(userId);
    const { data: tokenRow } = await getAdmin()
      .from('user_google_tokens').select('synced_events').eq('user_id', userId).single();
    const syncedMap: Record<string, string> = tokenRow?.synced_events || {};

    // 1. Import Google → Finora
    const imported = await importFromGoogle(userId, accessToken, syncedMap);

    // 2. Push Finora → Google (only non-Google-imported appointments)
    const { data: appts } = await getAdmin()
      .from('appointments').select('*').eq('user_id', userId)
      .gte('scheduled_at', new Date().toISOString());

    let synced = 0;
    for (const appt of appts || []) {
      if (appt.google_event_id) continue; // skip Google-imported ones
      const event = toGoogleEvent(appt);
      if (syncedMap[appt.id]) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${syncedMap[appt.id]}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      } else {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
        const data = await res.json();
        if (data.id) syncedMap[appt.id] = data.id;
      }
      synced++;
    }

    await getAdmin().from('user_google_tokens').update({ synced_events: syncedMap }).eq('user_id', userId);
    return NextResponse.json({ synced, imported });
  } catch (e: any) {
    console.error('Google sync error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
