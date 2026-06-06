'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Plus, X, Check, Pencil, Trash2 } from 'lucide-react';

const ICONS  = ['🍔','🚗','🏠','💊','🎮','📚','👕','📱','🔧','📦','💼','💻','📈','💰','✈️','🎵','🐾','⚽','🎓','🌴'];
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f59e0b','#10b981','#6366f1'];

export default function CategoriesPage() {
  const [cats, setCats]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', icon: '📦', color: '#6366f1', type: 'expense', budget_limit: '' });

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data } = await supabase.from('categories').select('*').eq('user_id', session.user.id).order('name');
    setCats(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm({ name: '', icon: '📦', color: '#6366f1', type: 'expense', budget_limit: '' }); setShowForm(true); }
  function openEdit(c: any) { setEditing(c); setForm({ name: c.name, icon: c.icon, color: c.color, type: c.type, budget_limit: c.budget_limit ? String(c.budget_limit) : '' }); setShowForm(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const payload = { name: form.name, icon: form.icon, color: form.color, type: form.type, budget_limit: form.budget_limit ? parseFloat(form.budget_limit) : null };
    if (editing) {
      await supabase.from('categories').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('categories').insert({ ...payload, user_id: session.user.id });
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir categoria?')) return;
    await supabase.from('categories').delete().eq('id', id);
    load();
  }

  const expenses = cats.filter(c => c.type === 'expense' || c.type === 'both');
  const incomes  = cats.filter(c => c.type === 'income'  || c.type === 'both');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Categorias</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{cats.length} categorias configuradas</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>
          <Plus size={16}/> Nova Categoria
        </button>
      </div>

      {loading ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>Carregando...</p> : (
        <>
          {[{ title: 'Despesas 💸', group: expenses }, { title: 'Receitas 💰', group: incomes }].map(({ title, group }) => (
            <div key={title} style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{title}</p>
              {group.length === 0 ? (
                <p style={{ color: '#cbd5e1', fontSize: 13 }}>Nenhuma categoria nesse tipo ainda.</p>
              ) : (
                <div className="grid-2col">
                  {group.map(cat => (
                    <div key={cat.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 13, background: cat.color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{cat.name}</p>
                        {cat.budget_limit && <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Limite: {formatCurrency(cat.budget_limit)}/mês</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(cat)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13}/></button>
                        <button onClick={() => handleDelete(cat.id)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <Label>Ícone</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })} style={{ width: 38, height: 38, borderRadius: 9, fontSize: 18, border: form.icon===ic?'2px solid #22c55e':'2px solid transparent', background: form.icon===ic?'#f0fdf4':'#f8fafc', cursor: 'pointer' }}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Cor</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color===c?'3px solid #0f172a':'3px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {form.color===c && <Check size={12} color="#fff"/>}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>Nome</Label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ex: Alimentação"/></div>
              <div><Label>Tipo</Label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
              <div><Label>Limite mensal (opcional)</Label><input type="number" step="0.01" value={form.budget_limit} onChange={e => setForm({ ...form, budget_limit: e.target.value })} style={inputStyle} placeholder="R$ 0,00"/></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: any) {
  return <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{children}</label>;
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
  borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
};
