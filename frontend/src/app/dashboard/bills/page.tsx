'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Plus, X, Check, Trash2, Pencil, AlertCircle, CreditCard } from 'lucide-react';
import dayjs from 'dayjs';
import { useTheme } from '@/lib/theme-context';
const uuidv4 = () => crypto.randomUUID();

type Bill = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
  recurrent: boolean;
  installments: number;
  installment_number: number;
  installment_group?: string;
  category_id?: string;
  categories?: { name: string; icon: string; color: string };
};

const emptyForm = {
  description: '', amount: '', due_date: '', recurrent: false,
  category_id: '', tipo: 'normal' as 'normal' | 'recurrent' | 'installment',
  installments: '2',
};

export default function BillsPage() {
  const { c } = useTheme();
  const [bills, setBills]       = useState<Bill[]>([]);
  const [cats, setCats]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Bill | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [filter, setFilter]     = useState<'all' | 'pending' | 'paid'>('pending');

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const [{ data: b }, { data: c_ }] = await Promise.all([
      supabase.from('bills')
        .select('*, categories(name,icon,color)')
        .eq('user_id', session.user.id)
        .order('due_date', { ascending: true }),
      supabase.from('categories').select('id,name,icon,color').eq('user_id', session.user.id).eq('type', 'expense'),
    ]);
    setBills(b || []);
    setCats(c_ || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setShowForm(true); }

  function openEdit(b: Bill) {
    setEditing(b);
    setForm({
      description: b.description, amount: String(b.amount), due_date: b.due_date,
      recurrent: b.recurrent, category_id: b.category_id || '',
      tipo: b.installments > 1 ? 'installment' : b.recurrent ? 'recurrent' : 'normal',
      installments: String(b.installments || 2),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const base = {
      user_id: session.user.id,
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      category_id: form.category_id || null,
      paid: false,
    };

    if (editing) {
      const { error } = await supabase.from('bills').update({
        description: form.description,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        recurrent: form.tipo === 'recurrent',
        category_id: form.category_id || null,
      }).eq('id', editing.id);
      if (error) { alert(error.message); return; }
    } else if (form.tipo === 'installment') {
      const n = parseInt(form.installments) || 2;
      const group = uuidv4();
      const rows = Array.from({ length: n }, (_, i) => ({
        ...base,
        description: `${form.description} (${i + 1}/${n})`,
        due_date: dayjs(form.due_date).add(i, 'month').format('YYYY-MM-DD'),
        recurrent: false,
        installments: n,
        installment_number: i + 1,
        installment_group: group,
      }));
      const { error } = await supabase.from('bills').insert(rows);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supabase.from('bills').insert({
        ...base,
        recurrent: form.tipo === 'recurrent',
        installments: 1,
        installment_number: 1,
      });
      if (error) { alert(error.message); return; }
    }

    setShowForm(false);
    load();
  }

  async function togglePaid(bill: Bill) {
    const paid = !bill.paid;
    await supabase.from('bills').update({ paid, paid_date: paid ? dayjs().format('YYYY-MM-DD') : null }).eq('id', bill.id);
    load();
  }

  async function handleDelete(bill: Bill) {
    if (bill.installment_group && bill.installments > 1) {
      const choice = confirm('Excluir todas as parcelas?\n\nOK = todas as parcelas\nCancelar = só esta');
      if (choice) {
        await supabase.from('bills').delete().eq('installment_group', bill.installment_group);
      } else {
        await supabase.from('bills').delete().eq('id', bill.id);
      }
    } else {
      if (!confirm('Excluir conta?')) return;
      await supabase.from('bills').delete().eq('id', bill.id);
    }
    load();
  }

  const today = dayjs();
  const filtered = bills.filter(b => {
    if (filter === 'pending') return !b.paid;
    if (filter === 'paid')    return b.paid;
    return true;
  });

  const totalPending = bills.filter(b => !b.paid).reduce((s, b) => s + Number(b.amount), 0);
  const totalPaid    = bills.filter(b => b.paid).reduce((s, b) => s + Number(b.amount), 0);
  const overdue      = bills.filter(b => !b.paid && dayjs(b.due_date).isBefore(today, 'day'));

  function statusOf(bill: Bill) {
    if (bill.paid) return 'paid';
    if (dayjs(bill.due_date).isBefore(today, 'day')) return 'overdue';
    if (dayjs(bill.due_date).diff(today, 'day') <= 3) return 'soon';
    return 'ok';
  }

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 14px',
    borderRadius: 10, border: `1.5px solid ${c.border}`, fontSize: 14,
    color: c.textSecondary, background: c.input, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Contas a Pagar</h1>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>{bills.filter(b => !b.paid).length} pendentes</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>
          <Plus size={16}/> Nova Conta
        </button>
      </div>

      {/* Summary */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        {[
          { label: 'Pendente',  value: formatCurrency(totalPending), color: '#ef4444', accent: '#ef4444', icon: '📋' },
          { label: 'Pago',      value: formatCurrency(totalPaid),    color: '#16a34a', accent: '#22c55e', icon: '✅' },
          { label: 'Vencidas',  value: String(overdue.length),       color: overdue.length > 0 ? '#dc2626' : '#16a34a', accent: '#f97316', icon: '⚠️' },
          { label: 'Total mês', value: formatCurrency(totalPending + totalPaid), color: '#6366f1', accent: '#6366f1', icon: '📊' },
        ].map(s => (
          <div key={s.label} style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, padding: '16px 18px', borderTop: `3px solid ${s.accent}` }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.icon} {s.label}</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['all','Todas'], ['pending','Pendentes'], ['paid','Pagas']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: filter === v ? c.text : c.inputBg, color: filter === v ? c.surface : c.textMuted }}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 48, color: c.textFaint }}>Carregando...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>🎉</p>
            <p style={{ fontWeight: 600, color: c.textSecondary, margin: '0 0 4px' }}>Nenhuma conta aqui</p>
            <p style={{ color: c.textFaint, fontSize: 13, margin: 0 }}>
              {filter === 'pending' ? 'Sem contas pendentes!' : filter === 'paid' ? 'Nenhuma paga ainda.' : 'Nenhuma conta cadastrada.'}
            </p>
          </div>
        ) : filtered.map((bill, i) => {
          const st = statusOf(bill);
          const dueDate = dayjs(bill.due_date);
          const daysLeft = dueDate.diff(today, 'day');
          const cat = (bill as any).categories;
          const isInstallment = bill.installments > 1;

          return (
            <div key={bill.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${c.bg}` : 'none', opacity: bill.paid ? 0.65 : 1 }}>
              {/* Check */}
              <button onClick={() => togglePaid(bill)} style={{ width: 34, height: 34, borderRadius: 9, border: `2px solid ${bill.paid ? '#22c55e' : c.border}`, background: bill.paid ? '#22c55e' : c.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {bill.paid && <Check size={15} color="#fff"/>}
              </button>

              {/* Icon */}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: isInstallment ? '#eff6ff' : cat ? (cat.color+'18') : c.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                {isInstallment ? <CreditCard size={16} color="#3b82f6"/> : (cat?.icon || '📋')}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 14, color: bill.paid ? c.textFaint : c.textSecondary, textDecoration: bill.paid ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {bill.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: c.textFaint }}>{dueDate.format('DD/MM/YYYY')}</span>
                  {!bill.paid && st === 'overdue' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: '#fef2f2', color: '#dc2626' }}>Vencida</span>
                  )}
                  {!bill.paid && st === 'soon' && daysLeft >= 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: '#fffbeb', color: '#d97706' }}>{daysLeft === 0 ? 'Hoje!' : `${daysLeft}d`}</span>
                  )}
                  {bill.recurrent && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', fontWeight: 500 }}>🔄 Mensal</span>}
                  {isInstallment && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: '#eff6ff', color: '#3b82f6', fontWeight: 500 }}>💳 {bill.installment_number}/{bill.installments}x</span>}
                </div>
              </div>

              {/* Amount */}
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: bill.paid ? c.textFaint : '#dc2626', flexShrink: 0 }}>
                {formatCurrency(Number(bill.amount))}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => openEdit(bill)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={13}/>
                </button>
                <button onClick={() => handleDelete(bill)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: c.shadowMd, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>{editing ? 'Editar Conta' : 'Nova Conta'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tipo */}
              {!editing && (
                <div>
                  <Label c={c}>Tipo de conta</Label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    {[
                      { v: 'normal',      l: 'Normal',      icon: '📋' },
                      { v: 'recurrent',   l: 'Recorrente',  icon: '🔄' },
                      { v: 'installment', l: 'Parcelado',   icon: '💳' },
                    ].map(({ v, l, icon }) => (
                      <button key={v} type="button" onClick={() => setForm({ ...form, tipo: v as any })}
                        style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: form.tipo === v ? '2px solid #6366f1' : `1.5px solid ${c.border}`, background: form.tipo === v ? '#eff6ff' : c.bg, cursor: 'pointer', fontSize: 12, fontWeight: form.tipo === v ? 700 : 400, color: form.tipo === v ? '#4f46e5' : c.textMuted, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label c={c}>Descrição</Label>
                <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} placeholder={form.tipo === 'installment' ? 'Ex: iPhone 16 Pro' : 'Ex: Aluguel, Energia...'}/>
              </div>

              <div>
                <Label c={c}>{form.tipo === 'installment' ? 'Valor por parcela (R$)' : 'Valor (R$)'}</Label>
                <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} placeholder="0,00"/>
              </div>

              {form.tipo === 'installment' && (
                <div>
                  <Label c={c}>Número de parcelas</Label>
                  <input required type="number" min="2" max="60" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} style={inputStyle} placeholder="Ex: 12"/>
                  {form.amount && form.installments && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6366f1', fontWeight: 500 }}>
                      Total: {formatCurrency(parseFloat(form.amount || '0') * parseInt(form.installments || '1'))} em {form.installments}x de {formatCurrency(parseFloat(form.amount || '0'))}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label c={c}>{form.tipo === 'installment' ? 'Vencimento da 1ª parcela' : 'Vencimento'}</Label>
                <input required type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={inputStyle}/>
              </div>

              {cats.length > 0 && (
                <div>
                  <Label c={c}>Categoria (opcional)</Label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
                    <option value="">Sem categoria</option>
                    {cats.map(ct => <option key={ct.id} value={ct.id}>{ct.icon} {ct.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textSecondary, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {form.tipo === 'installment' ? `Criar ${form.installments}x parcelas` : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children, c }: any) {
  const { c: themeC } = useTheme();
  const colors = c || themeC;
  return <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{children}</label>;
}
