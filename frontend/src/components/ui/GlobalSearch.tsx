'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Result = { type: 'tx' | 'bill' | 'goal'; id: string; title: string; sub: string; value?: number; positive?: boolean };

export default function GlobalSearch() {
  const { c } = useTheme();
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(''); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(search, 280);
    return () => clearTimeout(t);
  }, [query]);

  async function search() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;
    const q   = query.trim();

    const [txRes, billRes, goalRes] = await Promise.all([
      supabase.from('transactions').select('id,type,amount,description,date,categories(name)').eq('user_id', uid).ilike('description', `%${q}%`).order('date', { ascending: false }).limit(5),
      supabase.from('bills').select('id,description,amount,due_date,paid').eq('user_id', uid).ilike('description', `%${q}%`).limit(4),
      supabase.from('goals').select('id,name,target_amount,current_amount').eq('user_id', uid).ilike('name', `%${q}%`).limit(3),
    ]);

    const res: Result[] = [
      ...(txRes.data||[]).map((t:any) => ({
        type: 'tx' as const, id: t.id,
        title: t.description,
        sub: `${(t.categories as any)?.name||'Sem categoria'} · ${new Date(t.date+'T12:00').toLocaleDateString('pt-BR')}`,
        value: Number(t.amount), positive: t.type === 'income',
      })),
      ...(billRes.data||[]).map((b:any) => ({
        type: 'bill' as const, id: b.id,
        title: b.description,
        sub: `Conta · Vence ${new Date(b.due_date+'T12:00').toLocaleDateString('pt-BR')} ${b.paid ? '✅' : '⏳'}`,
        value: Number(b.amount),
      })),
      ...(goalRes.data||[]).map((g:any) => ({
        type: 'goal' as const, id: g.id,
        title: g.name,
        sub: `Meta · ${formatCurrency(g.current_amount||0)} de ${formatCurrency(g.target_amount)}`,
      })),
    ];

    setResults(res);
    setLoading(false);
  }

  const ROUTES: Record<string, string> = { tx: '/dashboard/transactions', bill: '/dashboard/bills', goal: '/dashboard/goals' };

  function go(r: Result) {
    router.push(ROUTES[r.type]);
    setOpen(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:13, cursor:'pointer' }}>
      <Search size={14}/> Buscar… <span style={{ marginLeft:4, fontSize:11, opacity:0.6 }}>⌘K</span>
    </button>
  );

  return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:80, padding:'80px 16px 0' }} onClick={() => setOpen(false)}>
      <div style={{ background:c.surface, borderRadius:18, width:'100%', maxWidth:540, boxShadow:'0 24px 70px rgba(0,0,0,0.3)', border:`1px solid ${c.border}`, overflow:'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:`1px solid ${c.borderLight}` }}>
          <Search size={18} color={c.textFaint}/>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar transações, contas, metas..." style={{ flex:1, border:'none', outline:'none', fontSize:15, color:c.text, background:'transparent' }}/>
          <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:c.textFaint }}><X size={18}/></button>
        </div>

        {/* Results */}
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {loading && <p style={{ textAlign:'center', padding:24, color:c.textFaint, fontSize:13 }}>Buscando...</p>}
          {!loading && query && results.length === 0 && (
            <p style={{ textAlign:'center', padding:32, color:c.textFaint, fontSize:13 }}>Nenhum resultado para "{query}"</p>
          )}
          {!loading && !query && (
            <p style={{ textAlign:'center', padding:24, color:c.textFaint, fontSize:13 }}>Digite para buscar em todo o Finora</p>
          )}
          {results.map((r, i) => (
            <button key={r.id} onClick={() => go(r)} style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'12px 18px', border:'none', borderBottom:i<results.length-1?`1px solid ${c.borderLight}`:'none', background:'transparent', cursor:'pointer', textAlign:'left' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:r.type==='tx'?'#eff6ff':r.type==='bill'?'#fffbeb':'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                {r.type==='tx'?'💳':r.type==='bill'?'📋':'🎯'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:'0 0 2px', fontSize:14, fontWeight:600, color:c.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</p>
                <p style={{ margin:0, fontSize:12, color:c.textFaint }}>{r.sub}</p>
              </div>
              {r.value != null && (
                <span style={{ fontSize:14, fontWeight:700, color:r.positive?'#16a34a':'#dc2626', flexShrink:0 }}>
                  {r.positive?'+':'-'}{formatCurrency(r.value)}
                </span>
              )}
              <ArrowUpRight size={14} color={c.textFaint}/>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding:'10px 18px', borderTop:`1px solid ${c.borderLight}`, display:'flex', gap:16 }}>
          <span style={{ fontSize:11, color:c.textFaint }}>↵ abrir · Esc fechar</span>
        </div>
      </div>
    </div>
  );
}
