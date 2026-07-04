'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Plus, X, Check, Clock, ChevronLeft, ChevronRight, Pencil, Trash2, RefreshCw, CalendarDays, Unlink } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
dayjs.locale('pt-br');

const COLORS = ['#6366f1','#22c55e','#f97316','#3b82f6','#ec4899','#eab308','#ef4444','#06b6d4'];
const ICONS  = ['📅','💼','🏥','🎂','✈️','🎓','🏋️','📞','🍽️','🎵','💰','🤝','🏠','🐾','📝'];

const emptyForm = { title: '', date: '', time: '', description: '', color: '#6366f1', icon: '📅' };

type Appt = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  description: string | null;
  color: string;
  icon: string;
  done: boolean;
};

export default function AgendaPage() {
  const { c, isDark } = useTheme();
  const [appts, setAppts]       = useState<Appt[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Appt | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState('');
  const [view, setView]         = useState<'month' | 'list'>('month');
  const [upcoming, setUpcoming] = useState<Appt[]>([]);
  const [undated, setUndated]   = useState<Appt[]>([]);

  async function loadUpcoming() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const from = dayjs().format('YYYY-MM-DD');
    const [up, un] = await Promise.all([
      supabase.from('appointments').select('*').eq('user_id', session.user.id)
        .gte('date', from).order('date').order('time', { nullsFirst: true }).limit(300),
      supabase.from('appointments').select('*').eq('user_id', session.user.id)
        .is('date', null).order('created_at', { ascending: false }).limit(100),
    ]);
    setUpcoming(up.data || []);
    setUndated(un.data || []);
  }

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Check Google connection
    const { data: gtok } = await supabase
      .from('user_google_tokens')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    setGoogleConnected(!!gtok);

    // Check URL params for google connect result
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('google') === 'connected') { setSyncMsg('Google Agenda conectado! ✅'); window.history.replaceState({}, '', window.location.pathname); }
      if (p.get('google') === 'error')     { setSyncMsg('Erro ao conectar. Tente novamente.'); window.history.replaceState({}, '', window.location.pathname); }
    }

    const start = currentMonth.format('YYYY-MM-DD');
    const end   = currentMonth.endOf('month').format('YYYY-MM-DD');
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date').order('time', { nullsFirst: true });
    setAppts(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentMonth]);
  useEffect(() => { if (view === 'list') loadUpcoming(); }, [view]);

  // Auto-sync silencioso ao abrir a agenda (no máximo 1x a cada 30 min)
  useEffect(() => {
    if (!googleConnected) return;
    const key = 'finora-agenda-autosync';
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < 30 * 60 * 1000) return;
    localStorage.setItem(key, String(Date.now()));
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch('/api/google/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id }) });
        const d = await res.json();
        if (d?.imported) {
          await load();
          if (view === 'list') await loadUpcoming();
          setSyncMsg(`${d.imported} novo(s) compromisso(s) do Google ✅`);
          setTimeout(() => setSyncMsg(''), 5000);
        }
      } catch { /* silencioso */ }
    })();
  }, [googleConnected]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, date: selectedDate });
    setShowForm(true);
  }

  function openEdit(a: Appt) {
    setEditing(a);
    setForm({ title: a.title, date: a.date, time: a.time||'', description: a.description||'', color: a.color, icon: a.icon });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const payload = {
      title: form.title,
      date: form.date,
      time: form.time || null,
      description: form.description || null,
      color: form.color,
      icon: form.icon,
    };
    if (editing) {
      await supabase.from('appointments').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('appointments').insert({ ...payload, user_id: session.user.id, done: false });
    }
    setShowForm(false);
    load();
    if (view === 'list') loadUpcoming();
  }

  async function toggleDone(a: Appt) {
    await supabase.from('appointments').update({ done: !a.done }).eq('id', a.id);
    setAppts(prev => prev.map(x => x.id === a.id ? { ...x, done: !x.done } : x));
    setUpcoming(prev => prev.map(x => x.id === a.id ? { ...x, done: !x.done } : x));
    setUndated(prev => prev.map(x => x.id === a.id ? { ...x, done: !x.done } : x));
  }

  async function doDelete() {
    if (!confirmId) return;
    await supabase.from('appointments').delete().eq('id', confirmId);
    setConfirmId(null);
    load();
    if (view === 'list') loadUpcoming();
  }

  async function connectGoogle() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const clientId   = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const baseUrl    = window.location.origin;
    const redirectUri = `${baseUrl}/api/google/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks.readonly';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${session.user.id}`;
    window.location.href = url;
  }

  async function syncGoogle() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const res  = await fetch('/api/google/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Recarrega a lista para exibir os eventos importados do Google
      await load();
      const parts: string[] = [];
      if (data.imported) parts.push(`${data.imported} importado(s) do Google`);
      if (data.synced)   parts.push(`${data.synced} enviado(s)`);
      setSyncMsg((parts.length ? parts.join(' · ') : 'Tudo sincronizado') + ' ✅');
    } catch (e: any) {
      setSyncMsg('Erro ao sincronizar: ' + e.message);
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 6000);
  }

  async function disconnectGoogle() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/google/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id }) });
    setGoogleConnected(false);
    setSyncMsg('Google Agenda desconectado.');
    setTimeout(() => setSyncMsg(''), 3000);
  }

  // Calendar helpers
  const daysInMonth = currentMonth.daysInMonth();
  const firstDow    = currentMonth.day(); // 0=sun
  const today       = dayjs().format('YYYY-MM-DD');

  // Map date → appts count
  const countByDate: Record<string, number> = {};
  const doneByDate:  Record<string, boolean> = {};
  for (const a of appts) {
    countByDate[a.date] = (countByDate[a.date] || 0) + 1;
    if (!a.done) doneByDate[a.date] = false;
    else if (doneByDate[a.date] === undefined) doneByDate[a.date] = true;
  }

  const dayAppts = appts.filter(a => a.date === selectedDate).sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    borderRadius: 10, border: `1.5px solid ${c.border}`,
    fontSize: 14, color: c.text, background: c.input,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: syncMsg ? 12 : 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Agenda</h1>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Seus compromissos organizados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {googleConnected ? (
            <>
              <button onClick={syncGoogle} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1.5px solid #4285f4', background: '#eff6ff', color: '#4285f4', fontSize: 13, fontWeight: 600, cursor: syncing ? 'wait' : 'pointer' }}>
                <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}/> {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button onClick={disconnectGoogle} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Unlink size={13}/> Desconectar Google
              </button>
            </>
          ) : (
            <button onClick={connectGoogle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: '1.5px solid #4285f4', background: '#fff', color: '#4285f4', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <CalendarDays size={15}/> Conectar Google Agenda
            </button>
          )}
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            <Plus size={16}/> Novo compromisso
          </button>
        </div>
      </div>

      {syncMsg && (
        <div style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 10, background: syncMsg.includes('Erro') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${syncMsg.includes('Erro') ? '#fecaca' : '#bbf7d0'}`, color: syncMsg.includes('Erro') ? '#dc2626' : '#16a34a', fontSize: 13, fontWeight: 500 }}>
          {syncMsg}
        </div>
      )}

      {/* Toggle Calendário / Lista */}
      <div style={{ display: 'inline-flex', gap: 4, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {([['month', '📅 Calendário'], ['list', '📋 Lista']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: view === v ? '#6366f1' : 'transparent', color: view === v ? '#fff' : c.textMuted,
          }}>{label}</button>
        ))}
      </div>

      {/* Visão em LISTA (agenda corrida) */}
      {view === 'list' && (
        <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: 'hidden' }}>
          {upcoming.length === 0 && undated.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: c.textFaint, fontSize: 14, margin: 0 }}>
              Nenhum compromisso a partir de hoje. Crie um novo! 📅
            </p>
          ) : (
            Object.entries(
              upcoming.reduce((acc: Record<string, Appt[]>, a) => { (acc[a.date] ||= []).push(a); return acc; }, {})
            ).map(([date, items]) => (
              <div key={date}>
                <div style={{ padding: '10px 20px', background: c.bg, borderBottom: `1px solid ${c.borderLight}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: date === today ? '#6366f1' : c.text, textTransform: 'capitalize' }}>
                    {dayjs(date).locale('pt-br').format('ddd, DD [de] MMMM')}
                  </span>
                  {date === today && <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#6366f120', padding: '2px 8px', borderRadius: 99 }}>hoje</span>}
                </div>
                {items.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${c.borderLight}`, opacity: a.done ? 0.55 : 1 }}>
                    <button onClick={() => toggleDone(a)} title={a.done ? 'Marcar como pendente' : 'Concluir'} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${a.done ? '#22c55e' : c.border}`, background: a.done ? '#22c55e' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
                      {a.done ? '✓' : ''}
                    </button>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon || '📅'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.text, textDecoration: a.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                      {a.time && <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>{a.time.slice(0, 5)}</p>}
                    </div>
                    <button onClick={() => openEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint, padding: 4 }}>✏️</button>
                    <button onClick={() => setConfirmId(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, fontSize: 14 }}>✕</button>
                  </div>
                ))}
              </div>
            ))
          )}

          {/* Tarefas sem data de vencimento */}
          {undated.length > 0 && (
            <div>
              <div style={{ padding: '10px 20px', background: c.bg, borderBottom: `1px solid ${c.borderLight}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.textMuted }}>📌 Sem data</span>
                <span style={{ fontSize: 11, color: c.textFaint }}>({undated.length})</span>
              </div>
              {undated.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${c.borderLight}`, opacity: a.done ? 0.55 : 1 }}>
                  <button onClick={() => toggleDone(a)} title={a.done ? 'Marcar como pendente' : 'Concluir'} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${a.done ? '#22c55e' : c.border}`, background: a.done ? '#22c55e' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
                    {a.done ? '✓' : ''}
                  </button>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon || '📝'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.text, textDecoration: a.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                  </div>
                  <button onClick={() => setConfirmId(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, fontSize: 14 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: view === 'month' ? 'grid' : 'none', gridTemplateColumns: 'minmax(0,1fr)', gap: 20, alignItems: 'start' }} className="agenda-grid">

        {/* Calendar */}
        <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${c.border}`, padding: 24, boxShadow: c.shadow }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={() => setCurrentMonth(m => m.subtract(1,'month'))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8 }}>
              <ChevronLeft size={18}/>
            </button>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: c.text, textTransform: 'capitalize' }}>
              {currentMonth.format('MMMM [de] YYYY')}
            </p>
            <button onClick={() => setCurrentMonth(m => m.add(1,'month'))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8 }}>
              <ChevronRight size={18}/>
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: c.textFaint, letterSpacing: '0.04em', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {/* Empty cells before first day */}
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`}/>)}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d    = i + 1;
              const date = currentMonth.date(d).format('YYYY-MM-DD');
              const isSelected = date === selectedDate;
              const isToday    = date === today;
              const count      = countByDate[date] || 0;

              return (
                <button key={d} onClick={() => setSelectedDate(date)} style={{
                  padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: isSelected ? '#6366f1' : isToday ? (isDark ? '#1e1b4b' : '#eef2ff') : 'transparent',
                  color: isSelected ? '#fff' : isToday ? '#6366f1' : c.text,
                  fontWeight: isSelected || isToday ? 700 : 400,
                  fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  {d}
                  {count > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array.from({ length: Math.min(count, 3) }).map((_, ci) => (
                        <div key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : '#6366f1' }}/>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${c.border}`, overflow: 'hidden', boxShadow: c.shadow }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${c.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: c.text, textTransform: 'capitalize' }}>
                {dayjs(selectedDate).locale('pt-br').format('dddd')}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: c.textFaint }}>
                {dayjs(selectedDate).format('DD/MM/YYYY')}
              </p>
            </div>
            <button onClick={openCreate} style={{ width: 32, height: 32, borderRadius: 9, background: '#6366f1', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} color="#fff"/>
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: 40, color: c.textFaint, fontSize: 13 }}>Carregando...</p>
          ) : dayAppts.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 8px' }}>📭</p>
              <p style={{ fontSize: 13, color: c.textFaint, margin: 0 }}>Nenhum compromisso neste dia</p>
            </div>
          ) : (
            <div style={{ padding: '8px 12px' }}>
              {dayAppts.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 8px', borderRadius: 12, marginBottom: 4 }}>
                  {/* Color bar + icon */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 2 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{a.icon}</div>
                    <div style={{ width: 2, flex: 1, background: a.color+'40', borderRadius: 99, minHeight: 8 }}/>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: a.done ? c.textFaint : c.text, textDecoration: a.done ? 'line-through' : 'none' }}>{a.title}</p>
                    {a.time && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <Clock size={11} color={c.textFaint}/>
                        <span style={{ fontSize: 12, color: c.textFaint }}>{a.time.slice(0,5)}</span>
                      </div>
                    )}
                    {a.description && <p style={{ margin: 0, fontSize: 12, color: c.textFaint, lineHeight: 1.4 }}>{a.description}</p>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => toggleDone(a)} title={a.done ? 'Desmarcar' : 'Concluir'} style={{ width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${a.done ? '#22c55e' : c.border}`, background: a.done ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {a.done && <Check size={13} color="#fff"/>}
                    </button>
                    <button onClick={() => openEdit(a)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={12} color="#3b82f6"/>
                    </button>
                    <button onClick={() => setConfirmId(a.id)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} color="#ef4444"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm delete */}
      {confirmId && (
        <ConfirmModal
          title="Excluir compromisso?"
          message="Este compromisso será removido permanentemente."
          confirmLabel="Excluir"
          onConfirm={doDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={() => setShowForm(false)}>
          <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: `1px solid ${c.border}`, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>{editing ? 'Editar compromisso' : 'Novo compromisso'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint }}><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Icon picker */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Ícone</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))} style={{ width: 36, height: 36, borderRadius: 9, border: `2px solid ${form.icon===icon ? form.color : c.border}`, background: form.icon===icon ? form.color+'20' : 'transparent', fontSize: 18, cursor: 'pointer' }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Título *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Consulta médica" style={inputStyle}/>
              </div>

              {/* Date + Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Data *</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Horário</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={inputStyle}/>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes opcionais..." rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}/>
              </div>

              {/* Color */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Cor</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))} style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: form.color===color ? `3px solid ${c.text}` : '3px solid transparent', cursor: 'pointer' }}/>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  {editing ? 'Salvar' : 'Criar compromisso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
