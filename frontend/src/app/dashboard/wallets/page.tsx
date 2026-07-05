'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/theme-context';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/toast';
import { Plus, X, Check, Pencil, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const ICONS  = ['🏦','💳','💵','🏧','📱','💰','🐷','🏠','✈️','💼'];
const COLORS = ['#6366f1','#22c55e','#f97316','#3b82f6','#ec4899','#eab308','#ef4444','#06b6d4','#10b981','#8b5cf6'];
const TYPES  = [
  { value: 'bank',   label: 'Conta bancária', icon: '🏦' },
  { value: 'cash',   label: 'Dinheiro físico', icon: '💵' },
  { value: 'credit', label: 'Cartão de crédito', icon: '💳' },
  { value: 'invest', label: 'Investimentos', icon: '📈' },
];

const emptyForm = { name: '', icon: '🏦', color: '#6366f1', type: 'bank' };

export default function WalletsPage() {
  const { c } = useTheme();
  const [wallets, setWallets] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState(emptyForm);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;

    const [walletsRes, txRes] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', uid).order('name'),
      supabase.from('transactions').select('wallet_id,type,amount').eq('user_id', uid),
    ]);

    // Compute balance per wallet
    const bal: Record<string, number> = {};
    for (const t of (txRes.data || [])) {
      const wid = t.wallet_id || 'none';
      if (!bal[wid]) bal[wid] = 0;
      bal[wid] += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
    }

    setWallets(walletsRes.data || []);
    setBalances(bal);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(w: any) { setEditing(w); setForm({ name: w.name, icon: w.icon, color: w.color, type: w.type }); setShowForm(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (editing) {
      await supabase.from('wallets').update(form).eq('id', editing.id);
    } else {
      await supabase.from('wallets').insert({ ...form, user_id: session.user.id });
    }
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast(editing ? 'Conta atualizada!' : 'Conta criada!');
    load();
  }

  async function doDelete() {
    if (!confirmId) return;
    await supabase.from('wallets').delete().eq('id', confirmId);
    setConfirmId(null);
    toast('Conta removida', 'info');
    load();
  }

  const totalBalance = wallets.reduce((s, w) => s + (balances[w.id] || 0), 0);

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    borderRadius: 10, border: `1.5px solid ${c.border}`,
    fontSize: 14, color: c.text, background: c.input,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Contas</h1>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Gerencie de onde vem e para onde vai seu dinheiro</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
          <Plus size={16}/> Nova Conta
        </button>
      </div>

      {/* Total balance */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: 18, padding: '22px 24px', marginBottom: 20, color: '#fff' }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, opacity: 0.8, fontWeight: 500 }}>Patrimônio Total</p>
        <p style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 32px)' as any, fontWeight: 800, letterSpacing: '-0.5px' }}>{formatCurrency(totalBalance)}</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>{wallets.length} conta{wallets.length !== 1 ? 's' : ''} cadastrada{wallets.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? <ListSkeleton/> : (
        <>
          {wallets.length === 0 ? (
            <div style={{ background: c.surface, borderRadius: 18, border: `1px solid ${c.border}`, padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 36, margin: '0 0 12px' }}>🏦</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: '0 0 6px' }}>Nenhuma conta ainda</p>
              <p style={{ fontSize: 13, color: c.textFaint, margin: '0 0 20px' }}>Crie suas contas para vincular às transações</p>
              <button onClick={openCreate} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Criar primeira conta</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {wallets.map(w => {
                const bal     = balances[w.id] || 0;
                const typeInfo = TYPES.find(t => t.value === w.type) || TYPES[0];
                return (
                  <div key={w.id} style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, padding: '18px 20px', boxShadow: c.shadow, borderTop: `3px solid ${w.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: w.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{w.icon}</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: c.text }}>{w.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: c.textFaint }}>{typeInfo.label}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => openEdit(w)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pencil size={12} color="#3b82f6"/>
                        </button>
                        <button onClick={() => setConfirmId(w.id)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={12} color="#ef4444"/>
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: c.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo atual</p>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: bal >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(bal)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Confirm delete */}
      {confirmId && (
        <ConfirmModal title="Excluir conta?" message="As transações vinculadas perderão a referência desta conta." confirmLabel="Excluir" onConfirm={doDelete} onCancel={() => setConfirmId(null)}/>
      )}

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={() => setShowForm(false)}>
          <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: `1px solid ${c.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>{editing ? 'Editar Conta' : 'Nova Conta'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Tipo</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${form.type === t.value ? '#6366f1' : c.border}`, background: form.type === t.value ? '#eef2ff' : c.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: form.type === t.value ? 600 : 400, color: form.type === t.value ? '#6366f1' : c.textMuted }}>
                      <span>{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nome *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Nubank, Bradesco, Carteira..." style={inputStyle}/>
              </div>

              {/* Icon */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Ícone</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))} style={{ width: 36, height: 36, borderRadius: 9, border: `2px solid ${form.icon === icon ? form.color : c.border}`, background: form.icon === icon ? form.color + '20' : 'transparent', fontSize: 18, cursor: 'pointer' }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Cor</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))} style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: form.color === color ? `3px solid ${c.text}` : '3px solid transparent', cursor: 'pointer' }}/>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textMuted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  {editing ? 'Salvar' : 'Criar conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
