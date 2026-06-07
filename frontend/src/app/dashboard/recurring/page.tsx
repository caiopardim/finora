'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Plus, X, Pencil, Trash2, RefreshCw, Check } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import ConfirmModal from '@/components/ui/ConfirmModal';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

const emptyForm = {
  description: '', amount: '', type: 'expense' as 'income' | 'expense',
  day_of_month: '5', category_id: '', wallet_id: '', active: true,
};

function fmtDisplay(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toRaw(n: number) { return Math.round(n * 100).toString(); }
function parseDisplay(d: string) { return parseFloat(d.replace(/\./g, '').replace(',', '.')) || 0; }

export default function RecurringPage() {
  const { c } = useTheme();
  const [templates, setTemplates] = useState<any[]>([]);
  const [cats, setCats]           = useState<any[]>([]);
  const [wallets, setWallets]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState(emptyForm);
  const [amountRaw, setAmountRaw] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<number | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;
    const [tRes, cRes, wRes] = await Promise.all([
      supabase.from('recurring_templates').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name,icon,color').eq('user_id', uid),
      supabase.from('wallets').select('id,name,icon,color').eq('user_id', uid),
    ]);
    setTemplates(tRes.data || []);
    setCats(cRes.data || []);
    setWallets(wRes.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setAmountRaw(''); setShowForm(true); }
  function openEdit(t: any) {
    setEditing(t);
    setAmountRaw(t.amount ? toRaw(t.amount) : '');
    setForm({ description: t.description, amount: String(t.amount), type: t.type, day_of_month: String(t.day_of_month || 5), category_id: t.category_id || '', wallet_id: t.wallet_id || '', active: t.active });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const payload = {
      description: form.description,
      amount: parseDisplay(fmtDisplay(amountRaw)),
      type: form.type,
      day_of_month: parseInt(form.day_of_month),
      category_id: form.category_id || null,
      wallet_id: form.wallet_id || null,
      active: form.active,
    };
    if (editing) {
      await supabase.from('recurring_templates').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('recurring_templates').insert({ ...payload, user_id: session.user.id });
    }
    setShowForm(false);
    load();
  }

  async function generateNow() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { checkRecurring } = await import('@/lib/recurring');
    const n = await checkRecurring(session.user.id);
    setGenerated(n ?? 0);
    setTimeout(() => setGenerated(null), 3000);
  }

  const inputStyle: React.CSSProperties = { display:'block', width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${c.border}`, fontSize:14, color:c.text, background:c.input, outline:'none', boxSizing:'border-box' };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:c.text, margin:'0 0 2px' }}>Transações Recorrentes</h1>
          <p style={{ color:c.textFaint, fontSize:14, margin:0 }}>Auto-geradas todo mês na data configurada</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={generateNow} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:13, fontWeight:500, cursor:'pointer' }}>
            <RefreshCw size={15}/>{generated !== null ? `${generated} gerada${generated!==1?'s':''}!` : 'Gerar agora'}
          </button>
          <button onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:11, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(34,197,94,0.3)' }}>
            <Plus size={16}/> Nova Recorrência
          </button>
        </div>
      </div>

      {loading ? <p style={{ textAlign:'center', padding:48, color:c.textFaint }}>Carregando...</p> : templates.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', background:c.surface, borderRadius:16, border:`2px dashed ${c.border}` }}>
          <p style={{ fontSize:40, margin:'0 0 12px' }}>🔄</p>
          <p style={{ fontWeight:600, color:c.text, margin:'0 0 4px' }}>Nenhuma recorrência ainda</p>
          <p style={{ color:c.textFaint, fontSize:14, margin:'0 0 20px' }}>Configure salário, aluguel e outras transações mensais</p>
          <button onClick={openCreate} style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'#22c55e', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>Criar primeira recorrência</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {templates.map(t => {
            const cat = cats.find(c => c.id === t.category_id);
            const wal = wallets.find(w => w.id === t.wallet_id);
            return (
              <div key={t.id} style={{ background:c.surface, borderRadius:14, border:`1px solid ${c.border}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, opacity:t.active?1:0.55 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:t.type==='income'?'#dcfce7':'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {t.type==='income'?'💰':'💸'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:15, color:c.text }}>{t.description}</p>
                    {!t.active && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:c.inputBg, color:c.textFaint, fontWeight:600 }}>PAUSADO</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, color:c.textFaint }}>Todo dia {t.day_of_month}</span>
                    {cat && <span style={{ fontSize:12, color:c.textFaint }}>· {cat.icon} {cat.name}</span>}
                    {wal && <span style={{ fontSize:12, color:c.textFaint }}>· {wal.icon} {wal.name}</span>}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ margin:'0 0 6px', fontWeight:800, fontSize:16, color:t.type==='income'?'#22c55e':'#ef4444' }}>
                    {t.type==='income'?'+':'-'}{formatCurrency(t.amount)}
                  </p>
                  <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                    <button onClick={() => supabase.from('recurring_templates').update({ active: !t.active }).eq('id', t.id).then(() => load())} style={{ width:28, height:28, borderRadius:7, border:'none', background:t.active?'#fef9c3':'#f0fdf4', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {t.active ? <span style={{ fontSize:12 }}>⏸</span> : <Check size={13} color="#22c55e"/>}
                    </button>
                    <button onClick={() => openEdit(t)} style={{ width:28, height:28, borderRadius:7, border:'none', background:'#eff6ff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Pencil size={12} color="#3b82f6"/></button>
                    <button onClick={() => setConfirmId(t.id)} style={{ width:28, height:28, borderRadius:7, border:'none', background:'#fef2f2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={12} color="#ef4444"/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmId && (
        <ConfirmModal title="Excluir recorrência?" message="Esta recorrência não será mais gerada automaticamente." confirmLabel="Excluir" danger
          onConfirm={async () => { await supabase.from('recurring_templates').delete().eq('id', confirmId); setConfirmId(null); load(); }}
          onCancel={() => setConfirmId(null)}/>
      )}

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}>
          <div style={{ background:c.surface, borderRadius:20, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', border:`1px solid ${c.border}`, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:`1px solid ${c.borderLight}` }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:c.text }}>{editing ? 'Editar Recorrência' : 'Nova Recorrência'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:c.textFaint }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
              {/* Type */}
              <div style={{ display:'flex', gap:8 }}>
                {(['expense','income'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f=>({...f,type:t}))} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', fontSize:14, fontWeight:500, cursor:'pointer', background:form.type===t?(t==='expense'?'#fee2e2':'#dcfce7'):c.inputBg, color:form.type===t?(t==='expense'?'#dc2626':'#16a34a'):c.textMuted }}>
                    {t==='expense'?'💸 Despesa':'💰 Receita'}
                  </button>
                ))}
              </div>
              {/* Description */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Descrição</label>
                <input required value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Salário, Aluguel..." style={inputStyle}/>
              </div>
              {/* Amount */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Valor (R$)</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:c.textMuted, pointerEvents:'none' }}>R$</span>
                  <input type="text" inputMode="numeric" required value={fmtDisplay(amountRaw)} onChange={e=>setAmountRaw(e.target.value.replace(/\D/g,''))} placeholder="0,00" style={{ ...inputStyle, paddingLeft:36 }}/>
                </div>
              </div>
              {/* Day */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Dia do mês</label>
                <select value={form.day_of_month} onChange={e=>setForm(f=>({...f,day_of_month:e.target.value}))} style={inputStyle}>
                  {DAYS.map(d => <option key={d} value={d}>Dia {d}</option>)}
                </select>
              </div>
              {/* Category */}
              {cats.length > 0 && (
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Categoria</label>
                  <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))} style={inputStyle}>
                    <option value="">Sem categoria</option>
                    {cats.filter(cat=>cat.type===form.type||cat.type==='both'||!cat.type).map(cat=><option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                  </select>
                </div>
              )}
              {/* Wallet */}
              {wallets.length > 0 && (
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Conta</label>
                  <select value={form.wallet_id} onChange={e=>setForm(f=>({...f,wallet_id:e.target.value}))} style={inputStyle}>
                    <option value="">Sem conta específica</option>
                    {wallets.map(w=><option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                <button type="button" onClick={()=>setShowForm(false)} style={{ flex:1, padding:'12px', borderRadius:12, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:14, fontWeight:500, cursor:'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>{editing?'Salvar':'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
