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
  // Build a dateTime from either scheduled_at or date+time fields
  let startISO: string;
  if (appt.scheduled_at) {
    startISO = new Date(appt.scheduled_at).toISOString();
  } else if (appt.date && appt.time) {
    startISO = new Date(`${appt.date}T${appt.time}:00-03:00`).toISOString();
  } else if (appt.date) {
    startISO = new Date(`${appt.date}T09:00:00-03:00`).toISOString();
  } else {
    startISO = new Date().toISOString();
  }
  const endISO = new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString();
  return {
    summary:     appt.title,
    description: appt.description || '',
    start: { dateTime: startISO, timeZone: 'America/Sao_Paulo' },
    end:   { dateTime: endISO,   timeZone: 'America/Sao_Paulo' },
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

async function importFromGoogle(userId: string, accessToken: string, syncedMap: Record<string, string>, deadline: number) {
  // Janela ampla: 1 ano atrás → 1 ano à frente, para puxar TUDO (não só o futuro)
  const timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Fetch all calendars the user has access to
  const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50', { headers });
  const calListData = await calListRes.json();
  if (calListData.error) { console.error('[google-sync] calendarList error:', JSON.stringify(calListData.error)); }
  // Ignora calendários de feriados/aniversários/semana/clima (ruído), mantém os do usuário
  const isNoise = (id: string) => /holiday|#contacts|weeknum|#weather|birthday/i.test(id || '');
  let calendars: string[] = (calListData.items || [])
    .filter((c: any) => !isNoise(c.id))
    .map((c: any) => c.id);
  if (!calendars.length) calendars.push('primary');
  // Prioriza o calendário principal
  calendars = ['primary', ...calendars.filter((c) => c !== 'primary')];
  console.log(`[google-sync] calendars found: ${calendars.length}`);

  // IDs já conhecidos (para não duplicar)
  const { data: existingAppts } = await getAdmin()
    .from('appointments').select('google_event_id').eq('user_id', userId);
  const knownIds = new Set<string>((existingAppts || []).map((a: any) => a.google_event_id).filter(Boolean));
  Object.values(syncedMap).forEach((id) => knownIds.add(id as string));

  const admin = getAdmin();
  let imported = 0;

  // Busca e insere de forma INCREMENTAL (por página) — se o tempo estourar,
  // o que já entrou fica salvo e a próxima sync continua de onde parou.
  for (const calId of calendars) {
    if (Date.now() > deadline) { console.log('[google-sync] deadline no loop de calendários'); break; }
    let pageToken: string | undefined;
    do {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '250');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      if (data.error) { console.error(`[google-sync] events error for ${calId}:`, JSON.stringify(data.error)); break; }

      const rows: any[] = [];
      for (const event of (data.items || [])) {
        if (!event.id || knownIds.has(event.id)) continue;
        if (event.status === 'cancelled') continue;

        let scheduledAt: string;
        if (event.start?.dateTime) {
          scheduledAt = new Date(event.start.dateTime).toISOString();
        } else if (event.start?.date) {
          scheduledAt = new Date(`${event.start.date}T09:00:00-03:00`).toISOString();
        } else continue;

        knownIds.add(event.id); // evita duplicar dentro da mesma execução
        const { date, time } = toLocalBrazil(new Date(scheduledAt));
        rows.push({
          user_id: userId,
          title: event.summary || 'Compromisso',
          description: event.description || null,
          scheduled_at: scheduledAt,
          date,
          time: event.start?.dateTime ? time : null,
          color: '#4285f4',
          icon: '📅',
          done: false,
          google_event_id: event.id,
        });
      }

      // Insere esta página imediatamente
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await admin.from('appointments').insert(rows.slice(i, i + 100));
        if (error) console.error('[google-sync] insert error:', JSON.stringify(error));
        else imported += Math.min(100, rows.length - i);
      }

      pageToken = data.nextPageToken;
    } while (pageToken && Date.now() <= deadline);
  }

  console.log(`[google-sync] imported total: ${imported}`);
  return imported;
}

