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

/** Convert Finora appointment to Google Calendar event */
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

/** Import Google Calendar events into Finora appointments */
async function importFromGoogle(userId: string, accessToken: string, syncedMap: Record<string, string>) {
  // Fetch upcoming events from Google Calendar
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // next 90 days

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  console.log('[google-sync] Google events response:', JSON.stringify({ status: res.status, itemCount: data.items?.length, error: data.error, firstEvent: data.items?.[0] ? { id: data.items[0].id, summary: data.items[0].summary, start: data.items[0].start } : null }));
  const events = data.items || [];

  // Get existing Finora appointments to avoid duplicates
  const { data: existingAppts } = await getAdmin()
    .from('appointments')
    .select('id, title, scheduled_at, google_event_id')
    .eq('user_id', userId);

  const existingGoogleIds = new Set((existingAppts || []).map((a: any) => a.google_event_id).filter(Boolean));
  // Also check synced map values (Finora→Google events)
  const finoraExportedIds = new Set(Object.values(syncedMap));

  let imported = 0;
  console.log('[google-sync] finoraExportedIds:', JSON.stringify(Array.from(finoraExportedIds)));
  console.log('[google-sync] existingGoogleIds:', JSON.stringify(Array.from(existingGoogleIds)));
  for (const event of events) {
    // Skip events already exported from Finora to Google
    if (finoraExportedIds.has(event.id)) { console.log('[google-sync] skip (finora exported):', event.id); continue; }
    // Skip already imported events
    if (existingGoogleIds.has(event.id)) { console.log('[google-sync] skip (already imported):', event.id); continue; }
    // Handle both timed and all-day events
    let scheduledAt: string;
    if (event.start?.dateTime) {
      scheduledAt = new Date(event.start.dateTime).toISOString();
    } else if (event.start?.date) {
      // All-day event: set to 9am Brazil time
      scheduledAt = new Date(`${event.start.date}T09:00:00-03:00`).toISOString();
    } else {
      continue;
    }

    console.log('[google-sync] inserting event:', event.id, event.summary, scheduledAt);
    const { error: insertError } = await getAdmin().from('appointments').insert({
      user_id:         userId,
      title:           event.summary || 'Compromisso',
      description:     event.description || null,
      scheduled_at:    scheduledAt,
      google_event_id: event.id,
    });
    if (insertError) {
      console.error('[google-sync] INSERT error:', JSON.stringify(insertError));
    } else {
      imported++;
    }
  }

  return imported;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const accessToken = await getAccessToken(userId);

    // Get existing synced map
    const { data: tokenRow } = await getAdmin()
      .from('user_google_tokens')
      .select('synced_events')
      .eq('user_id', userId)
      .single();

    const syncedMap: Record<string, string> = tokenRow?.synced_events || {};

    // 1. Import Google Calendar → Finora
    const imported = await importFromGoogle(userId, accessToken, syncedMap);

    // 2. Push Finora appointments → Google Calendar
    const { data: appts } = await getAdmin()
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_at', new Date().toISOString());

    let synced = 0;
    for (const appt of appts || []) {
      // Skip events that came from Google (avoid loop)
      if (appt.google_event_id) continue;

      const event = toGoogleEvent(appt);

      if (syncedMap[appt.id]) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${syncedMap[appt.id]}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      } else {
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

    return NextResponse.json({ synced, imported });
  } catch (e: any) {
    console.error('Google sync error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
