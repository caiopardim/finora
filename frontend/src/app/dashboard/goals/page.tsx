'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Plus, X, TrendingUp, Trash2, Pencil } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast, toastError } from '@/lib/toast';

const GOAL_ICONS   = ['🎯','🏠','🚗','✈️','📱','💻','💍','📚','🎓','🌴','💰','🏋️','🐾','🎵','🎮'];
const GOAL_COLORS  = ['#6366f1','#f97316','#10b981','#3b82f6','#ec4899','#eab308','#8b5cf6','#06b6d4'];

export default function GoalsPage() {
  const { c, isDark } = useTheme();
  const [goals, setGoals]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [showEdit, setShowEdit]       = useState<any>(null);
  const [showProgress, setShowProgress] = useState<any>(null);
  const [progressAmount, setProgressAmount] = useState('');
  const [form, setForm] = useState({ name: '', target_amount: '', deadline: '', icon: '🎯', color: '#6366f1' });
  const [editForm, setEditForm] = useState({ name: '', target_amount: '', deadline: '', icon: '🎯', color: '#6366f1' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data } = await supabase.from('goals').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setGoals(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from('goals').insert({
      user_id: session.user.id,
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      deadline: form.deadline || null,
      icon: form.icon,
      color: form.color,
      current_amount: 0,
    });
    if (error) { console.error('goals insert error:', error); toastError(error.message); return; }
    setShowCreate(false);
    setForm({ name: '', target_amount: '', deadline: '', icon: '🎯', color: '#6366f1' });
    toast('Meta criada!');
    load();
  }

  function openEdit(goal: any) {
    setEditForm({
      name: goal.name,
      target_amount: String(goal.target_amount),
      deadline: goal.deadline || '',
      icon: goal.icon || '🎯',
      color: goal.color || '#6366f1',
    });
    setShowEdit(goal);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!showEdit) return;
    const { error } = await supabase.from('goals').update({
      name: editForm.name,
      target_amount: parseFloat(editForm.target_amount),
      deadline: editForm.deadline || null,
      icon: editForm.icon,
      color: editForm.color,
    }).eq('id', showEdit.id);
    if (error) { toastError(error.message); return; }
    setShowEdit(null);
    toast('Meta atualizada!');
    load();
  }

  async function handleProgress(e: React.FormEvent) {
    e.preventDefault();
    if (!showProgress) return;
    const newAmount = Number(showProgress.current_amount) + parseFloat(progressAmount);
    await supabase.from('goals').update({ current_amount: newAmount }).eq('id', showProgress.id);
    setShowProgress(null);
    setProgressAmount('');
    toast('Progresso adicionado! 🎯');
    load();
  }

  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const doneCount  = goals.filter(g => Number(g.current_amount) >= Number(g.target_amount)).length;

  const inputStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '10px 14px', marginTop: 6, borderRadius: 10, border: `1.5px solid ${c.border}`, fontSize: 14, color: c.textSecondary, background: c.input, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Metas</h1>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Seus objetivos financeiros</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>
          <Plus size={16}/> Nova Meta
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: c.textFaint, padding: 48 }}>Carregando...</p>
      ) : goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: c.surface, borderRadius: 16, border: `2px dashed ${c.border}` }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🎯</p>
          <p style={{ fontWeight: 600, color: c.textSecondary, margin: '0 0 4px' }}>Nenhuma meta ainda</p>
          <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Crie sua primeira meta de economia</p>
        </div>
      ) : (
        <>
          <div className="grid-goals">
            {goals.map(goal => {
              const pct  = Math.min(Number(goal.current_amount) / Number(goal.target_amount) * 100, 100);
              const done = pct >= 100;
              const color = goal.color || '#6366f1';
              return (
                <div key={goal.id} style={{ background: c.surface, borderRadius: 16, border: done ? `2px solid ${color}40` : `1px solid ${c.border}`, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{goal.icon}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setShowProgress(goal); setProgressAmount(''); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 500 }}>
                        <TrendingUp size={12}/> Adicionar
                      </button>
                      <button onClick={() => openEdit(goal)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={13}/>
                      </button>
                      <button onClick={() => setConfirmDeleteId(goal.id)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16, color: c.textSecondary, margin: '0 0 2px' }}>{goal.name}</p>
                    {goal.deadline && <p style={{ color: c.textFaint, fontSize: 12, margin: 0 }}>Prazo: {new Date(goal.deadline+'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</p>}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: c.textMuted }}>{formatCurrency(Number(goal.current_amount))}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: c.textSecondary }}>{formatCurrency(Number(goal.target_amount))}</span>
                    </div>
                    <div style={{ background: c.inputBg, borderRadius: 99, height: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: done ? `linear-gradient(90deg,${color},${color}cc)` : `linear-gradient(90deg,${color}88,${color})`, transition: 'width 0.6s' }}/>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
                      {done
                        ? <span style={{ fontSize: 12, color, fontWeight: 600 }}>Meta atingida! 🎉</span>
                        : <span style={{ fontSize: 12, color: c.textFaint }}>Faltam {formatCurrency(Number(goal.target_amount) - Number(goal.current_amount))}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: isDark ? 'linear-gradient(135deg,#1e293b,#0f172a)' : 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 16, padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 4px' }}>Total guardado nas metas</p>
              <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{formatCurrency(totalSaved)}</p>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['Metas ativas', goals.length], ['Concluídas', doneCount], ['Em andamento', goals.length - doneCount]].map(([l, v]) => (
                <div key={String(l)} style={{ textAlign: 'center' }}>
                  <p style={{ color: '#22c55e', fontSize: 20, fontWeight: 700, margin: '0 0 2px' }}>{v}</p>
                  <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Excluir meta?"
          message="Esta meta e todo o seu progresso serão removidos permanentemente."
          confirmLabel="Excluir"
          onConfirm={async () => { await supabase.from('goals').delete().eq('id', confirmDeleteId); setConfirmDeleteId(null); toast('Meta removida', 'info'); load(); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {showCreate && (
        <Modal title="Nova Meta" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Ícone</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {GOAL_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })} style={{ width: 38, height: 38, borderRadius: 9, fontSize: 18, border: form.icon===ic?'2px solid #22c55e':'2px solid transparent', background: form.icon===ic?'#f0fdf4':'#f8fafc', cursor: 'pointer' }}>{ic}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {GOAL_COLORS.map(gc => (
                  <button key={gc} type="button" onClick={() => setForm({ ...form, color: gc })} style={{ width: 28, height: 28, borderRadius: '50%', background: gc, border: form.color===gc?`3px solid ${c.text}`:'3px solid transparent', cursor: 'pointer' }}/>
                ))}
              </div>
            </div>
            <div><Label>Nome da meta</Label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ex: Viagem para Europa"/></div>
            <div><Label>Valor alvo (R$)</Label><input required type="number" step="0.01" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} style={inputStyle} placeholder="5.000,00"/></div>
            <div><Label>Prazo (opcional)</Label><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputStyle}/></div>
            <Buttons onCancel={() => setShowCreate(false)} label="Criar Meta"/>
          </form>
        </Modal>
      )}

      {showProgress && (
        <Modal title={`Adicionar a "${showProgress.name}"`} onClose={() => setShowProgress(null)}>
          <form onSubmit={handleProgress} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><Label>Valor a adicionar (R$)</Label><input required type="number" step="0.01" value={progressAmount} onChange={e => setProgressAmount(e.target.value)} style={inputStyle} placeholder="500,00" autoFocus/></div>
            <Buttons onCancel={() => setShowProgress(null)} label="Adicionar"/>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title="Editar Meta" onClose={() => setShowEdit(null)}>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Ícone</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {GOAL_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setEditForm({ ...editForm, icon: ic })} style={{ width: 38, height: 38, borderRadius: 9, fontSize: 18, border: editForm.icon===ic?'2px solid #22c55e':'2px solid transparent', background: editForm.icon===ic?'#f0fdf4':'#f8fafc', cursor: 'pointer' }}>{ic}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {GOAL_COLORS.map(gc => (
                  <button key={gc} type="button" onClick={() => setEditForm({ ...editForm, color: gc })} style={{ width: 28, height: 28, borderRadius: '50%', background: gc, border: editForm.color===gc?`3px solid ${c.text}`:'3px solid transparent', cursor: 'pointer' }}/>
                ))}
              </div>
            </div>
            <div><Label>Nome da meta</Label><input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle}/></div>
            <div><Label>Valor alvo (R$)</Label><input required type="number" step="0.01" value={editForm.target_amount} onChange={e => setEditForm({ ...editForm, target_amount: e.target.value })} style={inputStyle}/></div>
            <div><Label>Prazo (opcional)</Label><input type="date" value={editForm.deadline} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })} style={inputStyle}/></div>
            <Buttons onCancel={() => setShowEdit(null)} label="Salvar"/>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: any) {
  const { c } = useTheme();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div style={{ background: c.surface, borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: c.shadowMd, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${c.borderLight}` }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textFaint }}><X size={20}/></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Label({ children }: any) {
  const { c } = useTheme();
  return <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{children}</label>;
}

function Buttons({ onCancel, label }: any) {
  const { c } = useTheme();
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.surface, color: c.textSecondary, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
      <button type="submit" style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
    </div>
  );
}