// Importa as TAREFAS (Google Tasks — API separada dos eventos) que têm data
async function importTasksFromGoogle(userId: string, accessToken: string, deadline: number): Promise<number> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Lista de listas de tarefas
  const listsRes = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists?maxResults=100', { headers });
  const listsData = await listsRes.json();
  if (listsData.error) {
    // Token sem escopo de tasks (usuário precisa reconectar) → ignora silenciosamente
    console.error('[google-sync] tasks lists error:', JSON.stringify(listsData.error));
    return 0;
  }
  const taskLists: string[] = (listsData.items || []).map((l: any) => l.id);
  if (!taskLists.length) return 0;

  // IDs já conhecidos (dedup) — tarefas usam prefixo gtask_
  const { data: existingAppts } = await getAdmin()
    .from('appointments').select('google_event_id').eq('user_id', userId);
  const knownIds = new Set<string>((existingAppts || []).map((a: any) => a.google_event_id).filter(Boolean));

  const admin = getAdmin();
  let imported = 0;

  for (const listId of taskLists) {
    if (Date.now() > deadline) break;
    let pageToken: string | undefined;
    do {
      const url = new URL(`https://www.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`);
      url.searchParams.set('showCompleted', 'true');
      url.searchParams.set('showHidden', 'false');
      url.searchParams.set('maxResults', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      if (data.error) { console.error('[google-sync] tasks error:', JSON.stringify(data.error)); break; }

      const rows: any[] = [];
      for (const task of (data.items || [])) {
        if (!task.id || !task.due) continue; // só tarefas com data (aparecem no calendário)
        const gid = `gtask_${task.id}`;
        if (knownIds.has(gid)) continue;

        // task.due é data (meia-noite UTC). Trata como data local BR às 09:00.
        const day = task.due.split('T')[0];
        const scheduledAt = new Date(`${day}T09:00:00-03:00`).toISOString();
        knownIds.add(gid);
        const { date } = toLocalBrazil(new Date(scheduledAt));
        rows.push({
          user_id: userId,
          title: task.title || 'Tarefa',
          description: task.notes || null,
          scheduled_at: scheduledAt,
          date,
          time: null,
          color: '#f59e0b',
          icon: '📝',
          done: task.status === 'completed',
          google_event_id: gid,
        });
      }

      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await admin.from('appointments').insert(rows.slice(i, i + 100));
        if (error) console.error('[google-sync] task insert error:', JSON.stringify(error));
        else imported += Math.min(100, rows.length - i);
      }

      pageToken = data.nextPageToken;
    } while (pageToken && Date.now() <= deadline);
  }

  console.log(`[google-sync] tasks imported: ${imported}`);
  return imported;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    // Orçamento de tempo: retorna antes do limite da função serverless
    // (Vercel Hobby corta em ~10s). A importação é incremental e roda primeiro,
    // então o que couber é salvo; o que faltar entra na próxima sync (sem duplicar).
    const deadline = Date.now() + 9000;

    const accessToken = await getAccessToken(userId);
    const { data: tokenRow } = await getAdmin()
      .from('user_google_tokens').select('synced_events').eq('user_id', userId).single();
    const syncedMap: Record<string, string> = tokenRow?.synced_events || {};

    // 1. Import Google → Finora (eventos + tarefas)
    const importedEvents = await importFromGoogle(userId, accessToken, syncedMap, deadline);
    const importedTasks = await importTasksFromGoogle(userId, accessToken, deadline);
    const imported = importedEvents + importedTasks;

    // 2. Push Finora → Google (apenas compromissos não importados do Google)
    const today = new Date().toISOString().slice(0, 10);
    const { data: appts } = await getAdmin()
      .from('appointments').select('*').eq('user_id', userId)
      .gte('date', today);

    const pending = (appts || []).filter((a: any) => !a.google_event_id);

    const pushOne = async (appt: any): Promise<boolean> => {
      const event = toGoogleEvent(appt);
      try {
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
        return true;
      } catch {
        return false;
      }
    };

    // Envia em lotes paralelos, respeitando o orçamento de tempo
    let synced = 0;
    const BATCH = 5;
    for (let i = 0; i < pending.length; i += BATCH) {
      if (Date.now() > deadline) { console.log('[google-sync] deadline atingido no push'); break; }
      const results = await Promise.all(pending.slice(i, i + BATCH).map(pushOne));
      synced += results.filter(Boolean).length;
    }

    await getAdmin().from('user_google_tokens').update({ synced_events: syncedMap }).eq('user_id', userId);
    return NextResponse.json({ synced, imported });
  } catch (e: any) {
    console.error('Google sync error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
